import { ImageResponse } from 'next/og';
import { appName } from '@/lib/shared';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export const alt = '@deessejs/errors - TypeScript Error Handling Library';

export default async function Image() {
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
            height: '55%',
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

        {/* Bottom Section */}
        <div
          style={{
            height: '45%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px',
            backgroundColor: '#0f172a',
          }}
        >
          {/* Library Name */}
          <div
            style={{
              display: 'flex',
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#f1f5f9',
              marginBottom: '12px',
            }}
          >
            {appName}
          </div>

          {/* Short Description */}
          <div
            style={{
              display: 'flex',
              fontSize: '22px',
              color: '#94a3b8',
              textAlign: 'center',
            }}
          >
            Exception chaining • Hierarchical inheritance • Rich error semantics
          </div>

          {/* Hashtags */}
          <div
            style={{
              display: 'flex',
              fontSize: '18px',
              color: '#64748b',
              marginTop: '16px',
            }}
          >
            #TypeScript #ErrorHandling #NodeJS
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}