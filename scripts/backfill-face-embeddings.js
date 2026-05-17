// One-shot: walk every worker, embed each reference photo via the face-id
// service on Railway, and write the resulting embeddings array onto the row.
// Safe to re-run — it skips workers that already have embeddings unless --force.
//
// Run:
//   node scripts/backfill-face-embeddings.js          (only missing workers)
//   node scripts/backfill-face-embeddings.js --force  (re-embed everyone)
//
// Requires in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   FACE_ID_SERVICE_URL   (e.g. https://stafflenz-production.up.railway.app)

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FACE_ID_URL = (process.env.FACE_ID_SERVICE_URL || '').replace(/\/$/, '');

if (!SUPA_URL || !SUPA_KEY || !FACE_ID_URL) {
  console.error('Missing one of: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FACE_ID_SERVICE_URL');
  process.exit(1);
}

const FORCE = process.argv.includes('--force');
const BUCKET = 'worker-photos';
const db = createClient(SUPA_URL, SUPA_KEY);

async function signedUrl(p) {
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(p, 300);
  if (error) throw new Error(`sign ${p}: ${error.message}`);
  return data.signedUrl;
}

async function embed(photoUrl, workerName) {
  const res = await fetch(`${FACE_ID_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_url: photoUrl, worker_name: workerName }),
  });
  if (!res.ok) throw new Error(`embed HTTP ${res.status}`);
  const body = await res.json();
  return body.embedding; // null if no face detected
}

(async () => {
  console.log(`Face-id service: ${FACE_ID_URL}`);
  console.log(`Mode: ${FORCE ? 'FORCE — re-embed everyone' : 'only workers missing embeddings'}`);
  console.log('');

  // Health check first
  try {
    const health = await fetch(`${FACE_ID_URL}/health`).then(r => r.json());
    if (health.status !== 'ok') throw new Error('not ok');
    console.log(`✓ Face-id service healthy\n`);
  } catch (e) {
    console.error(`✗ Face-id service unreachable: ${e.message}`);
    process.exit(1);
  }

  // Load workers
  const { data: workers, error } = await db
    .from('workers')
    .select('id, client_id, full_name, photo_path, photo_paths, face_embeddings')
    .eq('is_active', true)
    .is('deleted_at', null);
  if (error) { console.error(error.message); process.exit(1); }

  console.log(`Found ${workers.length} active workers\n`);

  let embedded = 0, skipped = 0, failed = 0, noFace = 0;

  for (const w of workers) {
    // Skip if already has embeddings and not --force
    if (!FORCE && Array.isArray(w.face_embeddings) && w.face_embeddings.length > 0) {
      console.log(`  ⏭  ${w.full_name} — already embedded (${w.face_embeddings.length} photos)`);
      skipped++;
      continue;
    }

    // Build list of photo paths from photo_paths array (preferred) or photo_path fallback
    const paths = Array.isArray(w.photo_paths) && w.photo_paths.length > 0
      ? w.photo_paths.filter(Boolean)
      : (w.photo_path ? [w.photo_path] : []);

    if (paths.length === 0) {
      console.log(`  ⚠  ${w.full_name} — no photos in DB, skipped`);
      skipped++;
      continue;
    }

    const embeddings = [];
    for (const p of paths) {
      try {
        const url = await signedUrl(p);
        const emb = await embed(url, w.full_name);
        if (Array.isArray(emb) && emb.length === 128) {
          embeddings.push(emb);
        } else {
          noFace++;
        }
      } catch (e) {
        console.log(`     · ${p}: ${e.message}`);
        failed++;
      }
    }

    if (embeddings.length === 0) {
      console.log(`  ✗  ${w.full_name} — no faces found in any photo`);
      continue;
    }

    const upd = await db
      .from('workers')
      .update({
        face_embeddings: embeddings,
        face_embeddings_updated_at: new Date().toISOString(),
      })
      .eq('id', w.id);

    if (upd.error) {
      console.log(`  ✗  ${w.full_name} — update failed: ${upd.error.message}`);
      failed++;
    } else {
      console.log(`  ✓  ${w.full_name} — embedded ${embeddings.length}/${paths.length} photos`);
      embedded++;
    }
  }

  console.log(`\nDone. Embedded: ${embedded}  Skipped: ${skipped}  Failed: ${failed}  No-face photos: ${noFace}`);
})();
