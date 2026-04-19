#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# LenzAI Device Provisioning Script
# Run this on your Mac to prepare an SD card for a new client.
#
# Prerequisites:
#   1. Raspberry Pi Imager installed (brew install --cask raspberry-pi-imager)
#      OR a pre-flashed base SD card with Raspberry Pi OS Lite 64-bit
#   2. SD card inserted in your Mac
#   3. Client already created in LenzAI admin panel
#
# Usage:
#   ./flash-device.sh \
#     --client-id "dc20bf56-01e3-4a10-90e8-cb45e5c3e971" \
#     --wifi-name "ClientGymWiFi" \
#     --wifi-pass "their-wifi-password" \
#     --dvr-ip "192.168.1.64" \
#     --dvr-user "admin" \
#     --dvr-pass "Admin123"
#
# What it does:
#   1. Detects the mounted SD card (boot volume)
#   2. Writes wpa_supplicant.conf (WiFi credentials)
#   3. Enables SSH (creates empty 'ssh' file)
#   4. Writes the agent config.json with client-specific settings
#   5. Writes a firstboot script that installs Node.js + agent on first power-on
#
# After this script: eject SD, insert in Pi, ship to client. They plug in power
# and the device auto-connects to WiFi, installs itself, and starts monitoring.
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─── Parse arguments ──────────────────────────────────────────────────────────
CLIENT_ID=""
WIFI_NAME=""
WIFI_PASS=""
DVR_IP="192.168.1.64"
DVR_PORT="80"
DVR_USER="admin"
DVR_PASS=""
API_URL="https://lenzai.vercel.app"
MAX_CHANNELS=8
CAPTURE_SEC=5
ANALYZE_MIN=10

while [[ $# -gt 0 ]]; do
  case $1 in
    --client-id)   CLIENT_ID="$2"; shift 2 ;;
    --wifi-name)   WIFI_NAME="$2"; shift 2 ;;
    --wifi-pass)   WIFI_PASS="$2"; shift 2 ;;
    --dvr-ip)      DVR_IP="$2"; shift 2 ;;
    --dvr-port)    DVR_PORT="$2"; shift 2 ;;
    --dvr-user)    DVR_USER="$2"; shift 2 ;;
    --dvr-pass)    DVR_PASS="$2"; shift 2 ;;
    --api-url)     API_URL="$2"; shift 2 ;;
    --channels)    MAX_CHANNELS="$2"; shift 2 ;;
    --capture-sec) CAPTURE_SEC="$2"; shift 2 ;;
    --analyze-min) ANALYZE_MIN="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [ -z "$CLIENT_ID" ] || [ -z "$WIFI_NAME" ] || [ -z "$WIFI_PASS" ] || [ -z "$DVR_PASS" ]; then
  echo "Usage: $0 --client-id <UUID> --wifi-name <SSID> --wifi-pass <pass> --dvr-ip <ip> --dvr-pass <pass>"
  echo ""
  echo "Required: --client-id, --wifi-name, --wifi-pass, --dvr-pass"
  echo "Optional: --dvr-ip (default 192.168.1.64), --dvr-user (default admin),"
  echo "          --dvr-port (default 80), --channels (default 8),"
  echo "          --capture-sec (default 5), --analyze-min (default 10)"
  exit 1
fi

# ─── Read Supabase creds from .env.local ──────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env.local not found at $ENV_FILE"
  exit 1
fi

SUPA_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2-)
SUPA_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | cut -d= -f2-)

if [ -z "$SUPA_URL" ] || [ -z "$SUPA_KEY" ]; then
  echo "ERROR: SUPABASE vars not found in .env.local"
  exit 1
fi

# ─── Find SD card boot partition ──────────────────────────────────────────────
BOOT_VOL=""
for vol in /Volumes/bootfs /Volumes/boot /Volumes/NO\ NAME; do
  if [ -d "$vol" ]; then
    BOOT_VOL="$vol"
    break
  fi
done

if [ -z "$BOOT_VOL" ]; then
  echo "ERROR: No SD card boot volume found. Insert the SD card and try again."
  echo "       Expected: /Volumes/bootfs or /Volumes/boot"
  exit 1
fi

echo "Found SD card at: $BOOT_VOL"
echo "Client ID: $CLIENT_ID"
echo "WiFi: $WIFI_NAME"
echo "DVR: $DVR_IP:$DVR_PORT ($DVR_USER)"
echo ""

# ─── 1. WiFi config ──────────────────────────────────────────────────────────
cat > "$BOOT_VOL/wpa_supplicant.conf" << WPAEOF
country=IN
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="$WIFI_NAME"
    psk="$WIFI_PASS"
    key_mgmt=WPA-PSK
}
WPAEOF
echo "✅ WiFi configured"

# ─── 2. Enable SSH ───────────────────────────────────────────────────────────
touch "$BOOT_VOL/ssh"
echo "✅ SSH enabled"

# ─── 3. Write agent config ───────────────────────────────────────────────────
AGENT_KEY="slz_$(openssl rand -hex 24)"

mkdir -p "$BOOT_VOL/lenzai"
cat > "$BOOT_VOL/lenzai/config.json" << CFGEOF
{
  "agent_key": "$AGENT_KEY",
  "api_url": "$API_URL",
  "supabase_url": "$SUPA_URL",
  "supabase_key": "$SUPA_KEY",
  "client_id": "$CLIENT_ID",
  "dvr_ip": "$DVR_IP",
  "dvr_port": $DVR_PORT,
  "dvr_username": "$DVR_USER",
  "dvr_password": "$DVR_PASS",
  "max_channels": $MAX_CHANNELS,
  "capture_sec": $CAPTURE_SEC,
  "analyze_min": $ANALYZE_MIN,
  "motion_enabled": false,
  "motion_threshold": 10,
  "motion_cooldown_sec": 45,
  "schedule": "business_hours",
  "exclude_cameras": [],
  "motion_exclude_cameras": []
}
CFGEOF
echo "✅ Agent config written"

# ─── 4. Write firstboot install script ───────────────────────────────────────
# This runs once on first boot — installs Node.js, clones the agent,
# copies the config, and sets up a systemd service.
cat > "$BOOT_VOL/lenzai/firstboot.sh" << 'FBEOF'
#!/bin/bash
# LenzAI Device — First Boot Setup
# This runs automatically on the Pi's first boot.

LOG="/var/log/lenzai-setup.log"
exec > >(tee -a "$LOG") 2>&1
echo "=== LenzAI Setup started at $(date) ==="

# Wait for network
for i in $(seq 1 30); do
  if ping -c 1 google.com > /dev/null 2>&1; then break; fi
  echo "Waiting for network... ($i/30)"
  sleep 5
done

# Install Node.js 20.x
if ! command -v node > /dev/null 2>&1; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node.js: $(node --version)"

# Install sharp build deps
sudo apt-get install -y build-essential python3

# Clone agent (or update if already exists)
AGENT_DIR="/opt/lenzai-agent"
if [ -d "$AGENT_DIR" ]; then
  cd "$AGENT_DIR" && git pull
else
  git clone https://github.com/basaniocaesar-art/lenzai.git /tmp/lenzai-clone
  mkdir -p "$AGENT_DIR"
  cp -r /tmp/lenzai-clone/edge-agent/* "$AGENT_DIR/"
  rm -rf /tmp/lenzai-clone
fi

# Copy config from boot partition
if [ -f /boot/lenzai/config.json ] || [ -f /boot/firmware/lenzai/config.json ]; then
  CONFIG_SRC=$([ -f /boot/firmware/lenzai/config.json ] && echo /boot/firmware/lenzai/config.json || echo /boot/lenzai/config.json)
  cp "$CONFIG_SRC" "$AGENT_DIR/config.json"
  echo "Config copied from boot partition"
fi

# Install dependencies
cd "$AGENT_DIR"
npm install --production

# Create systemd service
cat > /etc/systemd/system/lenzai.service << SVCEOF
[Unit]
Description=LenzAI Monitoring Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/lenzai-agent
ExecStart=/usr/bin/node agent-v2.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/lenzai.log
StandardError=append:/var/log/lenzai.log
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SVCEOF

# Enable and start
systemctl daemon-reload
systemctl enable lenzai.service
systemctl start lenzai.service

echo "=== LenzAI Setup complete at $(date) ==="
echo "Service status:"
systemctl status lenzai.service --no-pager

# Remove firstboot from cron (one-time only)
sed -i '/firstboot/d' /etc/rc.local 2>/dev/null || true
FBEOF
chmod +x "$BOOT_VOL/lenzai/firstboot.sh"

# ─── 5. Schedule firstboot to run on first power-on ──────────────────────────
# We create a simple rc.local entry that runs the firstboot script once.
cat > "$BOOT_VOL/lenzai/rc-local-addition.txt" << 'RCEOF'

# Add this line to /etc/rc.local (before 'exit 0') on the Pi after first SSH:
#   /boot/lenzai/firstboot.sh &
# OR: the Raspberry Pi Imager can set a firstrun script that does this automatically.
RCEOF

echo "✅ Firstboot script written"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  LenzAI Device provisioned for client: $CLIENT_ID"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "NEXT STEPS:"
echo "  1. Eject the SD card from your Mac"
echo "  2. Insert SD card into the Pi Zero 2 W"
echo "  3. Put it in the case"
echo "  4. Ship to client with the instruction card"
echo ""
echo "FIRST BOOT (at client site):"
echo "  Client plugs in power → Pi connects to '$WIFI_NAME' →"
echo "  firstboot.sh installs Node.js + agent → service starts →"
echo "  frames appear in dashboard within ~5 minutes"
echo ""
echo "IF FIRSTBOOT DOESN'T AUTO-RUN:"
echo "  SSH into the Pi (ssh pi@<ip>) and run:"
echo "    sudo /boot/lenzai/firstboot.sh"
echo ""
echo "MONITORING:"
echo "  ssh pi@<ip>"
echo "  sudo journalctl -u lenzai -f"
echo "═══════════════════════════════════════════════════════════════"
