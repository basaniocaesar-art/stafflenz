import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

// GET /api/onboarding/status — returns current onboarding state for the logged-in client
export async function GET(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const clientId = client?.id;
  if (!clientId) return NextResponse.json({ error: 'No client associated' }, { status: 400 });

  const db = getAdminClient();

  // Progressive column detection for clients table
  let clientRow = null;
  const clientSelects = [
    'id, onboarding_completed, onboarding_step, monitoring_active',
    'id, onboarding_completed, onboarding_step',
    'id',
  ];
  for (const sel of clientSelects) {
    const { data, error } = await db.from('clients').select(sel).eq('id', clientId).single();
    if (!error && data) { clientRow = data; break; }
  }

  // Try to read the site (sites table may not exist yet)
  let site = null;
  try {
    const { data, error } = await db
      .from('sites')
      .select('id, site_name, address, industry, num_cameras, connection_method, ftp_username, ftp_password, ftp_directory, is_active')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (!error && data && data.length) site = data[0];
  } catch {
    // sites table may not exist yet — ignore
  }

  const currentStep = clientRow?.onboarding_step || (site ? 2 : 1);
  const completed = clientRow?.onboarding_completed === true;

  return NextResponse.json({
    current_step: completed ? 3 : currentStep,
    completed,
    site: site || null,
    connection_method: site?.connection_method || null,
    ftp_credentials: site?.ftp_username
      ? {
          ftp_host: 'ftp.drivehq.com',
          ftp_port: 21,
          ftp_username: site.ftp_username,
          ftp_password: site.ftp_password,
          ftp_directory: site.ftp_directory,
        }
      : null,
  });
}
