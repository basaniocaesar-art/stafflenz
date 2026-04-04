import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { code, landing_page, referrer } = body;
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'code required' }, { status: 400 });
  }

  const cleanCode = code.toUpperCase().trim().slice(0, 50);
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';

  const db = getAdminClient();

  // Look up affiliate by code
  const { data: affiliate } = await db
    .from('affiliates')
    .select('id, status')
    .eq('code', cleanCode)
    .single();

  if (!affiliate || affiliate.status !== 'active') {
    return NextResponse.json({ valid: false });
  }

  // Record the click
  const { data: click } = await db
    .from('affiliate_clicks')
    .insert({
      affiliate_id: affiliate.id,
      affiliate_code: cleanCode,
      ip_address: ip,
      user_agent: userAgent.slice(0, 500),
      referrer: referrer?.slice(0, 500) || null,
      landing_page: landing_page?.slice(0, 500) || null,
    })
    .select('id')
    .single();

  // Increment click counter (non-blocking)
  db.from('affiliates')
    .update({ total_clicks: db.rpc ? undefined : undefined }) // handled by DB trigger
    .eq('id', affiliate.id);

  // Use rpc to safely increment
  await db.rpc('increment_affiliate_clicks', { aff_id: affiliate.id }).catch(() => {
    // Fallback: manual increment if RPC not available
    db.from('affiliates')
      .select('total_clicks')
      .eq('id', affiliate.id)
      .single()
      .then(({ data }) => {
        if (data) {
          db.from('affiliates')
            .update({ total_clicks: (data.total_clicks || 0) + 1 })
            .eq('id', affiliate.id);
        }
      });
  });

  return NextResponse.json({ valid: true, click_id: click?.id || null });
}
