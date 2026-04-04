import crypto from 'crypto';
import { getAdminClient } from './supabase';

const SESSION_COOKIE = 'sl_aff_session';
const SESSION_DURATION_HOURS = 48;

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createAffiliateSession(affiliateId, ipAddress, userAgent) {
  const db = getAdminClient();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  const { error } = await db.from('affiliate_sessions').insert({
    affiliate_id: affiliateId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    ip_address: ipAddress || null,
    user_agent: userAgent?.slice(0, 500) || null,
  });

  if (error) throw new Error('Failed to create affiliate session');
  return token;
}

export async function verifyAffiliateSession(token) {
  if (!token) return null;
  const db = getAdminClient();
  const tokenHash = hashToken(token);

  const { data: session } = await db
    .from('affiliate_sessions')
    .select('id, affiliate_id, expires_at')
    .eq('token_hash', tokenHash)
    .single();

  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    await db.from('affiliate_sessions').delete().eq('id', session.id);
    return null;
  }

  const { data: affiliate } = await db
    .from('affiliates')
    .select('id, code, name, email, company, partner_type, commission_rate, status, total_clicks, total_conversions, total_earnings')
    .eq('id', session.affiliate_id)
    .single();

  if (!affiliate || affiliate.status !== 'active') return null;
  return { affiliate };
}

export async function deleteAffiliateSession(token) {
  if (!token) return;
  const db = getAdminClient();
  const tokenHash = hashToken(token);
  await db.from('affiliate_sessions').delete().eq('token_hash', tokenHash);
}

export function getAffiliateTokenFromRequest(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=')];
    })
  );
  return cookies[SESSION_COOKIE] || null;
}

export function buildAffiliateCookie(token, maxAge = SESSION_DURATION_HOURS * 3600) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function clearAffiliateCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export async function requireAffiliateAuth(request) {
  const token = getAffiliateTokenFromRequest(request);
  return verifyAffiliateSession(token);
}
