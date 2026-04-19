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
  gym:          'gym fitness workout',
  home:         'home security camera entrance gate',
};

// 8 different queries per industry for camera grid variety
const GRID_QUERIES = {
  factory:      ['factory floor workers','industrial machinery','manufacturing assembly','factory safety equipment','warehouse forklift','production line','factory workers','industrial plant'],
  hotel:        ['hotel lobby','hotel reception desk','hotel corridor','hotel room service','hotel restaurant','hotel pool','hotel staff','hotel entrance'],
  school:       ['classroom teaching','school hallway','school library','school cafeteria','school sports','school entrance','students studying','school playground'],
  retail:       ['shopping store interior','retail cashier','shopping mall','store shelves','retail staff','shopping customers','store entrance','clothing store'],
  hospital:     ['hospital corridor','hospital reception','hospital ward','hospital surgery','hospital pharmacy','hospital waiting room','medical staff','hospital entrance'],
  construction: ['construction site','building workers','construction machinery','scaffolding workers','construction safety','building foundation','crane construction','construction team'],
  warehouse:    ['warehouse shelves','forklift warehouse','warehouse workers','loading dock','warehouse inventory','logistics workers','shipping warehouse','warehouse interior'],
  restaurant:   ['restaurant kitchen','restaurant dining','restaurant bar','restaurant staff','food preparation','restaurant service','restaurant entrance','chef cooking'],
  security:     ['security guard','office building entrance','security checkpoint','parking lot surveillance','security patrol','building lobby security','night security','access control'],
  gym:          ['gym weights workout','cardio gym','gym trainer','fitness class studio','gym reception','treadmill running','gym floor members','yoga studio'],
  home:         ['home front door entrance','living room interior home','backyard garden home','home garage parking','home kitchen cooking','house gate entrance','elderly person home','home security doorbell camera'],
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
  const customQuery = searchParams.get('query');
  const query = customQuery || QUERIES[industry] || QUERIES.factory;

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
    // Fetch a different video for each camera using unique queries
    const gridQueries = GRID_QUERIES[industry] || Array(8).fill(query);
    const results = await Promise.all(
      gridQueries.slice(0, count).map(async (q) => {
        try {
          const r = await fetch(
            `https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=5&orientation=landscape`,
            { headers: { Authorization: process.env.PEXELS_API_KEY }, cache: 'no-store' }
          );
          const d = await r.json();
          const v = d.videos?.[0];
          return v ? (pickFile(v)?.link || null) : null;
        } catch { return null; }
      })
    );
    return NextResponse.json({ urls: results });
  }

  const video = videos[0];
  if (!video) return NextResponse.json({ url: null });

  return NextResponse.json({
    url: pickFile(video)?.link || null,
    photographer: video.user?.name || '',
  });
}
