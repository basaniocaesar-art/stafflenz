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

  if (view === 'partners') {
    const { data: applications } = await db
      .from('partner_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    return NextResponse.json({ applications: applications || [] });
  }

  if (view === 'affiliates') {
    const { data: affiliates } = await db
      .from('affiliates')
      .select('id, code, name, email, company, partner_type, commission_rate, status, total_clicks, total_conversions, total_earnings, created_at')
      .order('created_at', { ascending: false });
    const { data: conversions } = await db
      .from('affiliate_conversions')
      .select('id, affiliate_code, lead_name, lead_email, conversion_type, commission_amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    return NextResponse.json({ affiliates: affiliates || [], conversions: conversions || [] });
  }

  if (view === 'white_labels') {
    const { data: wlUsers } = await db
      .from('users')
      .select('id, full_name, email, is_active, created_at')
      .eq('role', 'white_label_admin')
      .order('created_at', { ascending: false });
    const wlIds = (wlUsers || []).map((u) => u.id);
    let subClientCounts = {};
    if (wlIds.length > 0) {
      const { data: subClients } = await db
        .from('clients')
        .select('white_label_owner_id')
        .in('white_label_owner_id', wlIds);
      (subClients || []).forEach((c) => {
        subClientCounts[c.white_label_owner_id] = (subClientCounts[c.white_label_owner_id] || 0) + 1;
      });
    }
    const enriched = (wlUsers || []).map((u) => ({ ...u, sub_client_count: subClientCounts[u.id] || 0 }));
    return NextResponse.json({ white_labels: enriched });
  }

  if (view === 'revenue') {
    const PLAN_PRICES = { starter: 79, professional: 149, enterprise: 299 };
    const { data: activeClients } = await db
      .from('clients')
      .select('id, name, industry, plan, created_at')
      .eq('is_active', true);
    const mrr = (activeClients || []).reduce((sum, c) => sum + (PLAN_PRICES[c.plan] || 0), 0);
    const byPlan = {};
    const byIndustry = {};
    (activeClients || []).forEach((c) => {
      byPlan[c.plan] = (byPlan[c.plan] || 0) + 1;
      byIndustry[c.industry] = (byIndustry[c.industry] || 0) + 1;
    });
    const { data: paidConversions } = await db
      .from('affiliate_conversions')
      .select('commission_amount')
      .eq('status', 'paid');
    const totalAffiliatePaid = (paidConversions || []).reduce((s, c) => s + parseFloat(c.commission_amount || 0), 0);
    const { data: pendingConversions } = await db
      .from('affiliate_conversions')
      .select('id, affiliate_code, lead_name, lead_email, commission_amount, created_at, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    return NextResponse.json({
      mrr,
      arr: mrr * 12,
      active_clients: activeClients?.length || 0,
      by_plan: byPlan,
      by_industry: byIndustry,
      affiliate_paid: totalAffiliatePaid.toFixed(2),
      pending_conversions: pendingConversions || [],
    });
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

  if (action === 'create_affiliate') {
    const { name, email, company, partner_type, commission_rate, affiliate_code, password } = body;
    if (!name || !email || !affiliate_code || !password) {
      return NextResponse.json({ error: 'name, email, affiliate_code and password required' }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const { data, error } = await db.from('affiliates').insert({
      name, email: email.toLowerCase().trim(),
      company: company || null,
      partner_type: partner_type || 'referral',
      commission_rate: parseFloat(commission_rate) || 20,
      code: affiliate_code.toUpperCase().trim(),
      password_hash: passwordHash,
      status: 'active',
    }).select().single();
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Code or email already exists' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ affiliate: data }, { status: 201 });
  }

  if (action === 'update_affiliate') {
    const { affiliate_id, status, commission_rate } = body;
    if (!affiliate_id) return NextResponse.json({ error: 'affiliate_id required' }, { status: 400 });
    const updates = {};
    if (status) updates.status = status;
    if (commission_rate !== undefined) updates.commission_rate = parseFloat(commission_rate);
    await db.from('affiliates').update(updates).eq('id', affiliate_id);
    return NextResponse.json({ success: true });
  }

  if (action === 'update_application') {
    const { application_id, status } = body;
    if (!application_id || !status) return NextResponse.json({ error: 'application_id and status required' }, { status: 400 });
    await db.from('partner_applications').update({ status }).eq('id', application_id);
    return NextResponse.json({ success: true });
  }

  if (action === 'mark_conversion_paid') {
    const { conversion_id, commission_amount } = body;
    if (!conversion_id) return NextResponse.json({ error: 'conversion_id required' }, { status: 400 });
    await db.from('affiliate_conversions').update({
      status: 'paid',
      commission_amount: parseFloat(commission_amount) || 0,
    }).eq('id', conversion_id);
    return NextResponse.json({ success: true });
  }

  if (action === 'create_white_label_admin') {
    const { name, email, password } = body;
    if (!name || !email || !password) return NextResponse.json({ error: 'name, email and password required' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    const passwordHash = await bcrypt.hash(password, 12);
    const { data, error } = await db.from('users').insert({
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: 'white_label_admin',
      full_name: name,
      is_active: true,
    }).select('id, email, full_name, role').single();
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ user: data }, { status: 201 });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
