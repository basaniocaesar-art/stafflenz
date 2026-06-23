// Weekly AI report — aggregates the last 7 days of activity_timeline +
// alerts + workers into a single payload that the /report/weekly page
// renders as a printable PDF.

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const isReal = (n) => {
  const x = (n || '').toLowerCase().trim();
  return x && x !== 'unknown person' && x !== 'unknown' && x !== 'n/a';
};

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const queryLocation = searchParams.get('location') || null;

  const isSuper = session.user.role === 'super_admin';
  // For non-super, lock to their own client
  const clientId = isSuper ? (searchParams.get('client_id') || session.user.client_id) : session.user.client_id;
  if (!clientId) return NextResponse.json({ error: 'No client context' }, { status: 400 });

  const db = getAdminClient();

  // Client + location
  const { data: client } = await db.from('clients').select('id, name, industry, plan').eq('id', clientId).maybeSingle();
  const { data: locations } = await db
    .from('locations')
    .select('id, name, industry')
    .eq('client_id', clientId)
    .eq('is_active', true);
  const location = queryLocation ? (locations || []).find((l) => l.id === queryLocation) : null;

  // 7-day window
  const now   = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Pull timelines (capped at 2000 rows for safety)
  let q = db
    .from('activity_timeline')
    .select('window_start, window_end, location_id, camera_channel, summary, timeline')
    .eq('client_id', clientId)
    .gte('window_end', start.toISOString())
    .order('window_end', { ascending: false })
    .limit(2000);
  if (location) q = q.eq('location_id', location.id);
  const { data: timelines } = await q;

  // Pull alerts
  let aq = db
    .from('alerts')
    .select('id, alert_type, severity, message, worker_name, zone_name, duration_minutes, business_impact, created_at')
    .eq('client_id', clientId)
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: false })
    .limit(1000);
  if (location) aq = aq.eq('location_id', location.id);
  const { data: alerts } = await aq;

  // Aggregate scores
  let totalPeople = 0, namedPeople = 0, working = 0;
  let totalAlerts = 0, highAlerts = 0, mediumAlerts = 0;
  const zoneObs = {};        // zone -> { total, named }
  const seenWorkers = new Set();
  const dailyAgg = {};       // 'YYYY-MM-DD' -> { obs, named, alerts, high }

  for (const tl of (timelines || [])) {
    const body = tl.timeline || tl;
    const day = (tl.window_end || '').slice(0, 10);
    if (!dailyAgg[day]) dailyAgg[day] = { obs: 0, named: 0, alerts: 0, high: 0 };
    for (const camWindow of (body?.timeline || [])) {
      for (const minute of (camWindow.minutes || [])) {
        for (const p of (minute.people || [])) {
          totalPeople++;
          dailyAgg[day].obs++;
          const named = isReal(p.worker_name);
          if (named) {
            namedPeople++;
            dailyAgg[day].named++;
            seenWorkers.add(p.worker_name);
          }
          const a = (p.activity || '').toLowerCase();
          if (a && a !== 'idle' && a !== 'resting' && a !== 'waiting' && a !== 'standing') working++;
          const z = p.zone;
          if (z) {
            if (!zoneObs[z]) zoneObs[z] = { total: 0, named: 0 };
            zoneObs[z].total++;
            if (named) zoneObs[z].named++;
          }
        }
      }
    }
    for (const a of (body?.alerts || [])) {
      const s = (a.severity || '').toLowerCase();
      totalAlerts++;
      dailyAgg[day].alerts++;
      if (s === 'high')   { highAlerts++; dailyAgg[day].high++; }
      else if (s === 'medium') mediumAlerts++;
    }
  }

  const coverageScore   = totalPeople ? Math.round((namedPeople / totalPeople) * 100) : null;
  const complianceScore = totalAlerts
    ? Math.max(0, 100 - Math.round((highAlerts * 8 + mediumAlerts * 2) / totalAlerts * 10))
    : 100;
  const engagementScore = totalPeople ? Math.round((working / totalPeople) * 100) : null;
  const riskLevel       = highAlerts >= 10 ? 'High' : highAlerts >= 3 ? 'Medium' : 'Low';

  const zoneScores = Object.entries(zoneObs)
    .filter(([, v]) => v.total >= 5)
    .map(([name, v]) => ({
      name,
      coverage: v.total ? Math.round((v.named / v.total) * 100) : 0,
      observations: v.total,
    }))
    .sort((a, b) => b.observations - a.observations);

  // Top incidents — high then medium, dedup by message
  const seenMessages = new Set();
  const topIncidents = (alerts || [])
    .filter((a) => {
      if (seenMessages.has(a.message)) return false;
      seenMessages.add(a.message);
      return true;
    })
    .sort((a, b) => {
      const sev = { high: 3, medium: 2, low: 1 };
      return (sev[b.severity] || 0) - (sev[a.severity] || 0);
    })
    .slice(0, 12);

  // Daily series for chart
  const daily = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    daily.push({
      date: d,
      observations: dailyAgg[d]?.obs || 0,
      coveragePct: dailyAgg[d]?.obs ? Math.round((dailyAgg[d].named / dailyAgg[d].obs) * 100) : 0,
      alerts: dailyAgg[d]?.alerts || 0,
      highAlerts: dailyAgg[d]?.high || 0,
    });
  }

  // Recommendations (rule-based)
  const recommendations = [];
  if (coverageScore !== null && coverageScore < 70) {
    recommendations.push({
      severity: 'medium',
      title: 'Enroll more staff in face recognition',
      detail: `Coverage Score is ${coverageScore}%. Many people on camera aren't matched to a registered worker. Add face photos for unmatched staff so they appear by name in reports.`,
    });
  }
  const weakZones = zoneScores.filter((z) => z.coverage < 50 && z.observations >= 10);
  if (weakZones.length > 0) {
    recommendations.push({
      severity: 'medium',
      title: `Low staff coverage in ${weakZones.length} area${weakZones.length === 1 ? '' : 's'}`,
      detail: `${weakZones.slice(0, 3).map((z) => `${z.name} (${z.coverage}%)`).join(', ')}. Check whether staff are scheduled to cover these areas during operating hours.`,
    });
  }
  if (highAlerts >= 5) {
    recommendations.push({
      severity: 'high',
      title: `${highAlerts} high-severity incidents this week`,
      detail: 'Review the top incidents section below — repeated patterns may indicate a staffing schedule gap or zone coverage issue.',
    });
  }
  if (engagementScore !== null && engagementScore < 50) {
    recommendations.push({
      severity: 'low',
      title: 'Staff engagement opportunity',
      detail: `Active-work observations were ${engagementScore}% this week. Consider whether scheduled break patterns align with foot traffic.`,
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      severity: 'low',
      title: 'Operations running smoothly',
      detail: 'No major coverage gaps or recurring incidents detected this week. Keep your face-id enrollment up to date as staff change.',
    });
  }

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    period: { start: start.toISOString(), end: now.toISOString() },
    client: client ? { name: client.name, industry: client.industry, plan: client.plan } : null,
    location: location ? { name: location.name } : null,
    scores: { coverageScore, complianceScore, engagementScore, riskLevel },
    counts: {
      totalObservations: totalPeople,
      namedObservations: namedPeople,
      registeredStaffSeen: seenWorkers.size,
      registeredStaffList: [...seenWorkers].sort(),
      totalAlerts,
      highAlerts,
      mediumAlerts,
    },
    daily,
    zoneScores,
    topIncidents,
    recommendations,
  });
}
