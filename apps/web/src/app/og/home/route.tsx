import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';
import { appName } from '@/lib/shared';

export const revalidate = false;

export async function GET() {
  return new ImageResponse(
    <DefaultImage
      title="Error Handling, Reimagined."
      description="A TypeScript library bringing Python-inspired error handling to JavaScript. Exception chaining, hierarchical inheritance, and rich error semantics."
      site={appName}
    />,
    {
      width: 1200,
      height: 630,
    },
  );
}
