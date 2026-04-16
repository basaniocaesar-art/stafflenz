// ═══════════════════════════════════════════════════════════════════════════════
// Motion detection via pixel-diff.
// Downscales each frame to 64×48 grayscale, compares against the previous frame
// for the same camera, and returns the mean absolute pixel delta (0-255).
// A score above ~8-15 usually indicates real motion; tune per site.
//
// This runs on the edge device and costs essentially nothing — sharp does the
// resize in ~15ms on a Pi Zero 2W. The whole point is to avoid sending every
// captured frame to Claude.
// ═══════════════════════════════════════════════════════════════════════════════

let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = null;
}

// camera_channel -> previous downscaled Buffer
const prevFrames = new Map();

async function downsize(buffer) {
  if (!sharp) return null;
  try {
    return await sharp(buffer)
      .resize(64, 48, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();
  } catch {
    return null;
  }
}

/**
 * Compute motion score for a freshly captured frame.
 * Returns { score: 0-255, hasMotion: boolean } or { score: 0, hasMotion: false }
 * on the very first frame (no previous to diff against).
 */
async function detectMotion(channel, frameBuffer, threshold = 10) {
  if (!sharp) return { score: 0, hasMotion: false, available: false };

  const small = await downsize(frameBuffer);
  if (!small) return { score: 0, hasMotion: false, available: false };

  const prev = prevFrames.get(channel);
  prevFrames.set(channel, small);

  if (!prev || prev.length !== small.length) {
    return { score: 0, hasMotion: false, available: true, firstFrame: true };
  }

  let sum = 0;
  for (let i = 0; i < small.length; i++) {
    const d = small[i] - prev[i];
    sum += d < 0 ? -d : d;
  }
  const score = sum / small.length;
  return { score, hasMotion: score >= threshold, available: true };
}

function resetMotion(channel) {
  if (channel === undefined) prevFrames.clear();
  else prevFrames.delete(channel);
}

module.exports = { detectMotion, resetMotion, sharpAvailable: !!sharp };
