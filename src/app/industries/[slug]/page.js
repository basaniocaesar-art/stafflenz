import { notFound } from 'next/navigation';
import IndustryLandingPage from '@/components/IndustryLandingPage';
import { INDUSTRIES, getIndustry, allIndustrySlugs } from '@/data/industries';

// Static generation — Next.js pre-renders all 10 pages at build time.
export function generateStaticParams() {
  return allIndustrySlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }) {
  const i = getIndustry(params.slug);
  if (!i) return { title: 'Industry not found' };
  return {
    title: `${i.name} — StaffLenz AI Workforce Monitoring`,
    description: i.meta_description,
    openGraph: {
      title: `${i.name} — StaffLenz`,
      description: i.meta_description,
      type: 'website',
    },
  };
}

export default function Page({ params }) {
  const industry = getIndustry(params.slug);
  if (!industry) notFound();
  return <IndustryLandingPage industry={industry} />;
}
