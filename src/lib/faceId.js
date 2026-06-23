// Client for the StaffLenz face-id microservice deployed on Railway.
// Pre-identifies workers in CCTV frames using face_recognition (dlib) so the
// downstream Claude call doesn't need worker reference photos in its content
// (≈50% Claude token savings + higher recognition accuracy).
//
// Falls back gracefully — if the service is unreachable or returns no faces,
// callers should fall back to sending reference photos to Claude (the old path).

const FACE_ID_URL = (process.env.FACE_ID_SERVICE_URL || '').replace(/\/$/, '');

export function faceIdEnabled() {
  return Boolean(FACE_ID_URL);
}

/**
 * Identify workers in a single frame URL.
 * @param {string} frameUrl - public/signed URL of the frame image
 * @param {Array<{worker_name: string, embeddings: number[][]}>} workers
 * @param {number} tolerance - 0.5 strict / 0.6 balanced / 0.7 lenient
 * @param {boolean} aggressive - try harder detectors (upsample=3/4 + CNN). Slow.
 * @returns {Promise<{detected_count, people: Array<{name, confidence, box}>}>}
 */
export async function identifyFaces(frameUrl, workers, tolerance = 0.6, aggressive = false) {
  if (!FACE_ID_URL) return null;
  if (!Array.isArray(workers) || workers.length === 0) return null;

  try {
    const res = await fetch(`${FACE_ID_URL}/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame_url: frameUrl, workers, tolerance, aggressive }),
      // Aggressive mode can take 30-60s (CNN inference). Standard mode ~3-5s.
      signal: AbortSignal.timeout(aggressive ? 90000 : 20000),
    });
    if (!res.ok) {
      console.warn(`[faceId] identify HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`[faceId] identify failed: ${e.message}`);
    return null;
  }
}

/**
 * Batch convenience — identify across multiple frames in parallel.
 * `aggressivePredicate` (optional) is called per index — return true to use
 * aggressive mode for that frame (e.g. the front-desk camera). Default off.
 */
export async function identifyFacesInFrames(frameUrls, workers, tolerance = 0.6, aggressivePredicate = null) {
  if (!FACE_ID_URL) return frameUrls.map(() => null);
  return Promise.all(frameUrls.map((url, i) => {
    const agg = aggressivePredicate ? Boolean(aggressivePredicate(i)) : false;
    return identifyFaces(url, workers, tolerance, agg);
  }));
}

/**
 * Shape worker DB rows into the format the /identify endpoint expects.
 * Workers without embeddings are filtered out.
 */
export function workersToEmbeddingPayload(workers) {
  return (workers || [])
    .filter((w) => Array.isArray(w.face_embeddings) && w.face_embeddings.length > 0)
    .map((w) => ({
      worker_name: w.full_name,
      embeddings: w.face_embeddings,
    }));
}

/**
 * Format the /identify results as a compact text block to feed Claude in
 * place of reference photos. Includes box coordinates so Claude knows where
 * each named person is in the frame.
 */
export function formatIdentificationsForPrompt(perFrameResults, frameLabels) {
  const lines = [];
  for (let i = 0; i < perFrameResults.length; i++) {
    const r = perFrameResults[i];
    if (!r || !Array.isArray(r.people) || r.people.length === 0) continue;
    const frameLabel = frameLabels?.[i] || `Frame ${i + 1}`;
    const named = r.people.filter((p) => p.name && p.name !== 'Unknown');
    const unknown = r.people.filter((p) => p.name === 'Unknown');
    const peopleStr = [
      ...named.map((p) =>
        `${p.name} (conf ${p.confidence}, box top=${p.box[0]} left=${p.box[3]} bottom=${p.box[2]} right=${p.box[1]})`
      ),
      ...unknown.map(
        (p) => `Unknown person (box top=${p.box[0]} left=${p.box[3]} bottom=${p.box[2]} right=${p.box[1]})`
      ),
    ];
    lines.push(`${frameLabel}: ${peopleStr.join('; ')}`);
  }
  if (lines.length === 0) return null;
  return [
    'FACE-ID RESULTS (pre-computed by face_recognition; treat as ground truth for IDs):',
    ...lines,
    'Use these names directly. Do not re-identify from facial features. Focus on activity, posture, zone, PPE, and behavior.',
  ].join('\n');
}
