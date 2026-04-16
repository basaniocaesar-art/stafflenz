import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

// GET /api/industries/packs?slug=gym
// Public: returns the pack config for the given industry. Used by the
// signup flow to show what the client is about to get pre-configured.

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  const db = getAdminClient();

  if (slug) {
    const { data, error } = await db
      .from('industry_packs')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    return NextResponse.json({ pack: data });
  }

  // No slug → return all active packs (summary only)
  const { data } = await db
    .from('industry_packs')
    .select('slug, name, recommended_plan')
    .eq('is_active', true)
    .order('slug');
  return NextResponse.json({ packs: data || [] });
}
