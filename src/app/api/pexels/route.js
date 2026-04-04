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

function pickFile(video) {
  const files = video.video_files || [];
  return (
    files.find(f => f.width <= 1280 && f.width >= 720) ||
    files.find(f => f.quality === 'hd') ||
    files.find(f => f.quality === 'sd') ||
    files[0]
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const industry = searchParams.get('industry') || 'factory';
  const count = parseInt(searchParams.get('count') || '1', 10);
  const query = QUERIES[industry] || QUERIES.factory;

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`,
    {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      cache: 'no-store',
    }
  );

  if (!res.ok) return NextResponse.json({ url: null }, { status: 500 });

  const data = await res.json();
  const videos = data.videos || [];

  if (count > 1) {
    const urls = videos.slice(0, count).map(v => pickFile(v)?.link || null);
    return NextResponse.json({ urls });
  }

  const video = videos[0];
  if (!video) return NextResponse.json({ url: null });

  return NextResponse.json({
    url: pickFile(video)?.link || null,
    photographer: video.user?.name || '',
  });
}
