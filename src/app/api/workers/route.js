import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { canAddWorker } from '@/lib/planLimits';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const BUCKET = 'worker-photos';
const MAX_PHOTOS = 6;
const PHOTO_LABELS = ['front', 'left_profile', 'right_profile', 'from_above', 'alt_1', 'alt_2'];

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user, client } = session;
  const clientId = user.role === 'super_admin'
    ? new URL(request.url).searchParams.get('client_id')
    : client?.id;

  if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 });

  const db = getAdminClient();

  // Try fetching with photo_paths column, fall back if it doesn't exist
  let workers;
  const fullQuery = await db
    .from('workers')
    .select('id, full_name, employee_id, department, shift, photo_path, photo_paths, is_active, created_at')
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .order('full_name');

  if (fullQuery.error && fullQuery.error.message?.includes('column')) {
    // photo_paths column doesn't exist yet — fall back
    const baseQuery = await db
      .from('workers')
      .select('id, full_name, employee_id, department, shift, photo_path, is_active, created_at')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('full_name');
    if (baseQuery.error) return NextResponse.json({ error: baseQuery.error.message }, { status: 500 });
    workers = (baseQuery.data || []).map(w => ({ ...w, photo_paths: null }));
  } else if (fullQuery.error) {
    return NextResponse.json({ error: fullQuery.error.message }, { status: 500 });
  } else {
    workers = fullQuery.data;
  }

  // Generate signed URLs for all photos
  const workersWithPhotos = await Promise.all(
    workers.map(async (w) => {
      // Generate URLs for photo_paths array (multi-photo)
      let photo_urls = [];
      if (Array.isArray(w.photo_paths) && w.photo_paths.length > 0) {
        photo_urls = await Promise.all(
          w.photo_paths.map(async (path) => {
            if (!path) return null;
            const { data: signed } = await db.storage
              .from(BUCKET)
              .createSignedUrl(path, 3600);
            return signed?.signedUrl || null;
          })
        );
      }

      // First photo URL (from photo_paths or fallback to photo_path)
      let photo_url = photo_urls[0] || null;
      if (!photo_url && w.photo_path) {
        const { data: signed } = await db.storage
          .from(BUCKET)
          .createSignedUrl(w.photo_path, 3600);
        photo_url = signed?.signedUrl || null;
      }

      return { ...w, photo_url, photo_urls };
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
  let full_name, employee_id, department, shift;
  let photoFiles = []; // array of { file, slotIndex }

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    full_name = formData.get('full_name');
    employee_id = formData.get('employee_id');
    department = formData.get('department');
    shift = formData.get('shift') || 'morning';

    // Support multi-photo: photos are sent as photo_0, photo_1, ... photo_5
    for (let i = 0; i < MAX_PHOTOS; i++) {
      const file = formData.get(`photo_${i}`);
      if (file && file.size > 0) {
        photoFiles.push({ file, slotIndex: i });
      }
    }
    // Backward compat: also check single 'photo' field
    if (photoFiles.length === 0) {
      const singlePhoto = formData.get('photo');
      if (singlePhoto && singlePhoto.size > 0) {
        photoFiles.push({ file: singlePhoto, slotIndex: 0 });
      }
    }
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

  // Upload photos if provided
  if (photoFiles.length > 0) {
    const photoPaths = [];
    for (const { file, slotIndex } of photoFiles) {
      const photoPath = `${clientId}/${worker.id}/photo_${slotIndex}.jpg`;
      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await db.storage
        .from(BUCKET)
        .upload(photoPath, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      if (!uploadError) {
        photoPaths.push({ index: slotIndex, path: photoPath });
      }
    }

    if (photoPaths.length > 0) {
      // Build full array with nulls for empty slots
      const pathsArray = new Array(MAX_PHOTOS).fill(null);
      for (const { index, path } of photoPaths) {
        pathsArray[index] = path;
      }
      // Filter trailing nulls for cleaner storage
      const trimmedPaths = pathsArray;

      const updates = { photo_path: photoPaths[0].path };
      // Try to set photo_paths, ignore if column doesn't exist
      try {
        await db.from('workers').update({ photo_path: photoPaths[0].path, photo_paths: trimmedPaths }).eq('id', worker.id);
      } catch {
        await db.from('workers').update({ photo_path: photoPaths[0].path }).eq('id', worker.id);
      }
      worker.photo_path = photoPaths[0].path;
      worker.photo_paths = trimmedPaths;
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

  // Ownership check — try with photo_paths, fall back without
  let existing;
  const fullExisting = await db.from('workers').select('client_id, photo_path, photo_paths').eq('id', id).single();
  if (fullExisting.error && fullExisting.error.message?.includes('column')) {
    const baseExisting = await db.from('workers').select('client_id, photo_path').eq('id', id).single();
    existing = baseExisting.data ? { ...baseExisting.data, photo_paths: null } : null;
  } else {
    existing = fullExisting.data;
  }

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

    // Handle multi-photo uploads
    const photoFiles = [];
    for (let i = 0; i < MAX_PHOTOS; i++) {
      const file = formData.get(`photo_${i}`);
      if (file && file.size > 0) {
        photoFiles.push({ file, slotIndex: i });
      }
    }
    // Backward compat: single 'photo' field
    if (photoFiles.length === 0) {
      const singlePhoto = formData.get('photo');
      if (singlePhoto && singlePhoto.size > 0) {
        photoFiles.push({ file: singlePhoto, slotIndex: 0 });
      }
    }

    // Check if any photos were removed (sent as remove_photo_0, remove_photo_1, etc.)
    const removedSlots = [];
    for (let i = 0; i < MAX_PHOTOS; i++) {
      if (formData.get(`remove_photo_${i}`) === 'true') {
        removedSlots.push(i);
      }
    }

    if (photoFiles.length > 0 || removedSlots.length > 0) {
      // Start with existing paths
      const currentPaths = Array.isArray(existing.photo_paths)
        ? [...existing.photo_paths]
        : new Array(MAX_PHOTOS).fill(null);
      // Ensure array is full length
      while (currentPaths.length < MAX_PHOTOS) currentPaths.push(null);

      // If no photo_paths existed but photo_path did, seed slot 0
      if (!existing.photo_paths && existing.photo_path) {
        currentPaths[0] = existing.photo_path;
      }

      // Remove photos
      for (const slot of removedSlots) {
        if (currentPaths[slot]) {
          await db.storage.from(BUCKET).remove([currentPaths[slot]]);
          currentPaths[slot] = null;
        }
      }

      // Upload new photos
      for (const { file, slotIndex } of photoFiles) {
        const photoPath = `${client.id}/${id}/photo_${slotIndex}.jpg`;
        const arrayBuffer = await file.arrayBuffer();
        await db.storage.from(BUCKET).upload(photoPath, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
        currentPaths[slotIndex] = photoPath;
      }

      // Set photo_path to first non-null
      const firstPhoto = currentPaths.find(p => p !== null) || null;
      updates.photo_path = firstPhoto;

      // Try to set photo_paths column
      updates.photo_paths = currentPaths;
    }
  } else {
    updates = await request.json();
    delete updates.id;
    delete updates.client_id;
  }

  // Try update with photo_paths, fall back if column doesn't exist
  let result = await db.from('workers').update(updates).eq('id', id).select().single();
  if (result.error && result.error.message?.includes('column')) {
    delete updates.photo_paths;
    result = await db.from('workers').update(updates).eq('id', id).select().single();
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ worker: result.data });
}

export async function DELETE(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const db = getAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Worker id required' }, { status: 400 });

  // Try with photo_paths, fall back
  let existing;
  const fullExisting = await db.from('workers').select('client_id, photo_path, photo_paths').eq('id', id).single();
  if (fullExisting.error && fullExisting.error.message?.includes('column')) {
    const baseExisting = await db.from('workers').select('client_id, photo_path').eq('id', id).single();
    existing = baseExisting.data ? { ...baseExisting.data, photo_paths: null } : null;
  } else {
    existing = fullExisting.data;
  }

  if (!existing || existing.client_id !== client?.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Soft delete
  await db.from('workers').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);

  // Remove all photos from storage
  const pathsToRemove = [];
  if (Array.isArray(existing.photo_paths)) {
    existing.photo_paths.forEach(p => { if (p) pathsToRemove.push(p); });
  }
  if (existing.photo_path && !pathsToRemove.includes(existing.photo_path)) {
    pathsToRemove.push(existing.photo_path);
  }
  if (pathsToRemove.length > 0) {
    await db.storage.from(BUCKET).remove(pathsToRemove);
  }

  return NextResponse.json({ success: true });
}
