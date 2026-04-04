import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

async function requireWLAdmin(request) {
  const session = await requireAuth(request);
  if (!session) return null;
  if (session.user.role !== 'white_label_admin') return null;
  return session;
}

// GET — list all sub-clients owned by this WL admin
export async function GET(request) {
  const session = await requireWLAdmin(request);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getAdminClient();
  const { data: clients } = await db
    .from('clients')
    .select('id, name, industry, plan, is_active, created_at')
    .eq('white_label_owner_id', session.user.id)
    .order('created_at', { ascending: false });

  if (!clients || clients.length === 0) {
    return NextResponse.json({ clients: [] });
  }

  // Get worker counts + today's stats for each client
  const today = new Date().toISOString().slice(0, 10);
  const clientIds = clients.map((c) => c.id);

  const [{ data: workerCounts }, { data: todayStats }] = await Promise.all([
    db.from('workers')
      .select('client_id')
      .in('client_id', clientIds)
      .is('deleted_at', null)
      .eq('is_active', true),
    db.from('daily_summary')
      .select('client_id, present_count, violation_count')
      .in('client_id', clientIds)
      .eq('summary_date', today),
  ]);

  const workerMap = {};
  (workerCounts || []).forEach((w) => { workerMap[w.client_id] = (workerMap[w.client_id] || 0) + 1; });
  const statsMap = {};
  (todayStats || []).forEach((s) => { statsMap[s.client_id] = s; });

  const enriched = clients.map((c) => ({
    ...c,
    worker_count: workerMap[c.id] || 0,
    today: statsMap[c.id] || { present_count: 0, violation_count: 0 },
  }));

  return NextResponse.json({ clients: enriched });
}

// POST — create a new sub-client
export async function POST(request) {
  const session = await requireWLAdmin(request);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { name, industry, plan, admin_email, admin_password, admin_name } = body;
  if (!name || !industry || !admin_email || !admin_password) {
    return NextResponse.json({ error: 'name, industry, admin_email and admin_password required' }, { status: 400 });
  }
  if (admin_password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const db = getAdminClient();

  // Enforce sub-client limit per WL tier (simple: max 50 for now)
  const { count } = await db
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('white_label_owner_id', session.user.id);
  if ((count || 0) >= 50) {
    return NextResponse.json({ error: 'Sub-client limit reached. Contact support to increase.' }, { status: 403 });
  }

  // Create client
  const { data: client, error: clientError } = await db
    .from('clients')
    .insert({ name, industry, plan: plan || 'starter', white_label_owner_id: session.user.id })
    .select()
    .single();
  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });

  // Create admin user for client
  const passwordHash = await bcrypt.hash(admin_password, 12);
  const { data: user, error: userError } = await db
    .from('users')
    .insert({
      client_id: client.id,
      email: admin_email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: 'client_admin',
      full_name: admin_name || name + ' Admin',
    })
    .select('id, email, role, full_name')
    .single();

  if (userError) {
    await db.from('clients').delete().eq('id', client.id);
    if (userError.code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  return NextResponse.json({ client, user }, { status: 201 });
}
