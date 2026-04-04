import { NextResponse } from 'next/server';
import { getAffiliateTokenFromRequest, deleteAffiliateSession, clearAffiliateCookie } from '@/lib/affiliate-auth';

export async function POST(request) {
  const token = getAffiliateTokenFromRequest(request);
  await deleteAffiliateSession(token);
  const response = NextResponse.json({ success: true });
  response.headers.set('Set-Cookie', clearAffiliateCookie());
  return response;
}
