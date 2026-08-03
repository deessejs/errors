import { source, blogSource } from '@/lib/source';
import { baseUrl } from '@/lib/shared';
import { getPageImage } from '@/lib/source';
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages();
  const blogPages = blogSource.getPages();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Dynamic doc pages with image sitemap
  const docPages: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
    images: [`${baseUrl}${getPageImage(page).url}`],
  }));

  // Dynamic blog pages
  const blogPagesSitemap: MetadataRoute.Sitemap = blogPages.map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: new Date(page.data.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...docPages, ...blogPagesSitemap];
}
