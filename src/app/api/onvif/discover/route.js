import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Discover all cameras on a DVR/NVR using the ONVIF protocol.
// ONVIF is built into Hikvision DVRs — no API key needed, just IP + credentials.
export async function POST(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, username, password, port = 80 } = await request.json();

  if (!ip || !username || !password) {
    return NextResponse.json({ error: 'IP address, username and password are required' }, { status: 400 });
  }

  try {
    // Dynamically import onvif (CommonJS module)
    const { Cam } = await import('onvif').then(m => m.default || m);

    const cameras = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timed out — check the IP address and that the DVR is reachable')), 15000);

      new Cam(
        { hostname: ip, username, password, port: Number(port), timeout: 10000 },
        async function (err) {
          clearTimeout(timeout);
          if (err) {
            // Provide friendly error messages
            if (err.message?.includes('ECONNREFUSED')) {
              return reject(new Error('Could not connect — is the DVR IP correct and on the same network?'));
            }
            if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
              return reject(new Error('Wrong username or password'));
            }
            if (err.message?.includes('ETIMEDOUT') || err.message?.includes('EHOSTUNREACH')) {
              return reject(new Error('DVR not reachable — check the IP address'));
            }
            return reject(new Error(err.message || 'Could not connect to DVR'));
          }

          try {
            // Get all media profiles — each profile = one camera channel
            this.getProfiles((profileErr, profiles) => {
              if (profileErr || !profiles) return resolve([]);

              const channels = profiles.map((profile, index) => {
                // Build the RTSP stream URL for this channel
                const rtspUrl = `rtsp://${username}:${password}@${ip}:554/Streaming/Channels/${(index + 1) * 100 + 1}`;

                return {
                  channel: index + 1,
                  name: profile.name || `Camera ${index + 1}`,
                  token: profile.$?.token || profile.token || `profile_${index}`,
                  rtsp_url: rtspUrl,
                  resolution: profile.videoEncoderConfiguration?.resolution
                    ? `${profile.videoEncoderConfiguration.resolution.width}x${profile.videoEncoderConfiguration.resolution.height}`
                    : null,
                };
              });

              resolve(channels);
            });
          } catch (e) {
            resolve([]);
          }
        }
      );
    });

    if (!cameras.length) {
      return NextResponse.json({ error: 'Connected to DVR but no cameras found. Make sure cameras are plugged in.' }, { status: 400 });
    }

    return NextResponse.json({ cameras, total: cameras.length });

  } catch (err) {
    return NextResponse.json({ error: err.message || 'Discovery failed' }, { status: 502 });
  }
}
