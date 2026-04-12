import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// Prune Queue — daily housekeeping cron
// Deletes processed/failed rows from frame_queue older than 7 days, and also
// cleans up their Supabase Storage files so the `frames` bucket doesn't grow
// forever. The SQL function prune_old_frame_queue() handles the row deletion;
// we do the storage cleanup here because PostgREST can't reach Storage.
// ═══════════════════════════════════════════════════════════════════════════════

function isAuthorized(request) {
  const cron = request.headers.get('authorization');
  if (cron === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET) return true;
  return false;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getAdminClient();
  const cutoffIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // ── 1. Find storage paths for rows we're about to delete ──────────────────
  // We do this BEFORE deleting the rows so we know what to remove from storage.
  let stalePaths = [];
  try {
    const { data } = await db
      .from('frame_queue')
      .select('frame_path')
      .in('status', ['processed', 'failed'])
      .lt('processed_at', cutoffIso);
    stalePaths = (data || []).map((r) => r.frame_path).filter(Boolean);
  } catch (err) {
    // frame_queue table may not exist yet — that's fine, nothing to prune
    return NextResponse.json({ ok: true, message: 'frame_queue not present', deleted_rows: 0, deleted_files: 0 });
  }

  // ── 2. Delete old rows via the SQL function (handles its own COUNT) ──────
  let deletedRows = 0;
  try {
    const { data } = await db.rpc('prune_old_frame_queue');
    deletedRows = typeof data === 'number' ? data : 0;
  } catch (err) {
    // Fallback: do the DELETE in JS if the RPC function doesn't exist
    const { count } = await db
      .from('frame_queue')
      .delete({ count: 'exact' })
      .in('status', ['processed', 'failed'])
      .lt('processed_at', cutoffIso);
    deletedRows = count || 0;
  }

  // ── 3. Delete the corresponding storage files (batched) ──────────────────
  let deletedFiles = 0;
  if (stalePaths.length > 0) {
    // Supabase Storage accepts up to 1000 paths per remove() call
    const CHUNK = 500;
    for (let i = 0; i < stalePaths.length; i += CHUNK) {
      const chunk = stalePaths.slice(i, i + CHUNK);
      try {
        const { data, error } = await db.storage.from('frames').remove(chunk);
        if (!error) deletedFiles += data?.length || 0;
      } catch { /* ignore individual chunk failures */ }
    }
  }

  return NextResponse.json({
    ok: true,
    cutoff: cutoffIso,
    deleted_rows: deletedRows,
    deleted_files: deletedFiles,
  });
}

// Allow POST so it can be triggered from the admin dashboard too
export const POST = GET;
