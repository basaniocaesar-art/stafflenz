FROM python:3.11-slim

# InsightFace runs ONNX models (RetinaFace + ArcFace), so we need
# onnxruntime's system deps + opencv's image-loading libs. No dlib / blas /
# cmake any more — the old face_recognition tooling chain is gone.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 \
        libgl1 \
        libglib2.0-0 \
        wget \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Pre-download the InsightFace model so the container starts fast in production
# (otherwise cold start downloads ~280MB on first request and times out).
RUN python -c "from insightface.app import FaceAnalysis; FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider']).prepare(ctx_id=0, det_size=(640,640))"

COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
