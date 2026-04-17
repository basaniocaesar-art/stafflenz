import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { ingestFrame, maybeRunSequenceAnalysis } from '@/lib/frameIngest';

// POST /api/frames/upload
// Public frame-upload endpoint for clients who push frames via HTTP
// instead of using the edge agent. Works with any camera system that
// can POST a JPEG.
//
// Headers:
//   x-agent-key: <agent_key>          (from config.json or admin panel)
//   x-client-id: <client UUID>
//   x-camera-channel: <1-8>           (optional, defaults to 1)
//   Content-Type: image/jpeg
//
// Body: raw JPEG binary
//
// After ingestion, checks if a sequence analysis is due (last analysis
// > analyze_interval_min ago) and triggers one if so. This means a
// client can just POST frames on a timer and the full v2 pipeline runs
// automatically — no edge agent or cron needed.

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const agent_key = request.headers.get('x-agent-key');
  const client_id = request.headers.get('x-client-id');
  const camera_channel = parseInt(request.headers.get('x-camera-channel') || '1');

  if (!agent_key || !client_id) {
    return NextResponse.json(
      { error: 'x-agent-key and x-client-id headers required' },
      { status: 400 }
    );
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('image/')) {
    return NextResponse.json(
      { error: 'Content-Type must be image/jpeg (or image/png)' },
      { status: 400 }
    );
  }

  // Verify client exists
  const db = getAdminClient();
  const { data: client } = await db
    .from('clients')
    .select('id, plan')
    .eq('id', client_id)
    .eq('is_active', true)
    .single();
  if (!client) {
    return NextResponse.json({ error: 'Client not found or inactive' }, { status: 404 });
  }

  // Read the frame body
  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.length < 100) {
    return NextResponse.json({ error: 'Frame too small — send a real JPEG' }, { status: 400 });
  }

  // Ingest: upload + index
  let ingested;
  try {
    ingested = await ingestFrame({
      client_id,
      camera_channel,
      buffer,
      has_motion: false,
    });
  } catch (e) {
    return NextResponse.json({ error: `Ingest failed: ${e.message}` }, { status: 500 });
  }

  // Maybe trigger analysis (if last one was > 5 min ago)
  const api_url = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`;
  const analysis = await maybeRunSequenceAnalysis({
    client_id,
    analyze_interval_min: 5,
    api_url,
    agent_key,
  });

  return NextResponse.json({
    ok: true,
    frame_path: ingested.frame_path,
    captured_at: ingested.captured_at,
    analysis_triggered: analysis.triggered,
    analysis_result: analysis.triggered ? analysis.result : undefined,
  });
}
