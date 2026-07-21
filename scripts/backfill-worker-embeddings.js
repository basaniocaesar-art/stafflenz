// Backfill workers.face_embeddings by calling the face-id service /embed on
// each worker's reference photo(s). Without this, workersToEmbeddingPayload()
// returns empty for everyone, so the analyze routes NEVER use the face-id
// service and always fall back to shipping reference photos to Claude (the
// slow, token-heavy path). Run this once (and again whenever reference photos
// change) to "arm" the face-id fast path.
//
//   node scripts/backfill-worker-embeddings.js            # embed workers missing embeddings
//   node scripts/backfill-worker-embeddings.js --force    # re-embed everyone (e.g. after switching to 512-dim ArcFace)
//   node scripts/backfill-worker-embeddings.js --client=<client_id>   # limit to one client
//
// Idempotent: by default skips workers that already have embeddings.

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Minimal .env.local loader (no dotenv dep) — same pattern as backfill-worker-photos.js
const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FACE_ID_URL = (process.env.FACE_ID_SERVICE_URL || '').replace(/\/$/, '');
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!FACE_ID_URL) {
  console.error('Missing FACE_ID_SERVICE_URL (the Railway face-id service base URL)');
  process.exit(1);
}

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const clientArg = args.find((a) => a.startsWith('--client='));
const CLIENT_ID = clientArg ? clientArg.split('=')[1] : null;

const BUCKET = 'worker-photos';
const MAX_PHOTOS = 6;
const db = createClient(url, key);

// Collect a worker's reference photo paths — prefer the multi-photo array,
// fall back to the single photo_path.
function photoPathsFor(w) {
  const arr = Array.isArray(w.photo_paths) ? w.photo_paths.filter(Boolean) : [];
  if (arr.length) return arr.slice(0, MAX_PHOTOS);
  return w.photo_path ? [w.photo_path] : [];
}

// Embed one photo via the face-id service. Returns a 512-dim array or null.
async function embedPhoto(photoPath, workerName) {
  const { data: signed, error } = await db.storage.from(BUCKET).createSignedUrl(photoPath, 300);
  if (error || !signed?.signedUrl) {
    console.log(`    · sign failed (${photoPath}): ${error?.message || 'no url'}`);
    return null;
  }
  try {
    const res = await fetch(`${FACE_ID_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_url: signed.signedUrl, worker_name: workerName }),
      signal: AbortSignal.timeout(60000), // cold InsightFace load can be slow
    });
    if (!res.ok) {
      console.log(`    · /embed HTTP ${res.status} (${photoPath})`);
      return null;
    }
    const j = await res.json();
    if (!j.embedding) {
      console.log(`    · no face in ${photoPath}${j.error ? ` (${j.error})` : ''}`);
      return null;
    }
    return j.embedding;
  } catch (e) {
    console.log(`    · /embed failed (${photoPath}): ${e.message}`);
    return null;
  }
}

(async () => {
  let q = db
    .from('workers')
    .select('id, client_id, full_name, photo_path, photo_paths, face_embeddings')
    .is('deleted_at', null)
    .eq('is_active', true);
  if (CLIENT_ID) q = q.eq('client_id', CLIENT_ID);

  const { data: workers, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }

  console.log(`Found ${workers?.length || 0} active worker(s)${CLIENT_ID ? ` for client ${CLIENT_ID}` : ''}. FORCE=${FORCE}\n`);

  let embedded = 0, skipped = 0, noFace = 0, noPhotos = 0;
  for (const w of workers || []) {
    const already = Array.isArray(w.face_embeddings) && w.face_embeddings.length > 0;
    if (already && !FORCE) {
      console.log(`· ${w.full_name}: has ${w.face_embeddings.length} embedding(s) — skip`);
      skipped++;
      continue;
    }

    const paths = photoPathsFor(w);
    if (!paths.length) {
      console.log(`✗ ${w.full_name}: no reference photos`);
      noPhotos++;
      continue;
    }

    console.log(`→ ${w.full_name}: embedding ${paths.length} photo(s)…`);
    const embeddings = [];
    for (const p of paths) {
      const emb = await embedPhoto(p, w.full_name);
      if (emb) embeddings.push(emb);
    }

    if (!embeddings.length) {
      console.log(`✗ ${w.full_name}: no usable faces across ${paths.length} photo(s)`);
      noFace++;
      continue;
    }

    const upd = await db
      .from('workers')
      .update({ face_embeddings: embeddings, face_embeddings_updated_at: new Date().toISOString() })
      .eq('id', w.id);
    if (upd.error) {
      console.log(`✗ ${w.full_name}: DB update failed — ${upd.error.message}`);
    } else {
      console.log(`✓ ${w.full_name}: stored ${embeddings.length} embedding(s) (dim ${embeddings[0].length})`);
      embedded++;
    }
  }

  console.log(`\nDone. embedded=${embedded} skipped=${skipped} no-face=${noFace} no-photos=${noPhotos}`);
  console.log('The face-id fast path is now armed for embedded workers; analyze routes will skip reference photos on a match.');
})();
