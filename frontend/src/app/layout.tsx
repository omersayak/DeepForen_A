import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import ChatWidget from '@/components/ChatWidget'; // Added

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NetGraph Sentinel',
  description: 'AI-Powered Network Observability Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0B0F19] text-gray-100 overflow-hidden`}>
        <div className="flex h-screen w-full">
          {/* Sidebar */}
          <aside className="w-64 border-r border-white/5 bg-[#0B0F19]">
            <Sidebar />
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-8 relative">
            <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
            <div className="relative z-10 max-w-7xl mx-auto">
              {children}
            </div>
          </main>

          {/* Floating AI Chat */}
          <ChatWidget />
        </div>
      </body>
    </html>
  );
}
