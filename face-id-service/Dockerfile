FROM python:3.11-slim

# System deps needed to compile dlib (face_recognition's native backend).
# build-essential + cmake + the BLAS / image libs are the magic combo that
# avoids the "CMake not found" / "cannot find -lblas" failures on slim base.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        libopenblas-dev \
        liblapack-dev \
        libjpeg-dev \
        libpng-dev \
        libx11-dev \
        gfortran \
        wget \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first so they get cached separately from app code
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway injects $PORT; default to 8000 for local docker run
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
