import { getPageImage, source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { appName, baseUrl } from '@/lib/shared';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

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

  // Load banner image
  const bannerData = await readFile(
    join(process.cwd(), 'src/public/banner.jpg'),
  );
  const bannerBase64 = `data:image/jpeg;base64,${bannerData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
        }}
      >
        {/* Banner Image */}
        <div
          style={{
            width: '100%',
            height: '45%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <img
            src={bannerBase64}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Content Section */}
        <div
          style={{
            height: '55%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '40px 60px',
            backgroundColor: '#0f172a',
          }}
        >
          {/* Documentation Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                backgroundColor: '#1e293b',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '16px',
                color: '#94a3b8',
              }}
            >
              Documentation
            </div>
          </div>

          {/* Page Title */}
          <div
            style={{
              display: 'flex',
              fontSize: '42px',
              fontWeight: 'bold',
              color: '#f1f5f9',
              lineHeight: 1.2,
            }}
          >
            {page.data.title}
          </div>

          {/* Description */}
          {page.data.description && (
            <div
              style={{
                display: 'flex',
                fontSize: '18px',
                color: '#94a3b8',
                maxWidth: '800px',
              }}
            >
              {page.data.description.substring(0, 120)}
              {page.data.description.length > 120 ? '...' : ''}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#f1f5f9',
              }}
            >
              {appName}
            </div>
            <div
              style={{
                fontSize: '16px',
                color: '#475569',
              }}
            >
              {baseUrl.replace('https://', '')}
            </div>
          </div>
        </div>
      </div>
    ),
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
