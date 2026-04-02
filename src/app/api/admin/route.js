import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

async function requireSuperAdmin(request) {
  const session = await requireAuth(request);
  if (!session) return null;
  if (session.user.role !== 'super_admin') return null;
  return session;
}

// GET /api/admin — overview stats + client list
export async function GET(request) {
  const session = await requireSuperAdmin(request);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getAdminClient();
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'overview';

  if (view === 'leads') {
    const { data: leads } = await db.from('leads').select('*').order('created_at', { ascending: false }).limit(100);
    return NextResponse.json({ leads });
  }

  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: clients },
    { data: todaySummary },
    { count: totalWorkers },
    { data: leads },
  ] = await Promise.all([
    db.from('clients').select('id, name, industry, plan, is_active, created_at').order('created_at', { ascending: false }),
    db.from('daily_summary').select('client_id, present_count, total_events, violation_count').eq('summary_date', today),
    db.from('workers').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_active', true),
    db.from('leads').select('*', { count: 'exact', head: true }).eq('is_contacted', false),
  ]);

  // Merge today's summary into clients
  const summaryMap = {};
  (todaySummary || []).forEach((s) => { summaryMap[s.client_id] = s; });
  const enrichedClients = (clients || []).map((c) => ({
    ...c,
    today: summaryMap[c.id] || { present_count: 0, total_events: 0, violation_count: 0 },
  }));

  return NextResponse.json({
    clients: enrichedClients,
    stats: {
      total_clients: clients?.length || 0,
      total_workers: totalWorkers || 0,
      new_leads: leads?.length || 0,
      events_today: (todaySummary || []).reduce((sum, s) => sum + (s.total_events || 0), 0),
    },
  });
}

// POST /api/admin — add client + admin user, or reset password
export async function POST(request) {
  const session = await requireSuperAdmin(request);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { action } = body;

  const db = getAdminClient();

  if (action === 'create_client') {
    const { name, industry, plan, admin_email, admin_password, admin_name } = body;
    if (!name || !industry || !admin_email || !admin_password) {
      return NextResponse.json({ error: 'name, industry, admin_email and admin_password required' }, { status: 400 });
    }

    // Create client
    const { data: client, error: clientError } = await db
      .from('clients')
      .insert({ name, industry, plan: plan || 'starter' })
      .select()
      .single();

    if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });

    // Create admin user
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
      // Rollback client if user creation fails
      await db.from('clients').delete().eq('id', client.id);
      if (userError.code === '23505') {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    return NextResponse.json({ client, user }, { status: 201 });
  }

  if (action === 'reset_password') {
    const { user_id, new_password } = body;
    if (!user_id || !new_password) {
      return NextResponse.json({ error: 'user_id and new_password required' }, { status: 400 });
    }
    if (new_password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(new_password, 12);
    const { error } = await db.from('users').update({ password_hash: passwordHash }).eq('id', user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Invalidate all sessions for this user
    await db.from('sessions').delete().eq('user_id', user_id);
    return NextResponse.json({ success: true });
  }

  if (action === 'toggle_client') {
    const { client_id, is_active } = body;
    await db.from('clients').update({ is_active }).eq('id', client_id);
    return NextResponse.json({ success: true });
  }

  if (action === 'update_plan') {
    const { client_id, plan } = body;
    await db.from('clients').update({ plan }).eq('id', client_id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
