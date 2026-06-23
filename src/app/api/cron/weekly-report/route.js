// Sunday-night weekly report email. Vercel cron calls this once a week.
// For each active client, calls /api/reports/weekly to get the aggregated
// data, then emails a rich HTML summary to every client_admin (and the
// super admin gets one per client they own).
//
// Auth: CRON_SECRET (Vercel cron header) OR INTERNAL_SECRET (manual test).

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stafflenz.com';

function isAuthorized(request) {
  if (request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET) return true;
  return false;
}

function scoreColor(name, value) {
  if (name === 'Risk') {
    return value === 'High' ? '#dc2626' : value === 'Medium' ? '#d97706' : '#16a34a';
  }
  const v = Number(value);
  if (!Number.isFinite(v)) return '#6b7280';
  if (v >= 80) return '#16a34a';
  if (v >= 50) return '#d97706';
  return '#dc2626';
}

function fmt(n) { return (n === null || n === undefined) ? '—' : `${n}%`; }

function renderEmailHtml(report, recipientName) {
  const periodLabel = `${new Date(report.period.start).toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${new Date(report.period.end).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const greeting = recipientName ? `Hi ${recipientName.split(' ')[0]},` : 'Hi,';
  const tiles = [
    { label: 'Coverage',   value: fmt(report.scores.coverageScore) },
    { label: 'Compliance', value: fmt(report.scores.complianceScore) },
    { label: 'Engagement', value: fmt(report.scores.engagementScore) },
    { label: 'Risk',       value: report.scores.riskLevel },
  ];

  const zoneRows = report.zoneScores.slice(0, 6).map((z) => {
    const c = scoreColor('Coverage', z.coverage);
    return `<tr>
      <td style="padding:6px 0;color:#374151;font-size:13px;">${z.name}</td>
      <td style="padding:6px 0;text-align:right;font-weight:700;font-size:13px;color:${c};">${z.coverage}%</td>
      <td style="padding:6px 12px 6px 6px;text-align:right;color:#9ca3af;font-size:11px;font-family:ui-monospace,Menlo,monospace;">${z.observations} obs</td>
    </tr>`;
  }).join('');

  const recRows = report.recommendations.map((r) => `
    <div style="margin:0 0 10px 0;padding:10px 12px;background:#f9fafb;border-left:3px solid ${r.severity === 'high' ? '#dc2626' : r.severity === 'medium' ? '#d97706' : '#16a34a'};border-radius:0 6px 6px 0;">
      <div style="font-weight:700;font-size:13px;color:#111827;">${r.title}</div>
      <div style="font-size:12px;color:#4b5563;margin-top:3px;line-height:1.5;">${r.detail}</div>
    </div>
  `).join('');

  const tileCells = tiles.map((t) => {
    const c = scoreColor(t.label, t.label === 'Risk' ? t.value : Number(String(t.value).replace('%','')));
    return `<td width="25%" align="center" style="padding:14px 6px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#6b7280;">${t.label}</div>
      <div style="font-size:32px;font-weight:800;color:${c};margin-top:4px;">${t.value}</div>
    </td>`;
  }).join('<td width="8"></td>');

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Inter,sans-serif;color:#111827;">
  <div style="max-width:600px;margin:0 auto;background:white;">
    <div style="padding:24px 28px;border-bottom:1px solid #e5e7eb;">
      <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#2563eb;font-weight:700;">Weekly AI Workforce Report</div>
      <h1 style="margin:6px 0 0 0;font-size:24px;color:#111827;">${report.client?.name || 'Operations Report'}</h1>
      ${report.location ? `<div style="font-size:14px;color:#6b7280;margin-top:2px;">${report.location.name}</div>` : ''}
      <div style="font-size:12px;color:#9ca3af;margin-top:8px;">${periodLabel}</div>
    </div>

    <div style="padding:20px 28px;font-size:14px;line-height:1.6;color:#374151;">
      <p style="margin:0 0 12px 0;">${greeting}</p>
      <p style="margin:0;">Here's how your operations looked last week, based on what StaffLenz saw on camera.</p>
    </div>

    <div style="padding:0 20px 8px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${tileCells}</tr></table>
    </div>

    ${report.zoneScores.length > 0 ? `
    <div style="padding:16px 28px 4px 28px;">
      <div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#6b7280;font-weight:700;margin-bottom:8px;">Coverage by Business Area</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">${zoneRows}</table>
    </div>` : ''}

    <div style="padding:16px 28px;">
      <div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#6b7280;font-weight:700;margin-bottom:8px;">Recommendations</div>
      ${recRows}
    </div>

    <div style="padding:8px 28px 24px 28px;text-align:center;">
      <a href="${APP_URL}/report/weekly${report.location?.id ? `?location=${report.location.id}` : ''}"
         style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;font-weight:700;border-radius:8px;font-size:14px;">
        View full report →
      </a>
      <div style="font-size:11px;color:#9ca3af;margin-top:10px;">Includes 7-day activity table, top incidents, and printable PDF</div>
    </div>

    <div style="padding:16px 28px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;line-height:1.5;">
      Generated by StaffLenz · Your CCTV, turned into a manager.<br/>
      Reply to this email if anything looks wrong, or visit
      <a href="${APP_URL}/dashboard" style="color:#2563eb;text-decoration:none;">stafflenz.com</a> anytime.
    </div>
  </div>
</body></html>`;
}

async function sendResend({ to, subject, html, replyTo }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[weekly-report] RESEND_API_KEY missing — skipping send to', to);
    return { skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'StaffLenz <reports@stafflenz.com>',
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[weekly-report] Resend error', res.status, detail);
    return { ok: false, status: res.status };
  }
  return { ok: true };
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getAdminClient();

  // All active clients with at least one client_admin to email
  const { data: clients } = await db
    .from('clients')
    .select('id, name')
    .eq('is_active', true);

  const sent = [];
  const skipped = [];

  for (const c of (clients || [])) {
    // Find client_admin recipients for this client
    const { data: admins } = await db
      .from('users')
      .select('email, full_name')
      .eq('client_id', c.id)
      .eq('role', 'client_admin')
      .eq('is_active', true);

    if (!admins || admins.length === 0) {
      skipped.push({ client: c.name, reason: 'no client_admin users' });
      continue;
    }

    // Fetch report data via the same endpoint the UI uses
    const reportRes = await fetch(`${APP_URL}/api/reports/weekly?client_id=${c.id}`, {
      headers: { 'x-internal-secret': process.env.INTERNAL_SECRET },
      cache: 'no-store',
    });
    if (!reportRes.ok) {
      skipped.push({ client: c.name, reason: `report fetch ${reportRes.status}` });
      continue;
    }
    const report = await reportRes.json();

    // Skip clients with literally zero activity in the week
    if (!report.counts.totalObservations && report.counts.totalAlerts === 0) {
      skipped.push({ client: c.name, reason: 'no activity this week' });
      continue;
    }

    const subject = `📊 StaffLenz Weekly Report · ${c.name} · ${new Date(report.period.end).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;

    for (const a of admins) {
      if (!a.email) continue;
      const html = renderEmailHtml(report, a.full_name);
      const out = await sendResend({ to: a.email, subject, html });
      sent.push({ client: c.name, to: a.email, ok: !!out.ok });
    }
  }

  return NextResponse.json({ ok: true, sent_count: sent.filter(s => s.ok).length, sent, skipped });
}
