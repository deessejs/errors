import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SiteHeader } from '@/components/marketing/site-header';
import './home.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '@deessejs/errors — Errors with structure, not strings',
  description:
    'A TypeScript library that gives errors fields, types, and a parent chain. Build a hierarchy once, narrow on it everywhere, and preserve the cause through every raise.',
  alternates: {
    canonical: '/',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`errors-home ${inter.variable}`}>
      <SiteHeader />
      {children}
    </div>
  );
}
