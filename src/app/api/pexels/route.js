import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const QUERIES = {
  factory:      'factory manufacturing production',
  hotel:        'hotel lobby reception',
  school:       'classroom students education',
  retail:       'shopping mall store',
  hospital:     'hospital medical staff',
  construction: 'construction site workers',
  warehouse:    'warehouse logistics',
  restaurant:   'restaurant kitchen cooking',
  security:     'security guard office',
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const industry = searchParams.get('industry') || 'factory';
  const query = QUERIES[industry] || QUERIES.factory;

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`,
    {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      cache: 'no-store',
    }
  );

  if (!res.ok) return NextResponse.json({ url: null }, { status: 500 });

  const data = await res.json();
  const video = data.videos?.[0];
  if (!video) return NextResponse.json({ url: null });

  // Pick best available file
  const files = video.video_files || [];
  const file =
    files.find(f => f.width <= 1280 && f.width >= 720) ||
    files.find(f => f.quality === 'hd') ||
    files.find(f => f.quality === 'sd') ||
    files[0];

  return NextResponse.json({
    url: file?.link || null,
    photographer: video.user?.name || '',
  });
}
