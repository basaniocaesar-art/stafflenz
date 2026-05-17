# StaffLenz Face-ID Service

Tiny FastAPI service that handles face detection + matching using `face_recognition` (dlib).
Deployed to Railway as a long-running web service. Called by the existing analyze pipeline
to pre-identify people in CCTV frames so Claude only has to handle activity analysis.

## What it does

Two HTTP endpoints:

- `POST /embed` — convert a worker reference photo URL into a 128-dim face embedding.
  Call once per worker photo at enrollment time, store the embedding in your DB.
- `POST /identify` — given a CCTV frame URL + worker embeddings, return who's in the
  frame with bounding box + confidence.

Plus `GET /health` for Railway health checks.

## Local test

```bash
cd /Users/basanio/stafflenz/face-id-service
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt   # ~10-15 min first run (dlib compile)
uvicorn app:app --reload --port 8000
```

Then in another terminal:

```bash
# Embed a worker photo
curl -X POST http://localhost:8000/embed \
  -H "Content-Type: application/json" \
  -d '{"photo_url": "https://your-supabase-signed-url/worker-photos/.../photo_0.jpg",
       "worker_name": "John"}'

# Identify people in a frame (pass workers + their embeddings back)
curl -X POST http://localhost:8000/identify \
  -H "Content-Type: application/json" \
  -d '{"frame_url": "https://your-frame-url.jpg",
       "workers": [{"worker_name": "John", "embeddings": [[0.1, 0.2, ...]]}]}'
```

## Deploy to Railway

1. Push this folder to your stafflenz GitHub repo (e.g. as `face-id-service/`)
2. In Railway dashboard: **New Service** → **GitHub Repo** → select your stafflenz repo
3. Settings → **Root Directory** = `face-id-service`
4. Settings → **Build Command** = (leave blank, Railway auto-detects Python)
5. Settings → **Start Command** = (leave blank, uses Procfile)
6. **Deploy** — first build takes ~5 min (dlib has pre-built Linux wheels)
7. Once deployed, note the public URL (e.g. `https://face-id-service-production.up.railway.app`)
8. Test: `curl https://your-url/health` should return `{"status":"ok","service":"face-id"}`

## How to wire into the existing stafflenz analyze pipeline

In `/Users/basanio/stafflenz/src/app/api/monitor/analyze/route.js`, after downloading the
frames but before calling Claude:

```js
// Pre-identify faces using face-id service
const faceIdUrl = process.env.FACE_ID_SERVICE_URL; // set in Vercel env
const identifyRes = await fetch(`${faceIdUrl}/identify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    frame_url: frames[0],
    workers: workers
      .filter(w => w.embedding)
      .map(w => ({ worker_name: w.full_name, embeddings: [w.embedding] })),
    tolerance: 0.6,
  }),
});
const identified = await identifyRes.json();

// Pass the pre-identified people to Claude as text instead of reference photos
// → Claude doesn't need worker photos in its context → ~50% token savings
```

## Tuning

- **`tolerance`** (default 0.6) — face_recognition standard threshold. Lower = stricter.
  - 0.5 → very strict (almost no false positives, more "Unknown")
  - 0.6 → balanced (recommended)
  - 0.7 → lenient (catches more people but more wrong matches)
- **Multiple embeddings per worker** — store one embedding per reference photo (front, profile, with mask). The service returns the closest match across all of them.

## What it does NOT do

- Doesn't store anything. Stateless service. Embeddings come in via request body, results go out.
- Doesn't have authentication yet — add an `X-Internal-Secret` header check before exposing publicly.
- Doesn't do GPU acceleration. CPU is fine at SMB scale (<100 cameras). Add `dlib` GPU build only if needed.
