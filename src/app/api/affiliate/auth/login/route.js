import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminClient } from '@/lib/supabase';
import { createAffiliateSession, buildAffiliateCookie } from '@/lib/affiliate-auth';

const attempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 8;
  const key = `aff_login:${ip}`;
  const entry = attempts.get(key) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) { attempts.set(key, { count: 1, reset: now + windowMs }); return true; }
  if (entry.count >= maxAttempts) return false;
  entry.count++;
  attempts.set(key, entry);
  return true;
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 });
  }

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const db = getAdminClient();
  const { data: affiliate } = await db
    .from('affiliates')
    .select('id, email, password_hash, name, status')
    .eq('email', email.toLowerCase().trim())
    .single();

  const dummyHash = '$2a$12$dummyhashtopreventtimingattacksxxxxxxxxxxxxxxxxxxxxxxx';
  const hashToCompare = affiliate?.password_hash || dummyHash;
  const match = await bcrypt.compare(password, hashToCompare);

  if (!affiliate || !match) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  if (affiliate.status !== 'active') {
    return NextResponse.json({ error: 'Your affiliate account is not active yet. Please contact support.' }, { status: 403 });
  }

  const token = await createAffiliateSession(
    affiliate.id,
    ip,
    request.headers.get('user-agent') || ''
  );

  const response = NextResponse.json({ success: true, name: affiliate.name });
  response.headers.set('Set-Cookie', buildAffiliateCookie(token));
  return response;
}
