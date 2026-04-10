import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function requireSuperAdmin(request) {
  const session = await requireAuth(request);
  if (!session) return null;
  if (session.user.role !== 'super_admin') return null;
  return session;
}

// GET /api/monitor/stats — per-client monitoring stats for today
export async function GET(request) {
  const session = await requireSuperAdmin(request);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getAdminClient();

  // Get today's start in UTC
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  // Fetch all clients
  const { data: clients, error: clientsErr } = await db
    .from('clients')
    .select('id, name, industry, is_active')
    .order('name');

  if (clientsErr) return NextResponse.json({ error: clientsErr.message }, { status: 500 });

  // Fetch today's monitoring results
  const { data: results, error: resultsErr } = await db
    .from('monitoring_results')
    .select('client_id, overall_status, alerts_created, cost_usd, created_at')
    .gte('created_at', todayISO)
    .order('created_at', { ascending: false });

  if (resultsErr) {
    // Table may not exist yet
    return NextResponse.json({
      clients: (clients || []).map(c => ({
        client_id: c.id,
        client_name: c.name,
        industry: c.industry,
        last_analysis: null,
        overall_status: 'none',
        alerts_today: 0,
        analyses_today: 0,
        cost_today_usd: 0,
      })),
    });
  }

  // Group results by client
  const statsByClient = {};
  for (const r of (results || [])) {
    if (!statsByClient[r.client_id]) {
      statsByClient[r.client_id] = {
        last_analysis: r.created_at,
        last_status: r.overall_status,
        alerts_today: 0,
        analyses_today: 0,
        cost_today_usd: 0,
        has_critical: false,
        has_warning: false,
      };
    }
    const s = statsByClient[r.client_id];
    s.alerts_today += r.alerts_created || 0;
    s.analyses_today += 1;
    s.cost_today_usd += parseFloat(r.cost_usd || 0);
    if (r.overall_status === 'critical') s.has_critical = true;
    if (r.overall_status === 'warning') s.has_warning = true;
  }

  const clientStats = (clients || []).map(c => {
    const s = statsByClient[c.id];
    let overall_status = 'none';
    if (s) {
      if (s.has_critical) overall_status = 'critical';
      else if (s.has_warning) overall_status = 'warning';
      else overall_status = 'normal';
    }
    return {
      client_id: c.id,
      client_name: c.name,
      industry: c.industry,
      last_analysis: s?.last_analysis || null,
      overall_status,
      alerts_today: s?.alerts_today || 0,
      analyses_today: s?.analyses_today || 0,
      cost_today_usd: Math.round((s?.cost_today_usd || 0) * 1000000) / 1000000,
    };
  });

  return NextResponse.json({ clients: clientStats });
}
