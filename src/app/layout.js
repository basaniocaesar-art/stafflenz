import './globals.css';

export const metadata = {
  title: 'StaffLenz — AI-Powered Workforce Intelligence',
  description: 'Monitor your workforce in real-time with AI-powered CCTV analysis. Attendance, safety compliance, and zone monitoring for factories, hotels, schools, and retail.',
  keywords: 'workforce monitoring, AI attendance, CCTV analytics, employee tracking, safety compliance',
  openGraph: {
    title: 'StaffLenz — AI-Powered Workforce Intelligence',
    description: 'Real-time workforce monitoring powered by AI. Built for factories, hotels, schools, and retail.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
