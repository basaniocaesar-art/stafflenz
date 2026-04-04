import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

async function requireWLAdmin(request) {
  const session = await requireAuth(request);
  if (!session) return null;
  if (session.user.role !== 'white_label_admin') return null;
  return session;
}

export async function GET(request) {
  const session = await requireWLAdmin(request);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getAdminClient();
  const { data } = await db
    .from('white_label_configs')
    .select('*')
    .eq('owner_user_id', session.user.id)
    .single();

  return NextResponse.json({ config: data || null });
}

export async function PUT(request) {
  const session = await requireWLAdmin(request);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { brand_name, logo_url, primary_color, accent_color, support_email, custom_domain, footer_text, welcome_message } = body;

  if (!brand_name?.trim()) {
    return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
  }

  const db = getAdminClient();
  const payload = {
    owner_user_id: session.user.id,
    brand_name: brand_name.slice(0, 100),
    logo_url: logo_url?.slice(0, 500) || null,
    primary_color: primary_color || '#3b82f6',
    accent_color: accent_color || '#8b5cf6',
    support_email: support_email?.slice(0, 200) || null,
    custom_domain: custom_domain?.slice(0, 200) || null,
    footer_text: footer_text?.slice(0, 500) || null,
    welcome_message: welcome_message?.slice(0, 500) || null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await db
    .from('white_label_configs')
    .select('id')
    .eq('owner_user_id', session.user.id)
    .single();

  if (existing) {
    await db.from('white_label_configs').update(payload).eq('id', existing.id);
  } else {
    await db.from('white_label_configs').insert(payload);
  }

  return NextResponse.json({ success: true });
}
