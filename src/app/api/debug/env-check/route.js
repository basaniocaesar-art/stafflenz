// Tiny diagnostic endpoint — confirms which integration env vars are present
// in the running Vercel deployment. Does NOT leak values, only presence.
// Protected by INTERNAL_SECRET so it can't be abused publicly.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (request.headers.get('x-internal-secret') !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const checks = {
    FACE_ID_SERVICE_URL: {
      set: Boolean(process.env.FACE_ID_SERVICE_URL),
      length: (process.env.FACE_ID_SERVICE_URL || '').length,
      preview: (process.env.FACE_ID_SERVICE_URL || '').slice(0, 30),
    },
    INTERNAL_SECRET: { set: Boolean(process.env.INTERNAL_SECRET) },
    ANTHROPIC_API_KEY: { set: Boolean(process.env.ANTHROPIC_API_KEY) },
    NEXT_PUBLIC_SUPABASE_URL: { set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    SUPABASE_SERVICE_ROLE_KEY: { set: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
  };

  return NextResponse.json({
    deployment_age_sec: Math.floor((Date.now() - (process.env.VERCEL_DEPLOYMENT_TIMESTAMP || Date.now())) / 1000),
    vercel_env: process.env.VERCEL_ENV || 'unknown',
    vercel_region: process.env.VERCEL_REGION || 'unknown',
    checks,
  });
}
