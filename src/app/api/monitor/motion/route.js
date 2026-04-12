import { NextResponse } from 'next/server';
import sharp from 'sharp';

function verifyInternalSecret(request) {
  return request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET;
}

// Downscale before comparison for speed — full-res comparison is wasteful
const COMPARE_WIDTH = 320;
// Pixel brightness difference threshold (0–255) to count as "changed"
const PIXEL_THRESHOLD = 25;
// Percentage of changed pixels required to declare motion
const MOTION_THRESHOLD_PCT = 2;

export async function POST(request) {
  if (!verifyInternalSecret(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { frame_url, previous_frame_url } = body;

  if (!frame_url || !previous_frame_url) {
    return NextResponse.json(
      { error: 'frame_url and previous_frame_url required' },
      { status: 400 }
    );
  }

  // Download both frames in parallel
  const [currentRes, prevRes] = await Promise.all([
    fetch(frame_url),
    fetch(previous_frame_url),
  ]);

  if (!currentRes.ok || !prevRes.ok) {
    return NextResponse.json({ error: 'Failed to download one or both frames' }, { status: 502 });
  }

  const [currentBuf, prevBuf] = await Promise.all([
    currentRes.arrayBuffer().then((ab) => Buffer.from(ab)),
    prevRes.arrayBuffer().then((ab) => Buffer.from(ab)),
  ]);

  // Get dimensions from the current frame, then derive height preserving aspect ratio
  const meta = await sharp(currentBuf).metadata();
  const targetWidth = Math.min(COMPARE_WIDTH, meta.width || COMPARE_WIDTH);
  const targetHeight = Math.round(((meta.height || 480) / (meta.width || 640)) * targetWidth);

  // Convert both frames to grayscale raw pixel buffers at the same size
  const [currentGray, prevGray] = await Promise.all([
    sharp(currentBuf).resize(targetWidth, targetHeight).grayscale().raw().toBuffer(),
    sharp(prevBuf).resize(targetWidth, targetHeight).grayscale().raw().toBuffer(),
  ]);

  // Count pixels that changed significantly
  const totalPixels = targetWidth * targetHeight;
  let changedPixels = 0;

  for (let i = 0; i < totalPixels; i++) {
    if (Math.abs(currentGray[i] - prevGray[i]) > PIXEL_THRESHOLD) {
      changedPixels++;
    }
  }

  const changePercentage = (changedPixels / totalPixels) * 100;
  const motion = changePercentage >= MOTION_THRESHOLD_PCT;

  return NextResponse.json({
    motion,
    change_percentage: Math.round(changePercentage * 100) / 100,
  });
}
