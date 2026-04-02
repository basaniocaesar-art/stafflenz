import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminClient } from '@/lib/supabase';
import { createSession, buildSessionCookie } from '@/lib/auth';

// Simple in-memory rate limiter (resets on serverless cold start)
const attempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 10;
  const key = `login:${ip}`;
  const entry = attempts.get(key) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
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
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const db = getAdminClient();
  const { data: user } = await db
    .from('users')
    .select('id, email, password_hash, role, full_name, client_id, is_active')
    .eq('email', email.toLowerCase().trim())
    .single();

  // Use constant-time comparison to prevent timing attacks
  const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxxxxxxxxxx';
  const hashToCompare = user?.password_hash || dummyHash;
  const match = await bcrypt.compare(password, hashToCompare);

  if (!user || !match || !user.is_active) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  // Get client info if applicable
  let client = null;
  if (user.client_id) {
    const { data } = await db
      .from('clients')
      .select('id, name, industry, plan, is_active')
      .eq('id', user.client_id)
      .single();
    if (!data?.is_active) {
      return NextResponse.json({ error: 'Account suspended. Contact support.' }, { status: 403 });
    }
    client = data;
  }

  const token = await createSession(
    user.id,
    ip,
    request.headers.get('user-agent') || ''
  );

  const responseData = {
    user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    client,
  };

  const response = NextResponse.json({ success: true, ...responseData }, { status: 200 });
  response.headers.set('Set-Cookie', buildSessionCookie(token));
  return response;
}
