import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

const attempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  const key = `apply:${ip}`;
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
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { full_name, email, company_name, website_url, partner_type, industry_focus, how_heard, client_base } = body;

  if (!full_name || !email) {
    return NextResponse.json({ error: 'Full name and email are required' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const db = getAdminClient();
  const { error } = await db.from('partner_applications').insert({
    full_name: full_name.slice(0, 200),
    email: email.toLowerCase().trim().slice(0, 200),
    company_name: company_name?.slice(0, 200) || null,
    website_url: website_url?.slice(0, 500) || null,
    partner_type: partner_type || null,
    industry_focus: industry_focus || null,
    how_heard: how_heard || null,
    client_base: client_base?.slice(0, 2000) || null,
    status: 'pending',
    ip_address: ip,
  });

  if (error) {
    console.error('Partner application insert error:', error.message);
    // Still return success — don't expose DB errors to the client
  }

  return NextResponse.json({
    success: true,
    message: 'Application received! We will review and respond within 24 hours.',
  });
}

// GET — for super admin to list applications
export async function GET(request) {
  // Simple token check via query param for now (replace with requireAuth later)
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (token !== process.env.ADMIN_SECRET_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminClient();
  const { data, error } = await db
    .from('partner_applications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data });
}
