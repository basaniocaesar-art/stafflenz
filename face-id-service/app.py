"""
StaffLenz Face-ID Microservice.

A small FastAPI service that wraps the face_recognition library (built on dlib).
Designed to be deployed as a long-running Railway service alongside the existing
stafflenz Next.js app, so the heavy face-matching work happens once per frame
locally — Claude then only does activity analysis on pre-identified people.

Two endpoints:
  POST /embed    — convert a worker reference photo URL to a stored embedding
  POST /identify — given a frame URL and a list of worker embeddings,
                   return who's in the frame and where

Why a separate service:
  - face_recognition needs dlib (C++), heavy to install in the Next.js project
  - Linux on Railway has pre-built wheels → installs in ~2 min vs 30-45 min on Mac
  - Keeps the existing Node analyze endpoint clean — just calls this for FR
  - Can be deployed, tested, and scaled independently

Local test (after pip install -r requirements.txt):
  uvicorn app:app --host 0.0.0.0 --port 8000

Railway deploy:
  Push to GitHub, add a new Railway service pointing to this folder,
  no env vars required for the service to start.
"""

import io
import os
import sys
import time
from typing import Optional

import numpy as np
import requests
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import face_recognition


app = FastAPI(title="StaffLenz Face-ID", version="0.1.0")


# ── Models ────────────────────────────────────────────────────────────────────
class EmbedRequest(BaseModel):
    photo_url: str           # Signed Supabase URL or any public image URL
    worker_name: Optional[str] = None


class WorkerEmbeddings(BaseModel):
    worker_name: str
    embeddings: list[list[float]]   # one or more 128-dim vectors


class IdentifyRequest(BaseModel):
    frame_url: str
    workers: list[WorkerEmbeddings]
    tolerance: float = 0.6           # standard threshold; lower = stricter
    aggressive: bool = False         # spend extra CPU on small/angled faces (front desk only)


class IdentifiedPerson(BaseModel):
    name: str
    confidence: float
    box: list[int]                   # [top, right, bottom, left]


class IdentifyResponse(BaseModel):
    detected_count: int
    people: list[IdentifiedPerson]
    elapsed_ms: int


# ── Helpers ───────────────────────────────────────────────────────────────────
def fetch_image(url: str) -> np.ndarray:
    res = requests.get(url, timeout=30)
    res.raise_for_status()
    img = Image.open(io.BytesIO(res.content)).convert("RGB")
    return np.array(img)


# ── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "face-id"}


@app.post("/embed")
def embed(req: EmbedRequest):
    """
    Take a worker reference photo URL, find the face, return its 128-dim embedding.
    Call this once per worker photo at enrollment time; cache the result in your DB.
    """
    try:
        arr = fetch_image(req.photo_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"fetch_image failed: {e}")

    encodings = face_recognition.face_encodings(arr)
    if not encodings:
        return {
            "worker_name": req.worker_name,
            "embedding": None,
            "error": "no face detected in photo",
        }

    # If there are multiple faces, take the largest one (the worker)
    locations = face_recognition.face_locations(arr)
    if len(encodings) > 1:
        sizes = [(loc[2] - loc[0]) * (loc[1] - loc[3]) for loc in locations]
        idx = sizes.index(max(sizes))
        embedding = encodings[idx]
    else:
        embedding = encodings[0]

    return {
        "worker_name": req.worker_name,
        "embedding": embedding.tolist(),
        "face_count_in_photo": len(encodings),
    }


@app.post("/identify", response_model=IdentifyResponse)
def identify(req: IdentifyRequest):
    """
    Take a CCTV frame URL and a list of workers (with their stored embeddings).
    Return who's in the frame, where, and how confidently.
    """
    t0 = time.time()

    try:
        arr = fetch_image(req.frame_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"fetch_image failed: {e}")

    # Standard pass — HOG with 2x upsample, ~500ms.
    face_locations = face_recognition.face_locations(arr, number_of_times_to_upsample=2)
    detector_used = "hog-upsample2"

    # Aggressive pass — front-desk camera only. Tries:
    #   1) HOG with upsample=3 (handles 40px-wide faces)
    #   2) HOG with upsample=4 (handles 20px-wide faces, slow)
    #   3) CNN with upsample=1 (catches angled / partial faces HOG misses)
    if not face_locations and req.aggressive:
        face_locations = face_recognition.face_locations(arr, number_of_times_to_upsample=3)
        if face_locations:
            detector_used = "hog-upsample3"
    if not face_locations and req.aggressive:
        face_locations = face_recognition.face_locations(arr, number_of_times_to_upsample=4)
        if face_locations:
            detector_used = "hog-upsample4"
    if not face_locations and req.aggressive:
        try:
            face_locations = face_recognition.face_locations(arr, model="cnn", number_of_times_to_upsample=1)
            if face_locations:
                detector_used = "cnn"
        except Exception as e:
            print(f"  ⚠ CNN detector failed: {e}", flush=True)

    if not face_locations:
        return IdentifyResponse(
            detected_count=0,
            people=[],
            elapsed_ms=int((time.time() - t0) * 1000),
        )

    face_encs = face_recognition.face_encodings(arr, face_locations)
    print(f"  detector={detector_used}  faces={len(face_locations)}", flush=True)

    # Pre-build flat arrays of (name, embedding) for fast comparison
    known_names: list[str] = []
    known_encs: list[np.ndarray] = []
    for w in req.workers:
        for e in w.embeddings:
            known_names.append(w.worker_name)
            known_encs.append(np.array(e))

    people: list[IdentifiedPerson] = []

    for face_enc, loc in zip(face_encs, face_locations):
        if not known_encs:
            people.append(IdentifiedPerson(
                name="Unknown",
                confidence=0.0,
                box=list(loc),
            ))
            continue

        distances = face_recognition.face_distance(known_encs, face_enc)
        min_idx = int(np.argmin(distances))
        min_dist = float(distances[min_idx])

        if min_dist <= req.tolerance:
            people.append(IdentifiedPerson(
                name=known_names[min_idx],
                confidence=round(1.0 - min_dist, 3),
                box=list(loc),
            ))
        else:
            people.append(IdentifiedPerson(
                name="Unknown",
                confidence=round(1.0 - min_dist, 3),
                box=list(loc),
            ))

    return IdentifyResponse(
        detected_count=len(face_locations),
        people=people,
        elapsed_ms=int((time.time() - t0) * 1000),
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
