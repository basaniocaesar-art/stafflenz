import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// ═══════════════════════════════════════════════════════════════════════════════
// SMTP Test — sends a diagnostic email to the DVR mailbox from the Vercel side.
// Isolates whether the break is in the DVR → mail server hop or in the mail
// server / IMAP pickup. If this route succeeds and email-receiver picks the
// message up on the next poll, the whole server-side pipeline is healthy and
// the DVR's SMTP config (host/port/auth/network) is the remaining variable.
// ═══════════════════════════════════════════════════════════════════════════════

function isAuthorized(request) {
  const cron = request.headers.get('authorization');
  if (cron === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET) return true;
  return false;
}

// 1x1 red JPEG — gives the email-receiver an image attachment to exercise the
// full extract → stitch → Claude path, not just the IMAP fetch.
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy' +
  'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIA' +
  'AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA' +
  'AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3' +
  'ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm' +
  'p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMB' +
  'AAIRAxEAPwD3+iiigD//2Q==';

async function runSmtpTest({ host, port, user, pass, from, to, subject }) {
  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // cPanel certs often mismatch the mail.<domain> hostname — same reason
    // the IMAP client in email-receiver disables hostname checks.
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    logger: false,
  });

  const verifyStart = Date.now();
  await transporter.verify();
  const verifyMs = Date.now() - verifyStart;

  const sendStart = Date.now();
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: 'LenzAI SMTP diagnostic — if you can see this, the server-side SMTP path works.',
    attachments: [
      {
        filename: 'smtp-test.jpg',
        content: Buffer.from(TINY_JPEG_BASE64, 'base64'),
        contentType: 'image/jpeg',
      },
    ],
  });
  const sendMs = Date.now() - sendStart;

  transporter.close();

  return {
    verified: true,
    verifyMs,
    sendMs,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  const host = searchParams.get('host') || process.env.DVR_SMTP_HOST || process.env.DVR_IMAP_HOST || 'mail.lenzai.org';
  const port = Number(searchParams.get('port') || process.env.DVR_SMTP_PORT || 465);
  const user = process.env.DVR_IMAP_USER;
  const pass = process.env.DVR_IMAP_PASSWORD;
  const to = searchParams.get('to') || user;
  const from = searchParams.get('from') || user;
  const subject = searchParams.get('subject') || `SMTP diagnostic ${new Date().toISOString()}`;

  if (!user || !pass) {
    return NextResponse.json(
      { error: 'DVR_IMAP_USER / DVR_IMAP_PASSWORD env vars not set' },
      { status: 400 }
    );
  }

  try {
    const result = await runSmtpTest({ host, port, user, pass, from, to, subject });
    return NextResponse.json({
      ok: true,
      config: { host, port, secure: port === 465, user, from, to, subject },
      result,
      next_step:
        'Trigger /api/monitor/email-receiver to confirm IMAP pickup sees this test message.',
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        config: { host, port, secure: port === 465, user, from, to },
        error: err.message,
        code: err.code || null,
        command: err.command || null,
        response: err.response || null,
        responseCode: err.responseCode || null,
        stack: err.stack?.split('\n').slice(0, 5).join('\n') || null,
      },
      { status: 500 }
    );
  }
}

export const POST = GET;
