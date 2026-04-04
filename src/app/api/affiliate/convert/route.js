import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { code, lead_email, lead_name, conversion_type = 'lead', click_id } = body;
  if (!code || !lead_email) {
    return NextResponse.json({ error: 'code and lead_email required' }, { status: 400 });
  }

  const cleanCode = code.toUpperCase().trim().slice(0, 50);
  const db = getAdminClient();

  // Look up affiliate
  const { data: affiliate } = await db
    .from('affiliates')
    .select('id, commission_rate, status')
    .eq('code', cleanCode)
    .single();

  if (!affiliate || affiliate.status !== 'active') {
    return NextResponse.json({ recorded: false, reason: 'invalid affiliate' });
  }

  // Avoid duplicate conversions for same email + affiliate
  const { data: existing } = await db
    .from('affiliate_conversions')
    .select('id')
    .eq('affiliate_id', affiliate.id)
    .eq('lead_email', lead_email.toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json({ recorded: false, reason: 'duplicate' });
  }

  // Record conversion
  await db.from('affiliate_conversions').insert({
    affiliate_id: affiliate.id,
    affiliate_code: cleanCode,
    lead_email: lead_email.toLowerCase().trim().slice(0, 200),
    lead_name: lead_name?.slice(0, 200) || null,
    conversion_type,
    commission_amount: null, // calculated when deal closes
    status: 'pending',
    click_id: click_id || null,
  });

  // Increment conversion counter
  await db
    .from('affiliates')
    .select('total_conversions')
    .eq('id', affiliate.id)
    .single()
    .then(({ data }) => {
      if (data) {
        return db.from('affiliates')
          .update({ total_conversions: (data.total_conversions || 0) + 1 })
          .eq('id', affiliate.id);
      }
    });

  return NextResponse.json({ recorded: true });
}
