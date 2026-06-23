// Every 30 minutes, snapshot how many people are on camera per location.
// Writes one row per active location to presence_snapshots.
//
// Definitions:
//   workers_present       — distinct named workers seen in the last 5 minutes
//   workers_seen_today    — distinct named workers seen since 00:00 local
//   workers_left          — names seen earlier today but NOT in the last 5 min
//   visitors_visible      — max number of unmatched ("Unknown Person") observations
//                           in any single minute within the last 5 minutes
//
// Auth: CRON_SECRET (Vercel cron) or INTERNAL_SECRET (manual test).

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request) {
  if (request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET) return true;
  return false;
}

const isReal = (n) => {
  const x = (n || '').toLowerCase().trim();
  return x && x !== 'unknown person' && x !== 'unknown' && x !== 'n/a';
};

/**
 * Walk timeline rows and return:
 *   names: Set<string> of distinct named workers seen
 *   visitorPeak: max # of unmatched observations in any single minute
 */
function aggregate(timelines) {
  const names = new Set();
  let visitorPeak = 0;

  for (const tl of (timelines || [])) {
    const body = tl.timeline || tl;
    for (const camWindow of (body?.timeline || [])) {
      for (const minute of (camWindow.minutes || [])) {
        let unknownsThisMinute = 0;
        for (const p of (minute.people || [])) {
          if (isReal(p.worker_name)) names.add(p.worker_name);
          else unknownsThisMinute++;
        }
        if (unknownsThisMinute > visitorPeak) visitorPeak = unknownsThisMinute;
      }
    }
  }
  return { names, visitorPeak };
}

export async function GET(request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getAdminClient();
  const now = new Date();
  const FIVE_MIN_AGO = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const TODAY_START  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // Get every active (non-paused) location
  const { data: locations } = await db
    .from('locations')
    .select('id, client_id, name, monitoring_paused')
    .eq('is_active', true);

  const results = [];

  for (const loc of (locations || [])) {
    if (loc.monitoring_paused) {
      results.push({ location: loc.name, skipped: 'paused' });
      continue;
    }

    // Last 5 min — who's on camera now
    const { data: recent } = await db
      .from('activity_timeline')
      .select('timeline')
      .eq('location_id', loc.id)
      .gte('window_end', FIVE_MIN_AGO);
    const recentAgg = aggregate(recent);

    // Today so far — who was seen at any point
    const { data: today } = await db
      .from('activity_timeline')
      .select('timeline')
      .eq('location_id', loc.id)
      .gte('window_end', TODAY_START);
    const todayAgg = aggregate(today);

    const presentNames = [...recentAgg.names].sort();
    const seenTodayNames = [...todayAgg.names].sort();
    const leftNames = seenTodayNames.filter((n) => !recentAgg.names.has(n));

    const row = {
      client_id: loc.client_id,
      location_id: loc.id,
      captured_at: now.toISOString(),
      workers_present: presentNames.length,
      workers_present_names: presentNames,
      workers_seen_today: seenTodayNames.length,
      workers_left: leftNames.length,
      workers_left_names: leftNames,
      visitors_visible: recentAgg.visitorPeak,
    };

    const { error } = await db.from('presence_snapshots').insert(row);
    if (error) {
      results.push({ location: loc.name, error: error.message });
    } else {
      results.push({
        location: loc.name,
        present: presentNames.length,
        seen_today: seenTodayNames.length,
        left: leftNames.length,
        visitors: recentAgg.visitorPeak,
      });
    }
  }

  return NextResponse.json({ ok: true, captured_at: now.toISOString(), results });
}
