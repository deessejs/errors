import type { Metadata } from 'next';

import { CtaCard } from '@/components/cta-card';
import { AppFooter } from '@/components/footers/app-footer';
import { BenefitsGrid } from '@/components/marketing/benefits-grid';
import { CodeComparison } from '@/components/marketing/code-comparison';
import { ConceptsRow } from '@/components/marketing/concepts-row';
import { GlobalLayout } from '@/components/marketing/global-layout';
import { Hero } from '@/components/marketing/hero';
import { Section } from '@/components/marketing/section';
import { SectionHeader } from '@/components/marketing/section-header';
import { baseUrl } from '@/lib/shared';

export const metadata: Metadata = {
  title: '@deessejs/errors — Errors with structure, not strings',
  description:
    'A TypeScript library that gives errors fields, types, and a parent chain. Build a hierarchy once, narrow on it everywhere, and preserve the cause through every raise.',
  keywords: [
    'typescript error handling',
    'exception chaining typescript',
    'python-style errors javascript',
    'error factory typescript',
    'structured errors typescript',
    'hierarchical error inheritance',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: '@deessejs/errors',
    title: '@deessejs/errors — Errors with structure, not strings',
    description:
      'A TypeScript library that gives errors fields, types, and a parent chain. Build a hierarchy once, narrow on it everywhere.',
  },
  twitter: {
    card: 'summary_large_image',
    title: '@deessejs/errors — Errors with structure, not strings',
    description: 'A TypeScript library that gives errors fields, types, and a parent chain.',
    creator: '@nesalia_inc',
  },
  alternates: {
    canonical: baseUrl,
  },
};

export default function HomePage() {
  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: '@deessejs/errors',
    description:
      'TypeScript error handling library with fields, inheritance, and cause chains through a function-based API.',
    url: baseUrl,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Node.js 18+',
    programmingLanguage: {
      '@type': 'ComputerLanguage',
      name: 'TypeScript',
    },
    license: 'MIT',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    downloadUrl: 'https://www.npmjs.com/package/@deessejs/errors',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <GlobalLayout>
        <main id="home-content">
          <Section>
            <Hero />
          </Section>

          <Section>
            <SectionHeader
              eyebrow="Why @deessejs/errors"
              title="Errors as values, not strings."
              subtitle="Define a name, a field shape, and a hierarchy once. Every instance is typed, every is() check narrows, every raise preserves the cause."
            />
            <BenefitsGrid />
          </Section>

          <Section id="examples">
            <SectionHeader
              eyebrow="Before & after"
              title="Same task. Structured outcomes."
              subtitle="Compare ordinary JavaScript with @deessejs/errors on three small, complete examples. The result is errors you can read, narrow, and trace."
            />
            <CodeComparison />
          </Section>

          <Section>
            <SectionHeader
              eyebrow="The shapes"
              title="Three calls. One coherent surface."
              subtitle="error() defines the factory. is() narrows the catch site. .from() / causes() thread the cause through. Everything else is the regular TypeScript you already write."
              action={{ href: '/docs/api-reference', label: 'API reference' }}
            />
            <ConceptsRow />
          </Section>

          <CtaCard noBorderB />
        </main>
      </GlobalLayout>
      <AppFooter />
    </>
  );
}
