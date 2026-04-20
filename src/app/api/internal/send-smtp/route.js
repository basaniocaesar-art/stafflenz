import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// POST /api/internal/send-smtp
// Internal-only SMTP proxy. Called by lib/email.js sendViaSMTP() to
// send emails via the Verpex/cPanel mail server. Isolated in its own
// route so nodemailer's native crypto deps don't break the webpack
// build when email.js is imported by client-side pages.

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const secret = request.headers.get('x-internal-secret');
  if (secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { to, subject, html, replyTo } = await request.json().catch(() => ({}));
  if (!to || !subject) {
    return NextResponse.json({ error: 'to and subject required' }, { status: 400 });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json({ error: 'SMTP not configured', skipped: true });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_PORT || '465') === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `LenzAI <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      replyTo: replyTo || undefined,
    });

    transporter.close();
    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    return NextResponse.json({ error: true, message: err.message }, { status: 500 });
  }
}
