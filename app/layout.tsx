import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title:       'SURGIFLOW — Company OS',
  description: 'Gérez votre équipe d\'agents IA virtuels SURGIFLOW',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="flex h-screen bg-[#080b12] antialiased overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto pt-14 md:pt-0 min-w-0">
          {children}
        </main>
      </body>
    </html>
  );
}
