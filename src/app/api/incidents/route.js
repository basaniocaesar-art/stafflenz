import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

// GET /api/incidents
// Query params:
//   from=ISO            (default: 7 days ago)
//   to=ISO              (default: now)
//   severity=low|medium|high|critical
//   camera=1..8
//   resolved=true|false  (currently unused — we track via alerts.is_resolved)
//   limit=50 (max 200)
//   offset=0
//
// Returns the caller's client's motion_events list with severity, camera,
// timestamp, summary, identified_people, and signed URL for the first frame.

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session || !session.client) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const from = searchParams.get('from') || sevenDaysAgo.toISOString();
  const to = searchParams.get('to') || now.toISOString();
  const severity = searchParams.get('severity');
  const camera = searchParams.get('camera');
  const limit = Math.min(MAX_LIMIT, parseInt(searchParams.get('limit') || DEFAULT_LIMIT));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || 0));

  const db = getAdminClient();
  let query = db
    .from('motion_events')
    .select('id, camera_channel, detected_at, motion_score, frame_paths, severity, incident_summary, identified_people, alert_sent, cost_usd, created_at', { count: 'exact' })
    .eq('client_id', session.client.id)
    .gte('detected_at', from)
    .lte('detected_at', to)
    .order('detected_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (severity) query = query.eq('severity', severity);
  if (camera) query = query.eq('camera_channel', parseInt(camera));

  const { data: events, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sign the first frame URL of each event for thumbnails (5-min expiry is fine for a list)
  const rows = await Promise.all(
    (events || []).map(async (e) => {
      let thumbnail_url = null;
      const firstPath = Array.isArray(e.frame_paths) ? e.frame_paths[0] : null;
      if (firstPath) {
        try {
          const { data: signed } = await db.storage.from('frames').createSignedUrl(firstPath, 300);
          thumbnail_url = signed?.signedUrl || null;
        } catch { /* ignore */ }
      }
      return { ...e, thumbnail_url };
    })
  );

  // Aggregate counts for the filter UI
  const { data: byCamera } = await db
    .from('motion_events')
    .select('camera_channel')
    .eq('client_id', session.client.id)
    .gte('detected_at', from)
    .lte('detected_at', to);
  const cameraCounts = {};
  const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
  (byCamera || []).forEach((r) => { cameraCounts[r.camera_channel] = (cameraCounts[r.camera_channel] || 0) + 1; });
  (events || []).forEach((e) => { severityCounts[e.severity] = (severityCounts[e.severity] || 0) + 1; });

  return NextResponse.json({
    incidents: rows,
    total: count || rows.length,
    offset,
    limit,
    cameraCounts,
    severityCounts,
  });
}
