import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { upsertProductAndPrice } from '@/lib/stripe';

// POST /api/billing/stripe/sync-plans
// Idempotent: for every row in plan_limits without a stripe_price_id,
// create (or find) a Stripe Product and Price, then persist the IDs.
// Super-admin only.

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await requireAuth(request);
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getAdminClient();
  const { data: plans, error } = await db
    .from('plan_limits')
    .select('id, plan, price_usd, max_workers, max_cameras, stripe_price_id, stripe_product_id')
    .order('price_usd', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const p of plans || []) {
    if (!p.price_usd) {
      results.push({ plan: p.plan, status: 'skipped', reason: 'no price_usd set' });
      continue;
    }
    if (p.stripe_price_id) {
      results.push({ plan: p.plan, status: 'already_synced', stripe_price_id: p.stripe_price_id });
      continue;
    }
    try {
      const { product, price } = await upsertProductAndPrice({
        name: `StaffLenz ${p.plan.charAt(0).toUpperCase() + p.plan.slice(1)}`,
        description: `Up to ${p.max_workers} workers, ${p.max_cameras} cameras`,
        amountUsd: p.price_usd,
      });
      await db
        .from('plan_limits')
        .update({ stripe_price_id: price.id, stripe_product_id: product.id })
        .eq('id', p.id);
      results.push({
        plan: p.plan,
        status: 'synced',
        stripe_product_id: product.id,
        stripe_price_id: price.id,
      });
    } catch (e) {
      results.push({ plan: p.plan, status: 'error', error: e.message });
    }
  }

  return NextResponse.json({ ok: true, results });
}
