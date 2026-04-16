import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminClient } from '@/lib/supabase';
import { createSession, buildSessionCookie } from '@/lib/auth';

// POST /api/auth/signup
// Public self-service signup: creates a client in 'trialing' state + a
// client_admin user + session cookie. Does NOT touch Razorpay — the user
// will be redirected to /signup/checkout which hits /api/billing/create-subscription
// only when they click "Start Paid Plan" (either now or after the 14-day trial).

export const dynamic = 'force-dynamic';

const TRIAL_DAYS = 14;
const VALID_INDUSTRIES = ['factory', 'hotel', 'school', 'retail'];
const VALID_PLANS = ['starter', 'standard', 'pro', 'scale', 'enterprise'];

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const {
    company_name,
    industry,
    plan,
    admin_email,
    admin_password,
    admin_name,
    phone,
  } = body;

  if (!company_name || !industry || !admin_email || !admin_password || !admin_name) {
    return NextResponse.json(
      { error: 'company_name, industry, admin_email, admin_password, admin_name are all required' },
      { status: 400 }
    );
  }
  if (!VALID_INDUSTRIES.includes(industry)) {
    return NextResponse.json({ error: `industry must be one of ${VALID_INDUSTRIES.join(', ')}` }, { status: 400 });
  }
  if (admin_password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  const chosenPlan = VALID_PLANS.includes(plan) ? plan : 'standard';

  const db = getAdminClient();

  // Detect country via the Vercel edge header so we can auto-pick the
  // right payment provider on checkout. Falls back to IN if nothing set.
  const country = (request.headers.get('x-vercel-ip-country') || 'IN').toUpperCase();
  const defaultCurrency = country === 'IN' ? 'INR' : 'USD';
  const defaultProvider = country === 'IN' ? 'razorpay' : 'stripe';

  // Create client first
  const trialEnds = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: client, error: clientErr } = await db
    .from('clients')
    .insert({
      name: company_name,
      industry,
      plan: chosenPlan,
      subscription_status: 'trialing',
      trial_ends_at: trialEnds,
      billing_email: admin_email.toLowerCase().trim(),
      billing_phone: phone || null,
      billing_country: country,
      billing_currency: defaultCurrency,
      payment_provider: defaultProvider,
    })
    .select()
    .single();

  if (clientErr) {
    return NextResponse.json({ error: clientErr.message }, { status: 500 });
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(admin_password, 12);
  const { data: user, error: userErr } = await db
    .from('users')
    .insert({
      client_id: client.id,
      email: admin_email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: 'client_admin',
      full_name: admin_name,
    })
    .select('id, email, role, full_name, client_id')
    .single();

  if (userErr) {
    // Roll the client back so duplicate-email retries don't leave orphans.
    await db.from('clients').delete().eq('id', client.id);
    if (userErr.code === '23505') {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }

  // Issue a session cookie so the user lands on /dashboard signed-in.
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const userAgent = request.headers.get('user-agent') || null;
  const token = await createSession(user.id, ipAddress, userAgent);

  const res = NextResponse.json({
    ok: true,
    client: { id: client.id, name: client.name, plan: client.plan, trial_ends_at: trialEnds },
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    next: '/signup/checkout',
  }, { status: 201 });
  res.headers.set('Set-Cookie', buildSessionCookie(token));
  return res;
}
