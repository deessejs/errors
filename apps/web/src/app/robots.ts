import { baseUrl } from '@/lib/shared';
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/llms.txt', '/llms.mdx/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
