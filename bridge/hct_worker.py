#!/usr/bin/env python3
"""
Path D — Hik-Connect for Teams OpenAPI cloud worker.

Pulls JPEG snapshots from every ONLINE camera on the Seazars HCT team
(no LAN access, no SDK, no mini PC). Uploads each frame to Supabase
Storage and indexes it in `frame_buffer`. The /api/cron/analyze-pending
cron then picks them up exactly like with hik_bridge.py.

Run:
  cd stafflenz/bridge
  source .venv/bin/activate  # or however you've set up the venv
  cp .env.example .env
  # Fill: HCT_API_KEY, HCT_API_SECRET, SUPABASE_URL,
  #       SUPABASE_SERVICE_ROLE_KEY, CLIENT_ID, LOCATION_ID,
  #       INTERVAL_SEC (e.g. 3 for production, 30 for testing)
  python3 hct_worker.py

Designed for Railway deployment — single dyno, runs forever, polls,
uploads, and re-authenticates the token before its 7-day window
expires.
"""

from __future__ import annotations

import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

# ─── Config ──────────────────────────────────────────────────────────────────
HCT_API_KEY    = os.environ["HCT_API_KEY"]
HCT_API_SECRET = os.environ["HCT_API_SECRET"]
SUPABASE_URL   = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY   = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
CLIENT_ID      = os.environ["CLIENT_ID"]
LOCATION_ID    = os.environ.get("LOCATION_ID") or None
INTERVAL_SEC   = int(os.environ.get("INTERVAL_SEC", "3"))
DEFAULT_CHANNEL = int(os.environ.get("DEFAULT_CHANNEL", "1"))
BUCKET         = "frames"

# Per-device routing: JSON map {serial: {"location": uuid, "channels": [1,2,3,4]}}.
# Accepts "channel" (int) as a single-channel shortcut for backwards compat.
# Devices not in this map fall back to LOCATION_ID + [DEFAULT_CHANNEL].
DEVICE_MAP_RAW = os.environ.get("DEVICE_MAP", "").strip()
try:
    DEVICE_MAP = json.loads(DEVICE_MAP_RAW) if DEVICE_MAP_RAW else {}
except json.JSONDecodeError:
    print(f"  ⚠ DEVICE_MAP is not valid JSON, ignoring: {DEVICE_MAP_RAW[:80]}", flush=True)
    DEVICE_MAP = {}


def route_for(serial: str) -> tuple[str | None, list[int]]:
    cfg = DEVICE_MAP.get(serial) or {}
    location = cfg.get("location") or LOCATION_ID
    if "channels" in cfg:
        channels = [int(c) for c in cfg["channels"]]
    else:
        channels = [int(cfg.get("channel") or DEFAULT_CHANNEL)]
    return location, channels

# Auto-detected after first auth
AUTH_BASE = "https://isgp.hikcentralconnect.com"   # bootstrap; replaced by areaDomain


# ─── HCT auth + API helpers ──────────────────────────────────────────────────
class HCTSession:
    """Lazy-refreshing HCT token holder."""

    def __init__(self):
        self.token: str | None = None
        self.area_domain: str = AUTH_BASE
        self.expires_at: float = 0.0

    def _login(self):
        url = f"{AUTH_BASE}/api/hccgw/platform/v1/token/get"
        r = requests.post(
            url,
            json={"appKey": HCT_API_KEY, "secretKey": HCT_API_SECRET},
            headers={"Content-Type": "application/json"},
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
        if str(data.get("errorCode")) != "0":
            raise RuntimeError(f"HCT auth failed: {data}")
        d = data["data"]
        self.token = d["accessToken"]
        self.area_domain = d.get("areaDomain", AUTH_BASE).rstrip("/")
        # expireTime is a unix timestamp (seconds); refresh 1 day before
        self.expires_at = float(d["expireTime"]) - 86400
        print(f"  ✓ HCT auth OK, areaDomain={self.area_domain}", flush=True)

    def ensure(self):
        if self.token is None or time.time() >= self.expires_at:
            self._login()

    def post(self, path: str, body: dict | None = None) -> dict:
        self.ensure()
        r = requests.post(
            f"{self.area_domain}{path}",
            json=body or {},
            headers={"Content-Type": "application/json", "Token": self.token},
            timeout=30,
        )
        # If token went stale mid-call, retry once
        # OPEN000006 = TOKEN_NOT_FOUND (token expired past its 7-day window)
        # OPEN000010 = invalid token
        # OPEN300003 = access denied / token issue
        if r.status_code == 401 or (r.ok and str(r.json().get("errorCode")) in ("OPEN000006", "OPEN000010", "OPEN300003")):
            self._login()
            r = requests.post(
                f"{self.area_domain}{path}",
                json=body or {},
                headers={"Content-Type": "application/json", "Token": self.token},
                timeout=30,
            )
        r.raise_for_status()
        data = r.json()
        if str(data.get("errorCode")) != "0":
            raise RuntimeError(f"HCT API error on {path}: {data}")
        return data["data"]


# ─── Supabase helpers (mirror hik_bridge.py exactly) ─────────────────────────
def supabase_upload(buffer: bytes, storage_path: str) -> bool:
    r = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}",
        headers={
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": "image/jpeg",
            "x-upsert": "true",
        },
        data=buffer,
        timeout=30,
    )
    if r.status_code >= 400:
        print(f"  ✗ upload {storage_path}: HTTP {r.status_code}: {r.text[:200]}", flush=True)
        return False
    return True


def supabase_index(storage_path: str, channel: int, captured_at: str, device_serial: str, location_id: str | None) -> bool:
    row = {
        "client_id":      CLIENT_ID,
        "camera_channel": channel,
        "frame_path":     storage_path,
        "captured_at":    captured_at,
        "has_motion":     True,
        "analyzed":       False,
    }
    if location_id:
        row["location_id"] = location_id
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/frame_buffer",
        headers={
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey":        SUPABASE_KEY,
            "Content-Type":  "application/json",
            "Prefer":        "return=minimal",
        },
        json=row,
        timeout=15,
    )
    if r.status_code >= 400:
        print(f"  ✗ index {storage_path}: HTTP {r.status_code}: {r.text[:200]}", flush=True)
        return False
    return True


# ─── Paused-location lookup ──────────────────────────────────────────────────
def fetch_paused_locations() -> set[str]:
    """Return the set of location_ids whose monitoring is paused right now."""
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/locations",
            params={"select": "id", "monitoring_paused": "eq.true"},
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
            timeout=10,
        )
        if r.status_code >= 400:
            return set()
        return {row["id"] for row in r.json()}
    except Exception:
        return set()


def fetch_front_desk_map() -> dict[str, int]:
    """Return {location_id: front_desk_camera_channel} for locations that have one set.
    Worker uses this to identify which (serial, channel) pairs get the fast pass."""
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/locations",
            params={"select": "id,front_desk_camera_channel", "front_desk_camera_channel": "not.is.null"},
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
            timeout=10,
        )
        if r.status_code >= 400:
            return {}
        return {row["id"]: int(row["front_desk_camera_channel"]) for row in r.json() if row.get("front_desk_camera_channel") is not None}
    except Exception:
        return {}


# ─── One pass: list online devices, capture from each, upload, index ─────────
def pass_once(session: HCTSession, only_front_desk: bool = False) -> int:
    """
    only_front_desk=True → capture ONLY the channels that are marked as
    front_desk_camera_channel for their location. Used for the fast pass.
    """
    devices = session.post(
        "/api/hccgw/resource/v1/devices/get",
        body={"pageIndex": 1, "pageSize": 100, "deviceCategory": "encodingDevice"},
    ).get("device", []) or []

    online = [d for d in devices if d.get("onlineStatus") == 1]
    if not online:
        print(f"  (no online devices among {len(devices)})", flush=True)
        return 0

    paused = fetch_paused_locations()
    front_desk = fetch_front_desk_map() if only_front_desk else {}
    if only_front_desk and not front_desk:
        return 0  # no front-desk cams configured, skip fast pass silently

    captured = 0
    for d in online:
        serial = d.get("serialNo")
        name   = d.get("name", serial)
        location_id, channels = route_for(serial)
        if location_id in paused:
            if not only_front_desk:
                print(f"  ⏸  {name:<14}  loc={location_id[:8]}  (paused, skipped)", flush=True)
            continue
        # Fast pass: restrict to just the front-desk channel for this location
        if only_front_desk:
            fd_ch = front_desk.get(location_id)
            if fd_ch is None or fd_ch not in channels:
                continue
            channels = [fd_ch]
        for channel in channels:
            try:
                cap = session.post(
                    "/api/hccgw/resource/v1/device/capturePic",
                    body={"deviceSerial": serial, "channelNo": channel},
                )
                url = cap.get("captureUrl")
                if not url:
                    print(f"  ✗ {name} ch{channel}: no captureUrl returned", flush=True)
                    continue
                img = requests.get(url, timeout=30).content

                now = datetime.now(timezone.utc)
                iso = now.isoformat()
                storage_path = (
                    f"{CLIENT_ID}/{now:%Y/%m/%d}/{serial}_ch{channel}_"
                    f"{now:%H%M%S}_{uuid.uuid4().hex[:6]}.jpg"
                )

                if supabase_upload(img, storage_path) and supabase_index(
                    storage_path, channel, iso, serial, location_id,
                ):
                    captured += 1
                    loc_short = (location_id or "")[:8]
                    print(f"  ✓ {name:<14} ch{channel}  loc={loc_short}  {len(img):>7,}B  {storage_path}", flush=True)
            except Exception as e:
                print(f"  ✗ {name} ch{channel}: {e}", flush=True)
    return captured


# ─── Main loop — two-tier capture ────────────────────────────────────────────
#
# Fast pass (every FAST_INTERVAL_SEC, default 30s): captures ONLY the front-desk
# cameras (those with front_desk_camera_channel set on their location). This
# gives near-live coverage of entries/reception without exploding cost.
#
# Slow pass (every INTERVAL_SEC, default 120s): captures ALL cameras across all
# devices. Same behavior as before.
#
# Slow pass takes priority — if it's due, we run it and skip a fast pass.
def main():
    fast_interval = int(os.environ.get("FAST_INTERVAL_SEC", "30"))
    print(
        f"hct_worker — slow every {INTERVAL_SEC}s (all cams), fast every {fast_interval}s (front-desk only), client_id={CLIENT_ID[:8]}…",
        flush=True,
    )
    session = HCTSession()
    last_slow = 0.0
    while True:
        t0 = time.time()
        try:
            if t0 - last_slow >= INTERVAL_SEC:
                n = pass_once(session, only_front_desk=False)
                last_slow = t0
                elapsed = time.time() - t0
                print(f"  → SLOW pass complete: {n} frame(s) in {elapsed:.1f}s", flush=True)
            else:
                n = pass_once(session, only_front_desk=True)
                elapsed = time.time() - t0
                if n > 0:
                    print(f"  → fast pass: {n} front-desk frame(s) in {elapsed:.1f}s", flush=True)
        except KeyboardInterrupt:
            print("interrupted", flush=True)
            return
        except Exception as e:
            print(f"  ✗ pass error: {e}", flush=True)
        sleep_for = max(1, fast_interval - (time.time() - t0))
        time.sleep(sleep_for)


if __name__ == "__main__":
    try:
        main()
    except KeyError as e:
        print(f"Missing env var: {e}", file=sys.stderr)
        sys.exit(2)
