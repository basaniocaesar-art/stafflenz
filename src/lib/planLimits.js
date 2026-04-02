import { getAdminClient } from './supabase';

// Check if client can add more workers
export async function canAddWorker(clientId) {
  const db = getAdminClient();

  const { data: client } = await db
    .from('clients')
    .select('plan')
    .eq('id', clientId)
    .single();

  if (!client) return { allowed: false, reason: 'Client not found' };

  const { data: limit } = await db
    .from('plan_limits')
    .select('max_workers')
    .eq('plan', client.plan)
    .single();

  const { count } = await db
    .from('workers')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .eq('is_active', true);

  if (count >= limit.max_workers) {
    return {
      allowed: false,
      reason: `Worker limit reached (${limit.max_workers} max on ${client.plan} plan). Please upgrade.`,
      current: count,
      max: limit.max_workers,
      plan: client.plan,
    };
  }
  return { allowed: true, current: count, max: limit.max_workers, plan: client.plan };
}

// Check if client can add more cameras
export async function canAddCamera(clientId) {
  const db = getAdminClient();

  const { data: client } = await db
    .from('clients')
    .select('plan')
    .eq('id', clientId)
    .single();

  if (!client) return { allowed: false, reason: 'Client not found' };

  const { data: limit } = await db
    .from('plan_limits')
    .select('max_cameras')
    .eq('plan', client.plan)
    .single();

  const { count } = await db
    .from('camera_zones')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('is_active', true);

  if (count >= limit.max_cameras) {
    return {
      allowed: false,
      reason: `Camera limit reached (${limit.max_cameras} max on ${client.plan} plan). Please upgrade.`,
      current: count,
      max: limit.max_cameras,
      plan: client.plan,
    };
  }
  return { allowed: true, current: count, max: limit.max_cameras, plan: client.plan };
}
