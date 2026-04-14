import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { cancelSubscription } from '@/lib/razorpay';

// POST /api/billing/cancel
// Cancels the caller's current Razorpay subscription at the end of the
// current billing cycle (user keeps access until current_period_end).

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await requireAuth(request);
  if (!session || !session.client) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'client_admin' && session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only client admins can cancel billing' }, { status: 403 });
  }

  const db = getAdminClient();
  const { data: client } = await db
    .from('clients')
    .select('id, razorpay_subscription_id, subscription_status')
    .eq('id', session.client.id)
    .single();

  if (!client?.razorpay_subscription_id) {
    return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 404 });
  }

  try {
    await cancelSubscription(client.razorpay_subscription_id, /* cancelAtCycleEnd */ true);
  } catch (e) {
    return NextResponse.json({ error: `Razorpay cancel failed: ${e.message}` }, { status: 502 });
  }

  // Optimistic local update — the webhook will confirm.
  await db
    .from('clients')
    .update({ subscription_status: 'cancelled' })
    .eq('id', client.id);

  return NextResponse.json({ ok: true, cancel_at_cycle_end: true });
}
