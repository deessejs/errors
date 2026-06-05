import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { blogSource } from '@/lib/source';
import { baseUrl } from '@/lib/shared';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/og/blog/[slug]'>) {
  const { slug } = await params;
  const page = blogSource.getPage([slug]);

  if (!page) notFound();

  const bannerData = await readFile(join(process.cwd(), 'src/public/banner.jpg'));
  const bannerBase64 = `data:image/jpeg;base64,${bannerData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          backgroundColor: '#0f172a',
        }}
      >
        {/* Banner */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '50%',
          }}
        >
          <img
            src={bannerBase64}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '40px',
            height: '50%',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '14px',
              color: '#94a3b8',
              marginBottom: '12px',
            }}
          >
            {new Date(page.data.date).toDateString()}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#f1f5f9',
              lineHeight: 1.2,
            }}
          >
            {page.data.title}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '18px',
              color: '#94a3b8',
              marginTop: '12px',
            }}
          >
            {page.data.description}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

export function generateStaticParams(): { slug: string }[] {
  return blogSource.getPages().map((page) => ({
    slug: page.slugs[0],
  }));
}
