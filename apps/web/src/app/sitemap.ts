import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { siteUrl } from '@/lib/shared';
import { getPageImage } from '@/lib/source';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages();

  const docPages = pages.map((page) => ({
    url: `${siteUrl}${page.url}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: page.url === '/docs' ? 1.0 : 0.8,
    images: [`${siteUrl}${getPageImage(page).url}`],
  }));

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ];

  return [...staticPages, ...docPages];
}
