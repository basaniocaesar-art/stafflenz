import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stafflenz.com';
const ANALYSIS_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes between Claude calls

// Vercel Cron calls this with: Authorization: Bearer CRON_SECRET
// Internal callers use: X-Internal-Secret
function isAuthorized(request) {
  const cron = request.headers.get('authorization');
  if (cron === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET) return true;
  return false;
}

function internalHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-internal-secret': process.env.INTERNAL_SECRET,
  };
}

// ── Per-client worker ─────────────────────────────────────────────────────────
// Phase 1: Capture + motion check (runs every 5 min, FREE)
// Phase 2: Claude analysis (runs every 15 min IF motion was detected, PAID)

async function runClientWorker(clientId) {
  const log = [];
  const db = getAdminClient();

  try {
    // 1. Capture latest frame
    const captureRes = await fetch(`${BASE_URL}/api/monitor/capture`, {
      method: 'POST',
      headers: internalHeaders(),
      body: JSON.stringify({ client_id: clientId }),
    });

    const captureData = await captureRes.json();

    if (!captureRes.ok || !captureData.frame_url) {
      return { client_id: clientId, status: 'capture_failed', error: captureData.error };
    }

    const frameUrl = captureData.frame_url;
    log.push(`captured: ${captureData.timestamp}`);

    // 2. Get the previous frame URL from Supabase Storage to compare
    const { data: storedFiles } = await db.storage
      .from('frames')
      .list(clientId, { sortBy: { column: 'created_at', order: 'desc' } });

    // storedFiles[0] is the newest (just captured), [1] is the one before it
    const prevFile = storedFiles?.[1];
    if (!prevFile) {
      return { client_id: clientId, status: 'first_frame', log };
    }

    const { data: prevSigned } = await db.storage
      .from('frames')
      .createSignedUrl(`${clientId}/${prevFile.name}`, 3600);

    const previousFrameUrl = prevSigned?.signedUrl;

    if (!previousFrameUrl) {
      return { client_id: clientId, status: 'prev_frame_url_failed', log };
    }

    // 3. Motion detection (FREE — pixel comparison only)
    const motionRes = await fetch(`${BASE_URL}/api/monitor/motion`, {
      method: 'POST',
      headers: internalHeaders(),
      body: JSON.stringify({ client_id: clientId, frame_url: frameUrl, previous_frame_url: previousFrameUrl }),
    });

    const motionData = await motionRes.json();
    log.push(`motion: ${motionData.motion} (${motionData.change_percentage}%)`);

    if (!motionData.motion) {
      return { client_id: clientId, status: 'no_motion', change_percentage: motionData.change_percentage, log };
    }

    // 4. CHECK: Has 15 minutes passed since last Claude analysis?
    const { data: lastAnalysis } = await db
      .from('monitoring_results')
      .select('created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastAnalysisTime = lastAnalysis?.created_at ? new Date(lastAnalysis.created_at).getTime() : 0;
    const timeSinceLastAnalysis = Date.now() - lastAnalysisTime;

    if (timeSinceLastAnalysis < ANALYSIS_INTERVAL_MS) {
      const minutesLeft = Math.ceil((ANALYSIS_INTERVAL_MS - timeSinceLastAnalysis) / 60000);
      log.push(`batch_waiting: ${minutesLeft}min until next analysis`);
      return {
        client_id: clientId,
        status: 'batch_waiting',
        motion_detected: true,
        change_percentage: motionData.change_percentage,
        minutes_until_analysis: minutesLeft,
        log,
      };
    }

    // 5. TIME FOR ANALYSIS — collect up to 3 best frames (oldest → current)
    log.push('batch_analysis: running Claude Vision');
    const recentFiles = (storedFiles || []).slice(0, 3).reverse(); // oldest first
    const frameUrls = await Promise.all(
      recentFiles.map(async (f) => {
        if (f.name === storedFiles[0].name) return frameUrl;
        const { data: s } = await db.storage
          .from('frames')
          .createSignedUrl(`${clientId}/${f.name}`, 3600);
        return s?.signedUrl || null;
      })
    );

    const validFrameUrls = frameUrls.filter(Boolean);

    // 6. Claude Vision analysis (PAID — only runs every 15 min)
    const analyzeRes = await fetch(`${BASE_URL}/api/monitor/analyze`, {
      method: 'POST',
      headers: internalHeaders(),
      body: JSON.stringify({ client_id: clientId, frame_urls: validFrameUrls }),
    });

    const analyzeData = await analyzeRes.json();

    if (!analyzeRes.ok) {
      return { client_id: clientId, status: 'analyze_failed', error: analyzeData.error, log };
    }

    const { analysis } = analyzeData;
    log.push(`workers_detected: ${analysis?.detected_workers?.length ?? 0}`);
    log.push(`alerts: ${analysis?.alerts?.length ?? 0}`);
    log.push(`summary: ${analysis?.summary ?? '—'}`);

    return {
      client_id: clientId,
      status: 'analysed',
      workers_detected: analysis?.detected_workers?.length ?? 0,
      alerts_created: analysis?.alerts?.length ?? 0,
      zone_violations: analysis?.zone_violations?.length ?? 0,
      summary: analysis?.summary ?? null,
      log,
    };
  } catch (err) {
    return { client_id: clientId, status: 'error', error: err.message, log };
  }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getAdminClient();

  // Support per-client cron: ?client_id=xxx or in POST body
  const url = new URL(request.url);
  const queryClientId = url.searchParams.get('client_id');
  let bodyClientId = null;
  try {
    const body = await request.clone().json();
    bodyClientId = body?.client_id;
  } catch { /* no body or not JSON */ }
  const targetClientId = queryClientId || bodyClientId;

  // Get clients — single client if specified, otherwise all active
  let clients;
  if (targetClientId) {
    const { data, error } = await db
      .from('clients')
      .select('id, name')
      .eq('id', targetClientId)
      .eq('is_active', true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    clients = data;
  } else {
    const { data, error } = await db
      .from('clients')
      .select('id, name')
      .eq('is_active', true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    clients = data;
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({ message: targetClientId ? 'Client not found or inactive' : 'No active clients found', ran: 0 });
  }

  // Fire all client workers in parallel
  const results = await Promise.allSettled(
    clients.map((c) => runClientWorker(c.id))
  );

  const summary = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { status: 'rejected', error: r.reason?.message }
  );

  const counts = {
    total: clients.length,
    analysed: summary.filter((r) => r.status === 'analysed').length,
    no_motion: summary.filter((r) => r.status === 'no_motion').length,
    batch_waiting: summary.filter((r) => r.status === 'batch_waiting').length,
    failed: summary.filter((r) => ['error', 'capture_failed', 'analyze_failed'].includes(r.status)).length,
  };

  // ── Update daily_summary for each client ──────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  await Promise.allSettled(
    clients.map(async (c) => {
      try {
        // Count unique detected workers today (exclude Unknown persons)
        const { data: todayEvents } = await db
          .from('worker_events')
          .select('worker_name')
          .eq('client_id', c.id)
          .not('worker_name', 'ilike', '%unknown%')
          .gte('occurred_at', `${today}T00:00:00`)
          .lt('occurred_at', `${today}T23:59:59.999`);
        const uniqueWorkers = new Set((todayEvents || []).map(e => e.worker_name).filter(Boolean));
        const presentCount = uniqueWorkers.size;

        // Count total events today
        const { count: totalEvents } = await db
          .from('worker_events')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', c.id)
          .gte('occurred_at', `${today}T00:00:00`)
          .lt('occurred_at', `${today}T23:59:59.999`);

        // Count violations
        const { count: violationCount } = await db
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', c.id)
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59.999`);

        // Count total active workers
        const { count: totalWorkers } = await db
          .from('workers')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', c.id)
          .eq('is_active', true)
          .is('deleted_at', null);

        const absentCount = Math.max(0, (totalWorkers || 0) - (presentCount || 0));

        await db.from('daily_summary').upsert({
          client_id: c.id,
          summary_date: today,
          total_workers: totalWorkers || 0,
          present_count: presentCount || 0,
          absent_count: absentCount,
          late_count: 0,
          violation_count: violationCount || 0,
          total_events: totalEvents || 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id,summary_date' });
      } catch (err) {
        console.error(`[orchestrator] daily_summary update failed for ${c.id}:`, err.message);
      }
    })
  );

  return NextResponse.json({ ok: true, counts, results: summary });
}

// Vercel Cron also supports GET — keep both
export const GET = POST;
