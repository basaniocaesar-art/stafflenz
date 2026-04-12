import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { buildAnalysisPrompt } from '@/lib/promptBuilder';

async function requireSuperAdmin(request) {
  const session = await requireAuth(request);
  if (!session) return null;
  if (session.user.role !== 'super_admin') return null;
  return session;
}

// POST /api/monitor/preview-prompt — returns the full prompt text for a client
export async function POST(request) {
  const session = await requireSuperAdmin(request);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { client_id } = await request.json();
  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 });

  const db = getAdminClient();

  // Load client
  const { data: client, error: clientErr } = await db
    .from('clients')
    .select('id, name, industry, site_name, analysis_config')
    .eq('id', client_id)
    .single();

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const analysisConfig = client.analysis_config || {};

  // Load zones
  const { data: zones } = await db
    .from('camera_zones')
    .select('id, name, zone_type, min_workers, max_workers, rules, ppe_requirements, is_active')
    .eq('client_id', client_id)
    .order('name');

  // Load workers
  const { data: workers } = await db
    .from('workers')
    .select('id, full_name, department, shift')
    .eq('client_id', client_id)
    .eq('is_active', true)
    .order('full_name');

  const prompt = buildAnalysisPrompt(client, analysisConfig, zones || [], workers || [], 1);

  return NextResponse.json({ prompt });
}
