import './globals.css';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Sistem Manajemen Jastip Korea - Indonesia',
  description: 'Otomasi invoice, totalan WhatsApp/Kakao, dan PDF Invoice untuk Jastip Korea-Indonesia.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="bg-slate-950 text-slate-100 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-800/80 bg-slate-950 text-center py-6 text-xs text-slate-500">
          © {new Date().getFullYear()} Jastip Management System (ICN ↔ CGK). Built for fast automated invoicing.
        </footer>
      </body>
    </html>
  );
}
