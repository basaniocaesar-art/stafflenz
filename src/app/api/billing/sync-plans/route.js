import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { createPlan } from '@/lib/razorpay';

// POST /api/billing/sync-plans
// Idempotent: for every row in plan_limits without a razorpay_plan_id,
// create a Razorpay Plan object and persist the returned id. Run once
// after configuring Razorpay credentials and every time you add/rename a plan.
// Only super_admin may call this.

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await requireAuth(request);
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getAdminClient();

  const { data: plans, error } = await db
    .from('plan_limits')
    .select('id, plan, price_inr, max_workers, max_cameras, razorpay_plan_id, billing_period')
    .order('price_inr', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const p of plans || []) {
    if (p.razorpay_plan_id) {
      results.push({ plan: p.plan, status: 'already_synced', razorpay_plan_id: p.razorpay_plan_id });
      continue;
    }
    try {
      const rpPlan = await createPlan({
        name: `StaffLenz ${p.plan.charAt(0).toUpperCase() + p.plan.slice(1)}`,
        amountInPaise: p.price_inr * 100,
        description: `Up to ${p.max_workers} workers, ${p.max_cameras} cameras`,
        period: p.billing_period === 'yearly' ? 'yearly' : 'monthly',
      });
      await db.from('plan_limits').update({ razorpay_plan_id: rpPlan.id }).eq('id', p.id);
      results.push({ plan: p.plan, status: 'created', razorpay_plan_id: rpPlan.id });
    } catch (e) {
      results.push({ plan: p.plan, status: 'error', error: e.message });
    }
  }

  return NextResponse.json({ ok: true, results });
}
