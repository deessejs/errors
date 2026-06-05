import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/search', '/llms.mdx'],
      },
    ],
    sitemap: 'https://errors.deessejs.com/sitemap.xml',
  };
}
