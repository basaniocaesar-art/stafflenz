import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { sendWhatsApp, alertMessage } from '@/lib/whatsapp';

// CORS headers for LenzAI Edge Node (not a browser)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request) {
  // Auth: LenzAI Edge Node sends Authorization: Bearer <camera_key>
  const authHeader = request.headers.get('authorization') || '';
  const cameraKey = authHeader.replace('Bearer ', '').trim();

  if (!cameraKey) {
    return NextResponse.json({ error: 'Authorization required' }, { status: 401 }, { headers: corsHeaders });
  }

  const db = getAdminClient();

  // Look up zone by camera_key
  const { data: zone } = await db
    .from('camera_zones')
    .select('id, client_id, name, is_active')
    .eq('camera_key', cameraKey)
    .single();

  if (!zone || !zone.is_active) {
    return NextResponse.json({ error: 'Invalid or inactive camera key' }, { status: 401 }, { headers: corsHeaders });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }, { headers: corsHeaders });
  }

  const { detections = [], timestamp, device_event_id } = body;
  const clientId = zone.client_id;
  const occurredAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
  const summaryDate = occurredAt.slice(0, 10);

  const insertedEvents = [];
  const insertedAlerts = [];

  for (const detection of detections) {
    const {
      worker_id,
      name: worker_name,
      activity,
      zone: zoneName,
      confidence,
      zone_violation,
      ppe_compliant,
      notes,
      event_id: piEventId,
    } = detection;

    // Determine event type
    const explicitTypes = ['check_in', 'check_out', 'break_start', 'break_end'];
    let event_type = 'detected';
    if (detection.event_type && explicitTypes.includes(detection.event_type)) {
      event_type = detection.event_type;
    } else if (zone_violation) {
      event_type = 'zone_violation';
    } else if (ppe_compliant === false) {
      event_type = 'ppe_violation';
    }

    const uniqueId = piEventId || (device_event_id ? `${device_event_id}_${worker_id}` : null);

    const eventPayload = {
      client_id: clientId,
      zone_id: zone.id,
      worker_id: worker_id || null,
      worker_name: worker_name || null,
      activity: activity || null,
      event_type,
      confidence: confidence || null,
      zone_violation: zone_violation || false,
      ppe_compliant: ppe_compliant !== false,
      notes: notes || null,
      device_event_id: uniqueId,
      occurred_at: occurredAt,
    };

    const { data: event, error: eventError } = await db
      .from('worker_events')
      .insert(eventPayload)
      .select('id')
      .single();

    if (eventError) {
      // Skip duplicate events (unique constraint on device_event_id)
      if (eventError.code !== '23505') {
        console.error('Event insert error:', eventError.message);
      }
      continue;
    }

    insertedEvents.push(event.id);

    // Generate alerts for violations
    if (zone_violation || ppe_compliant === false) {
      const alertType = zone_violation ? 'zone_violation' : 'ppe_violation';
      const message = zone_violation
        ? `${worker_name || 'Unknown worker'} detected in restricted zone: ${zoneName || zone.name}`
        : `${worker_name || 'Unknown worker'} missing PPE in ${zoneName || zone.name}`;

      const { data: alert } = await db
        .from('alerts')
        .insert({
          client_id: clientId,
          worker_id: worker_id || null,
          event_id: event.id,
          alert_type: alertType,
          message,
          worker_name: worker_name || 'Unknown',
          zone_name: zoneName || zone.name,
        })
        .select('id')
        .single();

      if (alert) {
        insertedAlerts.push(alert.id);

        // Send WhatsApp alert to client's notify number
        const { data: client } = await db
          .from('clients')
          .select('whatsapp_notify')
          .eq('id', clientId)
          .single();

        if (client?.whatsapp_notify) {
          const waMessage = alertMessage(alertType, {
            zone: zoneName || zone.name,
            camera: zone.name,
            name: worker_name || 'Unknown',
            violation: message,
          });
          sendWhatsApp(client.whatsapp_notify, waMessage).catch(console.error);
        }
      }
    }
  }

  // Update daily summary via RPC
  const hasViolation = detections.some((d) => d.zone_violation || d.ppe_compliant === false);
  if (insertedEvents.length > 0) {
    await db.rpc('process_event_summary', {
      p_client_id: clientId,
      p_summary_date: summaryDate,
      p_is_violation: hasViolation,
    });
  }

  return NextResponse.json(
    { success: true, events_saved: insertedEvents.length, alerts_created: insertedAlerts.length },
    { headers: corsHeaders }
  );
}
