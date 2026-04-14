import crypto from 'crypto';
import { getAdminClient } from './supabase';

const SESSION_COOKIE = 'sl_session';
const SESSION_DURATION_HOURS = 24;

// Generate a random session token
export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// SHA-256 hash of token for storage
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Create a session in DB and return the raw token
export async function createSession(userId, ipAddress, userAgent) {
  const db = getAdminClient();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  const { error } = await db.from('sessions').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (error) throw new Error('Failed to create session');

  // Update last_login_at
  await db.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', userId);

  return token;
}

// Verify session token from cookie — returns { user, client } or null
export async function verifySession(token) {
  if (!token) return null;

  const db = getAdminClient();
  const tokenHash = hashToken(token);

  const { data: session, error } = await db
    .from('sessions')
    .select('id, user_id, expires_at')
    .eq('token_hash', tokenHash)
    .single();

  if (error || !session) return null;
  if (new Date(session.expires_at) < new Date()) {
    // Expired — delete it
    await db.from('sessions').delete().eq('id', session.id);
    return null;
  }

  const { data: user } = await db
    .from('users')
    .select('id, email, role, full_name, client_id, is_active')
    .eq('id', session.user_id)
    .single();

  if (!user || !user.is_active) return null;

  let client = null;
  if (user.client_id) {
    const { data } = await db
      .from('clients')
      .select('id, name, industry, plan, is_active, subscription_status, trial_ends_at, current_period_end')
      .eq('id', user.client_id)
      .single();
    client = data;
  }

  return { user, client };
}

// Delete session
export async function deleteSession(token) {
  if (!token) return;
  const db = getAdminClient();
  const tokenHash = hashToken(token);
  await db.from('sessions').delete().eq('token_hash', tokenHash);
}

// Extract token from request cookie header
export function getTokenFromRequest(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
  return cookies[SESSION_COOKIE] || null;
}

// Build Set-Cookie header string
export function buildSessionCookie(token, maxAge = SESSION_DURATION_HOURS * 3600) {
  const isLocal = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost');
  return `${SESSION_COOKIE}=${token}; HttpOnly; ${isLocal ? '' : 'Secure; '}SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

// Helper: require auth in API routes. Returns {user, client} or sends 401 response.
export async function requireAuth(request) {
  const token = getTokenFromRequest(request);
  const session = await verifySession(token);
  return session;
}

// Helper: subscription gating. Returns one of:
//   'ok'           — trialing (trial still valid) or active subscription
//   'trial_expired'— was on trial, trial end date passed, not paid
//   'past_due'     — subscription exists but payment failed
//   'cancelled'    — user cancelled
//   'no_client'    — super_admin or no client attached
//
// Call from page server components / API routes to redirect the user to
// /billing when their subscription isn't in good standing. Kept separate
// from requireAuth so authenticated-but-unpaid users can still reach the
// billing portal and pay.
export function subscriptionState(client) {
  if (!client) return 'no_client';
  const status = client.subscription_status || 'trialing';
  if (status === 'active') return 'ok';
  if (status === 'trialing') {
    if (!client.trial_ends_at) return 'ok';
    return new Date(client.trial_ends_at) > new Date() ? 'ok' : 'trial_expired';
  }
  if (status === 'past_due') return 'past_due';
  if (status === 'cancelled') return 'cancelled';
  return 'trial_expired';
}
