import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// POST /api/onboarding/test-ftp
// Mock response for now — will be wired to real DriveHQ FTP check later.
export async function POST(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    connected: false,
    files_received: 0,
    message: 'FTP test pending — credentials saved, will check on next cron cycle',
  });
}
