import { NextResponse } from 'next/server';
import { requireAffiliateAuth } from '@/lib/affiliate-auth';
import { getAdminClient } from '@/lib/supabase';

export async function GET(request) {
  const session = await requireAffiliateAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { affiliate } = session;
  const db = getAdminClient();

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'overview';

  if (view === 'clicks') {
    const { data: clicks } = await db
      .from('affiliate_clicks')
      .select('id, created_at, landing_page, referrer, ip_address')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(100);
    return NextResponse.json({ clicks: clicks || [] });
  }

  if (view === 'conversions') {
    const { data: conversions } = await db
      .from('affiliate_conversions')
      .select('id, created_at, lead_name, lead_email, conversion_type, commission_amount, status')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(100);
    return NextResponse.json({ conversions: conversions || [] });
  }

  // Default: overview — return affiliate profile + recent activity
  const [{ data: recentClicks }, { data: recentConversions }, { data: monthlyClicks }] = await Promise.all([
    db.from('affiliate_clicks')
      .select('id, created_at, landing_page, referrer')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(10),
    db.from('affiliate_conversions')
      .select('id, created_at, lead_name, lead_email, conversion_type, commission_amount, status')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(10),
    db.from('affiliate_clicks')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  // Earnings breakdown
  const { data: allConversions } = await db
    .from('affiliate_conversions')
    .select('commission_amount, status')
    .eq('affiliate_id', affiliate.id);

  const pendingEarnings = (allConversions || [])
    .filter((c) => c.status === 'pending' && c.commission_amount)
    .reduce((sum, c) => sum + parseFloat(c.commission_amount), 0);

  const paidEarnings = (allConversions || [])
    .filter((c) => c.status === 'paid' && c.commission_amount)
    .reduce((sum, c) => sum + parseFloat(c.commission_amount), 0);

  return NextResponse.json({
    affiliate,
    stats: {
      total_clicks: affiliate.total_clicks || 0,
      total_conversions: affiliate.total_conversions || 0,
      monthly_clicks: monthlyClicks?.length || 0,
      pending_earnings: pendingEarnings.toFixed(2),
      paid_earnings: paidEarnings.toFixed(2),
      total_earnings: (pendingEarnings + paidEarnings).toFixed(2),
    },
    recent_clicks: recentClicks || [],
    recent_conversions: recentConversions || [],
  });
}
