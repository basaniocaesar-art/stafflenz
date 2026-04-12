import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Admin-authenticated test trigger — calls the orchestrator server-side
// so INTERNAL_SECRET never touches the browser
export async function POST(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { client_id } = await request.json();
  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 });

  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const res = await fetch(`${base}/api/monitor/orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': process.env.INTERNAL_SECRET,
    },
  });

  const data = await res.json();
  const result = data.results?.find(r => r.client_id === client_id);
  return NextResponse.json(result || data);
}
