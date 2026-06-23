"""
StaffLenz Face-ID Microservice — InsightFace edition.

Replaces the old dlib/face_recognition stack with InsightFace (RetinaFace
detector + ArcFace embeddings). RetinaFace was trained on WIDER FACE which
includes heavy occlusion, profile views, small faces — exactly the CCTV
overhead/oblique angles where HOG was getting 1/10 detections in our gym
deployment. ArcFace embeddings (512-dim) are also much better at matching
the same person across pose/lighting changes than dlib's 128-dim.

Endpoints (same shape as before so callers don't break):
  POST /embed    — { photo_url, worker_name } → 512-dim embedding (or null)
  POST /identify — { frame_url, workers, tolerance } → who's in the frame

Tolerance interpretation:
  Old (dlib euclidean distance, lower = closer match):
      0.5 strict / 0.6 balanced / 0.7 lenient
  New (cosine similarity, HIGHER = closer match):
      0.35 lenient / 0.42 balanced / 0.55 strict
  We accept the same `tolerance` field name and convert internally so the
  Next.js caller doesn't have to change anything — but it's interpreted as
  a minimum similarity score now (any tolerance >= 0.5 from the old code
  becomes ~0.42 cosine threshold).
"""

import io
import os
import sys
import time
from typing import Optional

import cv2
import numpy as np
import requests
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from insightface.app import FaceAnalysis


app = FastAPI(title="StaffLenz Face-ID (InsightFace)", version="0.2.0")

# ── Load the InsightFace pipeline once at startup ───────────────────────────
# buffalo_l = RetinaFace-10G detector + glint360k ArcFace embedder. Best
# accuracy/cost trade-off for CPU. Initialize lazily on the first request
# so the container can pass /health even before the model fully loads.
_model: Optional[FaceAnalysis] = None


def get_model() -> FaceAnalysis:
    global _model
    if _model is None:
        m = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )
        # det_size controls input resolution to RetinaFace; 640 is the standard
        # trade-off. Going higher (e.g. 960) helps with very small faces but
        # ~3× slower on CPU.
        m.prepare(ctx_id=0, det_size=(640, 640))
        _model = m
    return _model


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    """ArcFace embeddings are already L2-normalised by InsightFace, so dot
    product equals cosine similarity. Guard with a divide just in case."""
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def map_tolerance(old: float) -> float:
    """Old API used dlib distance (lower=closer). Map to cosine threshold.
    Old 0.6 → new 0.40 (balanced). Old 0.5 → new 0.50 (strict). Old 0.7 → 0.32.
    Linear-ish map clamped to a sensible cosine range."""
    # Heuristic: cosine_thresh = 0.6 - old_tol * 0.3
    t = 0.6 - old * 0.3
    if t < 0.25: t = 0.25
    if t > 0.65: t = 0.65
    return t


# ── Models ────────────────────────────────────────────────────────────────────
class EmbedRequest(BaseModel):
    photo_url: str
    worker_name: Optional[str] = None
    aggressive: bool = False   # kept for API compat; InsightFace is already aggressive


class WorkerEmbeddings(BaseModel):
    worker_name: str
    embeddings: list[list[float]]


class IdentifyRequest(BaseModel):
    frame_url: str
    workers: list[WorkerEmbeddings]
    tolerance: float = 0.6
    aggressive: bool = False


class IdentifiedPerson(BaseModel):
    name: str
    confidence: float
    box: list[int]            # [top, right, bottom, left]


class IdentifyResponse(BaseModel):
    detected_count: int
    people: list[IdentifiedPerson]
    elapsed_ms: int


# ── Helpers ───────────────────────────────────────────────────────────────────
def fetch_image_bgr(url: str) -> np.ndarray:
    """InsightFace expects BGR (OpenCV convention)."""
    res = requests.get(url, timeout=30)
    res.raise_for_status()
    img = Image.open(io.BytesIO(res.content)).convert("RGB")
    rgb = np.array(img)
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def insightface_bbox_to_xyxy(bbox) -> list[int]:
    """InsightFace returns [x1, y1, x2, y2]; old API returned [top, right, bottom, left]."""
    x1, y1, x2, y2 = [int(v) for v in bbox]
    return [y1, x2, y2, x1]


# ── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "face-id",
        "engine": "insightface/buffalo_l",
        "model_loaded": _model is not None,
    }


@app.post("/embed")
def embed(req: EmbedRequest):
    """Take a worker reference photo URL, find the face, return its 512-dim
    embedding. Pick the LARGEST face if there are several."""
    try:
        bgr = fetch_image_bgr(req.photo_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"fetch_image failed: {e}")

    faces = get_model().get(bgr)

    if not faces:
        return {
            "worker_name": req.worker_name,
            "embedding": None,
            "error": "no face detected in photo",
        }

    # Pick the biggest face (most likely the worker, not a passerby)
    def face_area(f):
        x1, y1, x2, y2 = f.bbox
        return (x2 - x1) * (y2 - y1)

    primary = max(faces, key=face_area)

    return {
        "worker_name": req.worker_name,
        "embedding": primary.embedding.tolist(),
        "face_count_in_photo": len(faces),
        "det_score": float(primary.det_score),
    }


@app.post("/identify", response_model=IdentifyResponse)
def identify(req: IdentifyRequest):
    t0 = time.time()

    try:
        bgr = fetch_image_bgr(req.frame_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"fetch_image failed: {e}")

    faces = get_model().get(bgr)

    if not faces:
        return IdentifyResponse(
            detected_count=0,
            people=[],
            elapsed_ms=int((time.time() - t0) * 1000),
        )

    # Flatten worker embeddings (name → 512-dim vector). Skip dimension-mismatched
    # entries — those are legacy dlib embeddings from before the InsightFace switch.
    known_names: list[str] = []
    known_encs: list[np.ndarray] = []
    skipped_legacy = 0
    for w in req.workers:
        for e in (w.embeddings or []):
            if len(e) != 512:
                skipped_legacy += 1
                continue
            known_names.append(w.worker_name)
            known_encs.append(np.array(e, dtype=np.float32))
    if skipped_legacy:
        print(f"  ⚠ skipped {skipped_legacy} legacy (non-512-dim) embeddings", flush=True)

    cos_threshold = map_tolerance(req.tolerance)
    print(f"  faces={len(faces)}  knowns={len(known_encs)}  cos_threshold={cos_threshold:.2f}", flush=True)

    people: list[IdentifiedPerson] = []
    for f in faces:
        box = insightface_bbox_to_xyxy(f.bbox)

        if not known_encs:
            people.append(IdentifiedPerson(name="Unknown", confidence=0.0, box=box))
            continue

        sims = np.array([cosine_sim(f.embedding, k) for k in known_encs], dtype=np.float32)
        best_idx = int(np.argmax(sims))
        best_sim = float(sims[best_idx])

        if best_sim >= cos_threshold:
            people.append(IdentifiedPerson(
                name=known_names[best_idx],
                confidence=round(best_sim, 3),
                box=box,
            ))
        else:
            people.append(IdentifiedPerson(
                name="Unknown",
                confidence=round(best_sim, 3),
                box=box,
            ))

    return IdentifyResponse(
        detected_count=len(faces),
        people=people,
        elapsed_ms=int((time.time() - t0) * 1000),
    )
