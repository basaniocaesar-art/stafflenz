import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

// GET /api/billing/status
// Returns the caller's current subscription state + recent payment history.
// Used by the client billing portal page.

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session || !session.client) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminClient();

  const [{ data: client }, { data: plan }, { data: payments }] = await Promise.all([
    db
      .from('clients')
      .select('id, name, plan, subscription_status, trial_ends_at, current_period_end, razorpay_subscription_id, billing_email, billing_phone')
      .eq('id', session.client.id)
      .single(),
    db
      .from('plan_limits')
      .select('plan, price_inr, max_workers, max_cameras')
      .eq('plan', session.client.plan)
      .single(),
    db
      .from('payments')
      .select('id, amount_inr, currency, status, method, description, paid_at, created_at, error_description')
      .eq('client_id', session.client.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    client: client || null,
    plan: plan || null,
    payments: payments || [],
  });
}
