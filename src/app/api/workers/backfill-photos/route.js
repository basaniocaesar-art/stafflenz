import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const BUCKET = 'worker-photos';
const MAX_PHOTOS = 6;

// POST /api/workers/backfill-photos
// One-shot: walks each worker's storage folder and rebuilds photo_paths
// from the existing `photo_N.jpg` files. Fixes workers enrolled before the
// photo_paths column was added, when only slot 0 made it into the DB row.
export async function POST(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user, client } = session;
  const clientId = client?.id;
  if (!clientId) return NextResponse.json({ error: 'No client associated' }, { status: 400 });

  const db = getAdminClient();

  const { data: workers, error } = await db
    .from('workers')
    .select('id, full_name, photo_path, photo_paths')
    .eq('client_id', clientId)
    .is('deleted_at', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const report = [];

  for (const w of workers || []) {
    const folder = `${clientId}/${w.id}`;
    const { data: files } = await db.storage.from(BUCKET).list(folder, { limit: 50 });
    if (!Array.isArray(files) || files.length === 0) {
      report.push({ worker: w.full_name, skipped: 'no files in storage' });
      continue;
    }

    // Build an array of paths, placing each photo_N.jpg at index N.
    const pathsArray = new Array(MAX_PHOTOS).fill(null);
    for (const f of files) {
      const m = /^photo_(\d+)\.(jpg|jpeg|png|webp)$/i.exec(f.name);
      if (!m) continue;
      const idx = parseInt(m[1], 10);
      if (idx >= 0 && idx < MAX_PHOTOS) {
        pathsArray[idx] = `${folder}/${f.name}`;
      }
    }

    const recovered = pathsArray.filter(Boolean);
    if (recovered.length === 0) {
      report.push({ worker: w.full_name, skipped: 'no photo_N.jpg files found' });
      continue;
    }

    const existingCount = Array.isArray(w.photo_paths)
      ? w.photo_paths.filter(Boolean).length
      : (w.photo_path ? 1 : 0);
    if (existingCount >= recovered.length) {
      report.push({ worker: w.full_name, skipped: `already has ${existingCount} photo(s)` });
      continue;
    }

    const upd = await db
      .from('workers')
      .update({ photo_path: recovered[0], photo_paths: pathsArray })
      .eq('id', w.id);
    if (upd.error) {
      report.push({ worker: w.full_name, error: upd.error.message });
    } else {
      report.push({ worker: w.full_name, recovered: recovered.length });
    }
  }

  return NextResponse.json({ success: true, workers_checked: (workers || []).length, report });
}
