import { getPageImage, source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';
import { appName } from '@/lib/shared';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
  const { slug } = await params;

  // getPageImage() appends 'image.png' to the slug array.
  // Strip it to get back the real page slugs.
  // Defensive: only strip if the last segment is exactly 'image.png'.
  const cleanSlug =
    slug.length > 1 && slug[slug.length - 1] === 'image.png'
      ? slug.slice(0, -1)
      : slug;

  const page = source.getPage(cleanSlug);
  if (!page) notFound();

  return new ImageResponse(
    <DefaultImage title={page.data.title} description={page.data.description} site={appName} />,
    {
      width: 1200,
      height: 630,
    },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: getPageImage(page).segments,
  }));
}
