import { ImageResponse } from 'next/og';
import { appName, baseUrl } from '@/lib/shared';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export const alt = '@deessejs/errors - TypeScript Error Handling Reimagined';

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
            height: '60%',
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

        {/* Content Overlay at Bottom */}
        <div
          style={{
            height: '40%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '40px 60px',
            backgroundColor: '#0f172a',
          }}
        >
          {/* Library Name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#f1f5f9',
              }}
            >
              {appName}
            </span>
          </div>

          {/* Tagline */}
          <div
            style={{
              display: 'flex',
              fontSize: '24px',
              color: '#94a3b8',
            }}
          >
            TypeScript Error Handling Reimagined
          </div>

          {/* NPM Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#1e293b',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '18px',
                color: '#94a3b8',
              }}
            >
              npm install @deessejs/errors
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}