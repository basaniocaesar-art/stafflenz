import { NextResponse } from 'next/server';

const QUERIES = {
  factory:      'workers industrial factory floor machinery',
  hotel:        'hotel staff reception lobby service',
  school:       'teachers classroom school students learning',
  retail:       'retail store staff customers shopping floor',
  hospital:     'hospital nurses doctors medical ward staff',
  construction: 'construction workers building site hard hat',
  warehouse:    'warehouse workers logistics loading forklift',
  restaurant:   'restaurant kitchen chef cooking staff service',
  security:     'security guard patrol building entrance night',
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const industry = searchParams.get('industry') || 'factory';
  const query = QUERIES[industry] || QUERIES.factory;

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&size=medium`,
    {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      next: { revalidate: 86400 }, // cache for 24 hours
    }
  );

  if (!res.ok) return NextResponse.json({ url: null }, { status: 500 });

  const data = await res.json();
  const video = data.videos?.[0];
  if (!video) return NextResponse.json({ url: null });

  // Pick HD file, max 1280 wide so it loads fast
  const files = video.video_files || [];
  const file =
    files.find(f => f.quality === 'hd' && f.width <= 1280 && f.width >= 720) ||
    files.find(f => f.quality === 'hd') ||
    files.find(f => f.quality === 'sd') ||
    files[0];

  return NextResponse.json({
    url: file?.link || null,
    photographer: video.user?.name || '',
  });
}
