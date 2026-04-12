import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAdminClient } from '@/lib/supabase';

// POST /api/agent/analyze — called by edge agent after uploading frames
// This is the same analysis logic as /api/monitor/analyze but triggered by the agent
// with a frame_url instead of requiring the server to capture

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  const body = await request.json();
  const { agent_key, client_id, frame_url } = body;

  if (!agent_key || !client_id || !frame_url) {
    return NextResponse.json({ error: 'agent_key, client_id, and frame_url required' }, { status: 400 });
  }

  const db = getAdminClient();

  // Verify client exists
  const { data: clientData } = await db.from('clients').select('id, name, industry').eq('id', client_id).single();
  if (!clientData) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Get zones
  let zones;
  const fullZones = await db.from('camera_zones')
    .select('id, name, zone_type, location_label, min_workers, max_workers, rules, ppe_requirements')
    .eq('client_id', client_id).eq('is_active', true);
  if (fullZones.error && fullZones.error.message?.includes('column')) {
    const baseZones = await db.from('camera_zones')
      .select('id, name, zone_type, location_label')
      .eq('client_id', client_id).eq('is_active', true);
    zones = (baseZones.data || []).map(z => ({ ...z, min_workers: 0, max_workers: null, rules: null, ppe_requirements: null }));
  } else {
    zones = fullZones.data || [];
  }

  // Get workers (all shifts for agent — it runs 24/7)
  let workers;
  const fullWorkers = await db.from('workers')
    .select('id, full_name, department, shift, photo_path, photo_paths')
    .eq('client_id', client_id).eq('is_active', true).is('deleted_at', null);
  if (fullWorkers.error && fullWorkers.error.message?.includes('column')) {
    const baseWorkers = await db.from('workers')
      .select('id, full_name, department, shift, photo_path')
      .eq('client_id', client_id).eq('is_active', true).is('deleted_at', null);
    workers = (baseWorkers.data || []).map(w => ({ ...w, photo_paths: null }));
  } else {
    workers = fullWorkers.data || [];
  }

  // Download frame
  let frameBase64;
  try {
    const res = await fetch(frame_url);
    if (!res.ok) return NextResponse.json({ error: 'Could not download frame' }, { status: 502 });
    frameBase64 = Buffer.from(await res.arrayBuffer()).toString('base64');
  } catch (e) {
    return NextResponse.json({ error: `Frame download failed: ${e.message}` }, { status: 502 });
  }

  // Download worker reference photos (max 2 per worker)
  async function downloadPhoto(path) {
    try {
      const { data: signed } = await db.storage.from('worker-photos').createSignedUrl(path, 120);
      if (!signed?.signedUrl) return null;
      const res = await fetch(signed.signedUrl);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer()).toString('base64');
    } catch { return null; }
  }

  const workersWithPhotos = await Promise.all(
    workers.map(async (w) => {
      const photos = [];
      if (w.photo_path) {
        const b64 = await downloadPhoto(w.photo_path);
        if (b64) photos.push(b64);
      }
      return { ...w, photoBase64s: photos };
    })
  );

  // Build Claude message — cache worker photos (they rarely change, cache reads ~10% of normal cost)
  const content = [];
  let workerPhotoBlocksAdded = 0;
  for (const w of workersWithPhotos) {
    for (const b64 of w.photoBase64s) {
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
      content.push({ type: 'text', text: `Reference: ${w.full_name} — ${w.department || 'staff'}` });
      workerPhotoBlocksAdded += 2;
    }
  }
  if (workerPhotoBlocksAdded > 0) {
    const lastIdx = content.length - 1;
    content[lastIdx] = { ...content[lastIdx], cache_control: { type: 'ephemeral' } };
  }

  content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frameBase64 } });
  content.push({ type: 'text', text: 'Current camera frame' });

  // Determine shift
  const hour = new Date().getHours();
  const shift = hour >= 6 && hour < 14 ? 'morning' : hour >= 14 && hour < 22 ? 'afternoon' : 'night';

  const workerList = workersWithPhotos.filter(w => w.photoBase64s.length > 0).map(w => `- ${w.full_name} (${w.department || 'staff'})`).join('\n') || 'No reference photos';
  const zoneList = zones.map(z => `- ${z.name} (${z.zone_type || 'general'})`).join('\n') || 'No zones configured';

  content.push({ type: 'text', text: `You are a workplace safety AI for ${clientData.name} — ${clientData.industry}.

REGISTERED WORKERS:
${workerList}

ZONES:
${zoneList}

Examine the frame. Identify registered workers by comparing faces. Flag unknown persons, PPE violations, and zone issues.

Return ONLY valid JSON:
{
  "detected_workers": [{"worker_id":null,"worker_name":"","zone":"","status":"working|idle","ppe_compliant":true,"confidence":0.8}],
  "alerts": [{"alert_type":"ppe_violation|zone_violation","worker_name":"","zone_name":"","message":"","severity":"low|medium|high"}],
  "summary": ""
}` });

  // Call Claude
  let analysis;
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content }],
    });
    const raw = response.content.find(b => b.type === 'text')?.text || '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    analysis = JSON.parse(match?.[0] || '{}');
  } catch (err) {
    return NextResponse.json({ error: `Analysis failed: ${err.message}` }, { status: 500 });
  }

  // Save events
  const now = new Date().toISOString();
  if (Array.isArray(analysis.detected_workers) && analysis.detected_workers.length > 0) {
    const events = analysis.detected_workers.map(w => ({
      client_id, worker_id: w.worker_id || null, worker_name: w.worker_name,
      event_type: 'detected', activity: w.status || 'present',
      zone_id: zones.find(z => z.name === w.zone)?.id || null,
      ppe_compliant: w.ppe_compliant !== false, zone_violation: false,
      confidence: typeof w.confidence === 'number' ? w.confidence : 0.8, occurred_at: now,
    }));
    await db.from('worker_events').insert(events);
  }

  if (Array.isArray(analysis.alerts) && analysis.alerts.length > 0) {
    const alerts = analysis.alerts.map(a => ({
      client_id, alert_type: a.alert_type || 'general', message: a.message,
      worker_name: a.worker_name || null, zone_name: a.zone_name || null,
      is_resolved: false, created_at: now,
    }));
    await db.from('alerts').insert(alerts);
  }

  return NextResponse.json({ success: true, analysis, timestamp: now });
}
