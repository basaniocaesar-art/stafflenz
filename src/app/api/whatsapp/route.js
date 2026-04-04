import { NextResponse } from 'next/server';
import { sendWhatsApp, alertMessage } from '@/lib/whatsapp';
import { getSession } from '@/lib/auth';

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to, type, details } = await request.json();

  if (!to) return NextResponse.json({ error: 'Missing phone number' }, { status: 400 });

  const message = alertMessage(type || 'custom', details || {});
  const result = await sendWhatsApp(to, message);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ ok: true, sid: result.sid });
}
