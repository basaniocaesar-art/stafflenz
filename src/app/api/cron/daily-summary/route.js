import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { sendWhatsApp } from '@/lib/whatsapp';

// GET /api/cron/daily-summary
// Vercel cron calls this at 10 PM IST every day. For each active client
// with a whatsapp_notify number, sends a daily summary:
//   - Staff attendance (who came, who didn't, hours worked)
//   - Total alerts fired today
//   - AI analysis cost today
// Auth: Vercel cron header OR internal secret.

export const dynamic = 'force-dynamic';

const BREAK_GAP_MINUTES = 15;

function isAuthorized(request) {
  const cron = request.headers.get('authorization');
  if (cron === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET) return true;
  return false;
}

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const dayStart = `${today}T00:00:00Z`;
  const dayEnd = `${today}T23:59:59Z`;

  // Get all active clients with WhatsApp number
  const { data: clients } = await db
    .from('clients')
    .select('id, name, whatsapp_notify, analysis_config')
    .eq('is_active', true);

  const results = [];

  for (const client of (clients || [])) {
    const whatsappNumber = client.analysis_config?.whatsapp_number || client.whatsapp_notify;
    if (!whatsappNumber) {
      results.push({ client: client.name, status: 'skipped', reason: 'no WhatsApp number' });
      continue;
    }

    try {
      // Get workers
      const { data: workers } = await db.from('workers')
        .select('id, full_name')
        .eq('client_id', client.id).eq('is_active', true).is('deleted_at', null);

      // Get today's events for named workers
      const { data: events } = await db.from('worker_events')
        .select('worker_name, worker_id, occurred_at')
        .eq('client_id', client.id)
        .gte('occurred_at', dayStart).lte('occurred_at', dayEnd)
        .neq('worker_name', 'Unknown Person')
        .order('occurred_at');

      // Calculate per-worker attendance
      const byWorker = {};
      for (const e of (events || [])) {
        const name = e.worker_name;
        if (!byWorker[name]) byWorker[name] = [];
        byWorker[name].push(new Date(e.occurred_at));
      }

      const staffLines = [];
      const presentNames = new Set();

      for (const w of (workers || [])) {
        const times = byWorker[w.full_name];
        if (!times || times.length === 0) {
          staffLines.push(`🔴 ${w.full_name} — absent`);
          continue;
        }
        presentNames.add(w.full_name);
        const first = times[0];
        const last = times[times.length - 1];
        const totalMin = Math.round((last - first) / 60000);
        // Count breaks
        let breakMin = 0;
        for (let i = 0; i < times.length - 1; i++) {
          const gap = (times[i + 1] - times[i]) / 60000;
          if (gap >= BREAK_GAP_MINUTES) breakMin += Math.round(gap);
        }
        const activeMin = Math.max(0, totalMin - breakMin);
        const inTime = first.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const outTime = last.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        staffLines.push(`✅ ${w.full_name} — ${inTime} to ${outTime} · ${formatDuration(activeMin)}`);
      }

      // Alerts count
      const { count: alertCount } = await db.from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .gte('created_at', dayStart).lte('created_at', dayEnd);

      // Cost today
      const { data: costData } = await db.from('activity_timeline')
        .select('cost_usd')
        .eq('client_id', client.id)
        .gte('window_start', dayStart);
      const totalCost = (costData || []).reduce((s, r) => s + (r.cost_usd || 0), 0);

      const present = presentNames.size;
      const absent = (workers || []).length - present;

      const message = [
        `📊 *Your Day — ${client.name}*`,
        `${today}`,
        '',
        `👥 Staff: ${present} present · ${absent} absent`,
        '',
        ...staffLines,
        '',
        alertCount > 0 ? `⚠️ ${alertCount} alert${alertCount > 1 ? 's' : ''} today` : '✅ No alerts today',
        '',
        `📱 Full details at lenzai.org/attendance`,
      ].join('\n');

      const sendResult = await sendWhatsApp(whatsappNumber, message);
      results.push({
        client: client.name,
        status: sendResult.ok ? 'sent' : 'failed',
        present,
        absent,
        alerts: alertCount,
        error: sendResult.error || null,
      });
    } catch (e) {
      results.push({ client: client.name, status: 'error', error: e.message });
    }
  }

  return NextResponse.json({
    ok: true,
    date: today,
    clients_processed: results.length,
    sent: results.filter(r => r.status === 'sent').length,
    results,
  });
}
