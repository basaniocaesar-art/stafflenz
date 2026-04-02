import { NextResponse } from 'next/server';
import { getTokenFromRequest, deleteSession, clearSessionCookie } from '@/lib/auth';

export async function POST(request) {
  const token = getTokenFromRequest(request);
  await deleteSession(token);
  const response = NextResponse.json({ success: true });
  response.headers.set('Set-Cookie', clearSessionCookie());
  return response;
}

export async function GET(request) {
  return POST(request);
}
