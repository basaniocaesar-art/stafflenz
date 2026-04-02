import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { canAddWorker } from '@/lib/planLimits';
import { getAdminClient } from '@/lib/supabase';

const BUCKET = 'worker-photos';

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user, client } = session;
  const clientId = user.role === 'super_admin'
    ? new URL(request.url).searchParams.get('client_id')
    : client?.id;

  if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 });

  const db = getAdminClient();
  const { data: workers, error } = await db
    .from('workers')
    .select('id, full_name, employee_id, department, shift, photo_path, is_active, created_at')
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .order('full_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate signed URLs for photos
  const workersWithPhotos = await Promise.all(
    workers.map(async (w) => {
      if (w.photo_path) {
        const { data: signed } = await db.storage
          .from(BUCKET)
          .createSignedUrl(w.photo_path, 3600);
        return { ...w, photo_url: signed?.signedUrl || null };
      }
      return { ...w, photo_url: null };
    })
  );

  return NextResponse.json({ workers: workersWithPhotos });
}

export async function POST(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user, client } = session;
  const clientId = client?.id;
  if (!clientId) return NextResponse.json({ error: 'No client associated' }, { status: 400 });

  // Check plan limits
  const limitCheck = await canAddWorker(clientId);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
  }

  const db = getAdminClient();
  let full_name, employee_id, department, shift, photoFile;

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    full_name = formData.get('full_name');
    employee_id = formData.get('employee_id');
    department = formData.get('department');
    shift = formData.get('shift') || 'morning';
    photoFile = formData.get('photo');
  } else {
    const body = await request.json();
    ({ full_name, employee_id, department, shift } = body);
  }

  if (!full_name) return NextResponse.json({ error: 'full_name required' }, { status: 400 });

  // Insert worker first to get ID
  const { data: worker, error: insertError } = await db
    .from('workers')
    .insert({ client_id: clientId, full_name, employee_id, department, shift: shift || 'morning' })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Employee ID already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Upload photo if provided
  if (photoFile && photoFile.size > 0) {
    const photoPath = `${clientId}/${worker.id}.jpg`;
    const arrayBuffer = await photoFile.arrayBuffer();
    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(photoPath, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

    if (!uploadError) {
      await db.from('workers').update({ photo_path: photoPath }).eq('id', worker.id);
      worker.photo_path = photoPath;
    }
  }

  return NextResponse.json({ worker }, { status: 201 });
}

export async function PUT(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const db = getAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Worker id required' }, { status: 400 });

  // Ownership check
  const { data: existing } = await db.from('workers').select('client_id, photo_path').eq('id', id).single();
  if (!existing || existing.client_id !== client?.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let updates = {};
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    ['full_name', 'employee_id', 'department', 'shift', 'is_active'].forEach((f) => {
      if (formData.get(f) !== null) updates[f] = formData.get(f);
    });
    const photoFile = formData.get('photo');
    if (photoFile && photoFile.size > 0) {
      const photoPath = `${client.id}/${id}.jpg`;
      const arrayBuffer = await photoFile.arrayBuffer();
      await db.storage.from(BUCKET).upload(photoPath, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      updates.photo_path = photoPath;
    }
  } else {
    updates = await request.json();
    delete updates.id;
    delete updates.client_id;
  }

  const { data: worker, error } = await db.from('workers').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ worker });
}

export async function DELETE(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const db = getAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Worker id required' }, { status: 400 });

  const { data: existing } = await db.from('workers').select('client_id, photo_path').eq('id', id).single();
  if (!existing || existing.client_id !== client?.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Soft delete
  await db.from('workers').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);

  // Remove photo from storage
  if (existing.photo_path) {
    await db.storage.from(BUCKET).remove([existing.photo_path]);
  }

  return NextResponse.json({ success: true });
}
