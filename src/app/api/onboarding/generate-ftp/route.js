import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

// POST /api/onboarding/generate-ftp
// Generates and persists FTP credentials for the client's site.
export async function POST(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const clientId = client?.id;
  if (!clientId) return NextResponse.json({ error: 'No client associated' }, { status: 400 });

  const db = getAdminClient();

  const shortId = clientId.replace(/-/g, '').substring(0, 8);
  const ftp_username  = `stafflenz-${shortId}`;
  const ftp_password  = crypto.randomBytes(8).toString('hex');
  const ftp_directory = `/${clientId}/`;
  const ftp_host      = 'ftp.drivehq.com';
  const ftp_port      = 21;

  // Persist onto the site record (best-effort)
  try {
    const { data: existing } = await db
      .from('sites')
      .select('id, ftp_username, ftp_password, ftp_directory')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing?.length) {
      // If credentials already exist, reuse them so the user sees the same values
      const row = existing[0];
      if (row.ftp_username && row.ftp_password) {
        return NextResponse.json({
          ftp_host,
          ftp_port,
          ftp_username: row.ftp_username,
          ftp_password: row.ftp_password,
          ftp_directory: row.ftp_directory || ftp_directory,
        });
      }
      await db.from('sites').update({ ftp_username, ftp_password, ftp_directory }).eq('id', row.id);
    } else {
      await db.from('sites').insert({
        client_id: clientId,
        site_name: client?.name || 'Site 1',
        ftp_username,
        ftp_password,
        ftp_directory,
        connection_method: 'ftp',
      });
    }
  } catch {
    // sites table missing — return generated creds anyway so UI still works
  }

  return NextResponse.json({
    ftp_host,
    ftp_port,
    ftp_username,
    ftp_password,
    ftp_directory,
  });
}
