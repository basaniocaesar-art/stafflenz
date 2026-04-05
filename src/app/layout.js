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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen">
        {children}
        {/* Tawk.to Live Chat */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
              (function(){
                var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                s1.async=true;
                s1.src='https://embed.tawk.to/69d1f849b8aa781c3b31068e/1jle33ocq';
                s1.charset='UTF-8';
                s1.setAttribute('crossorigin','*');
                s0.parentNode.insertBefore(s1,s0);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
