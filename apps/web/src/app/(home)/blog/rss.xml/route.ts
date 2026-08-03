import { Feed } from 'feed';
import { blogSource } from '@/lib/source';
import { NextResponse } from 'next/server';
import { baseUrl } from '@/lib/shared';

export const revalidate = false;

export function GET() {
  const feed = new Feed({
    title: '@deessejs/errors Blog',
    id: `${baseUrl}/blog`,
    link: `${baseUrl}/blog`,
    language: 'en',
    description:
      'Latest articles about TypeScript error handling, exception chaining, and best practices.',
    image: `${baseUrl}/banner.jpg`,
    favicon: `${baseUrl}/icon.svg`,
    copyright: `All rights reserved ${new Date().getFullYear()}, Nesalia Inc`,
  });

  for (const page of blogSource.getPages().sort((a, b) => {
    return new Date(b.data.date).getTime() - new Date(a.data.date).getTime();
  })) {
    feed.addItem({
      id: page.url,
      title: page.data.title,
      description: page.data.description,
      link: `${baseUrl}${page.url}`,
      date: new Date(page.data.date),
      author: [{ name: page.data.author }],
    });
  }

  return new NextResponse(feed.rss2(), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
