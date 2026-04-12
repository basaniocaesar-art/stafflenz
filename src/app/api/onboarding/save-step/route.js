import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

// Safely update clients table — tolerates missing columns
async function safeUpdateClient(db, clientId, updates) {
  // Try full update first, then progressively strip keys that cause errors
  const keys = Object.keys(updates);
  for (let i = keys.length; i > 0; i--) {
    const subset = {};
    for (const k of keys.slice(0, i)) subset[k] = updates[k];
    const { error } = await db.from('clients').update(subset).eq('id', clientId);
    if (!error) return true;
  }
  return false;
}

// POST /api/onboarding/save-step
// Body: { step, data }
export async function POST(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const clientId = client?.id;
  if (!clientId) return NextResponse.json({ error: 'No client associated' }, { status: 400 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { step, data } = body || {};
  if (!step) return NextResponse.json({ error: 'step required' }, { status: 400 });

  const db = getAdminClient();

  try {
    // ─── Step 1: Site Info ─────────────────────────────────────────────
    if (step === 1) {
      const { industry, site_name, address, num_cameras } = data || {};
      if (!site_name) return NextResponse.json({ error: 'site_name required' }, { status: 400 });

      // Find existing site
      let existingSiteId = null;
      try {
        const { data: existing } = await db
          .from('sites')
          .select('id')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (existing?.length) existingSiteId = existing[0].id;
      } catch {}

      const payload = {
        client_id: clientId,
        site_name,
        address: address || null,
        industry: industry || null,
        num_cameras: Number(num_cameras) || 0,
      };

      try {
        if (existingSiteId) {
          await db.from('sites').update(payload).eq('id', existingSiteId);
        } else {
          await db.from('sites').insert(payload);
        }
      } catch (err) {
        // sites table may not exist — continue silently so the UI doesn't block
      }

      // Mirror industry onto clients table (existing column)
      await safeUpdateClient(db, clientId, { industry: industry || null, onboarding_step: 2 });

      return NextResponse.json({ success: true, next_step: 2 });
    }

    // ─── Step 2: Connect Cameras ───────────────────────────────────────
    if (step === 2) {
      const {
        connection_method,
        ftp_username, ftp_password, ftp_directory,
        dvr_sender_email,
        hikconnect_serial,
      } = data || {};

      // Update site with connection method
      try {
        const { data: existing } = await db
          .from('sites')
          .select('id')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (existing?.length) {
          const update = { connection_method: connection_method || 'skip' };
          if (ftp_username)  update.ftp_username  = ftp_username;
          if (ftp_password)  update.ftp_password  = ftp_password;
          if (ftp_directory) update.ftp_directory = ftp_directory;
          await db.from('sites').update(update).eq('id', existing[0].id);
        }
      } catch {}

      // Persist DVR sender email into analysis_config so email-receiver can route
      // inbound DVR emails to this client via analysis_config.dvr_email_from.
      if (connection_method === 'email' && dvr_sender_email) {
        try {
          const { data: existing } = await db
            .from('clients').select('analysis_config').eq('id', clientId).single();
          const nextConfig = { ...(existing?.analysis_config || {}), dvr_email_from: dvr_sender_email };
          await safeUpdateClient(db, clientId, { analysis_config: nextConfig });
        } catch { /* analysis_config column may not exist yet */ }
      }

      // Mirror camera_source so the orchestrator/capture router picks the right path
      if (['email', 'http', 'ftp', 'hikconnect'].includes(connection_method)) {
        await safeUpdateClient(db, clientId, { camera_source: connection_method });
      }

      // Store hik serial on client if provided (best-effort)
      if (hikconnect_serial) {
        await safeUpdateClient(db, clientId, { hikconnect_account_id: hikconnect_serial });
      }

      await safeUpdateClient(db, clientId, { onboarding_step: 3 });
      return NextResponse.json({ success: true, next_step: 3 });
    }

    // ─── Step 3: Complete ──────────────────────────────────────────────
    if (step === 3) {
      await safeUpdateClient(db, clientId, {
        onboarding_completed: true,
        monitoring_active: true,
        onboarding_step: 3,
      });
      return NextResponse.json({ success: true, next_step: 3, completed: true });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to save step' }, { status: 500 });
  }
}
