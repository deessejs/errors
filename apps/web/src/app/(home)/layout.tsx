import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '@deessejs/errors',
  description:
    'A TypeScript library that brings Python-inspired error handling to JavaScript. Exception chaining, hierarchical inheritance, and rich error semantics through a function-based API.',
  openGraph: {
    title: '@deessejs/errors',
    description: 'TypeScript error handling reimagined.',
    url: '/',
    siteName: 'DeesseJS Errors',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '@deessejs/errors',
    description: 'TypeScript error handling reimagined.',
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return <HomeLayout {...baseOptions()}>{children}</HomeLayout>;
}
