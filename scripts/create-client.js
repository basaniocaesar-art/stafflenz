#!/usr/bin/env node
// Create a client + admin user in prod Supabase, mirroring
// POST /api/admin { action: 'create_client' }. Run from repo root:
//   node scripts/create-client.js \
//     --name "Old Harbour Hotel" --industry hotel \
//     --email raintree@fortcochin.com --password fortcochin123

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : fallback;
}

async function main() {
  const name = arg('--name');
  const industry = arg('--industry');
  const email = (arg('--email') || '').toLowerCase().trim();
  const password = arg('--password');
  const plan = arg('--plan', 'standard');
  const setupType = arg('--setup-type', 'self_setup');
  const phone = arg('--phone', null);
  const adminName = arg('--admin-name', name ? `${name} Admin` : null);

  if (!name || !industry || !email || !password) {
    console.error('Required: --name --industry --email --password');
    process.exit(1);
  }

  const validIndustries = ['gym','factory','construction','retail','warehouse','hotel','restaurant','hospital','school','security'];
  if (!validIndustries.includes(industry)) {
    console.error(`Invalid industry. One of: ${validIndustries.join(', ')}`);
    process.exit(1);
  }

  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'edge-agent', 'config.json'), 'utf8'));
  const db = createClient(cfg.supabase_url, cfg.supabase_key, { auth: { persistSession: false } });

  const { data: existing } = await db.from('users').select('id, email, client_id').eq('email', email).maybeSingle();
  if (existing) {
    console.error(`User ${email} already exists (id=${existing.id}, client_id=${existing.client_id}). Aborting.`);
    process.exit(2);
  }

  const { data: client, error: clientErr } = await db.from('clients').insert({
    name,
    industry,
    plan,
    setup_type: setupType,
    subscription_status: 'active',
    billing_email: email,
    billing_phone: phone,
  }).select().single();
  if (clientErr) { console.error('clients insert failed:', clientErr); process.exit(3); }

  const passwordHash = await bcrypt.hash(password, 12);
  const { data: user, error: userErr } = await db.from('users').insert({
    client_id: client.id,
    email,
    password_hash: passwordHash,
    role: 'client_admin',
    full_name: adminName,
  }).select('id, email, role, full_name').single();
  if (userErr) {
    await db.from('clients').delete().eq('id', client.id);
    console.error('users insert failed (rolled back client):', userErr);
    process.exit(4);
  }

  console.log(JSON.stringify({
    ok: true,
    client_id: client.id,
    user_id: user.id,
    login_url: 'https://www.lenzai.org/login',
    email,
    password,
    name: client.name,
    industry: client.industry,
    plan: client.plan,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(99); });
