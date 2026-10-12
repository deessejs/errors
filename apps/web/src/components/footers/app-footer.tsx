import Image from 'next/image';

import { GithubIcon } from '@/components/icons/brand';

import { ConwayBand } from './conway-grid';
import { FooterColumn, type FooterLink } from './footer-column';

const footerSections: ReadonlyArray<{
  heading: string;
  links: ReadonlyArray<FooterLink>;
}> = [
  {
    heading: 'Ecosystem',
    links: [
      { label: 'DeesseJS', href: 'https://deessejs.com' },
      { label: 'FP', href: 'https://fp.deessejs.com' },
      { label: 'DRPC', href: 'https://drpc.deessejs.com' },
      { label: 'Collections', href: 'https://collections.deessejs.com' },
    ],
  },
  {
    heading: 'Errors',
    links: [
      { label: 'Docs', href: '/docs' },
      { label: 'API reference', href: '/docs/api-reference' },
      { label: 'Recipes', href: '/docs/recipes' },
      { label: 'Changelog', href: 'https://github.com/deessejs/errors/releases' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'GitHub', href: 'https://github.com/deessejs/errors' },
      { label: 'npm', href: 'https://www.npmjs.com/package/@deessejs/errors' },
      { label: 'Standard Schema', href: 'https://github.com/standard-schema/standard-schema' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { label: 'Open Source Program', href: 'https://deessejs.com/oss' },
      { label: 'Github', href: 'https://github.com/deessejs' },
      { label: 'LinkedIn', href: '#' },
      { label: 'X', href: '#' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: 'https://deessejs.com/about' },
      { label: 'Manifesto', href: 'https://deessejs.com/manifesto' },
      { label: 'Enterprise', href: 'https://deessejs.com/enterprise' },
    ],
  },
  {
    heading: 'Legal & Trust',
    links: [
      { label: 'Privacy', href: 'https://deessejs.com/privacy' },
      { label: 'Terms', href: 'https://deessejs.com/terms' },
      { label: 'Security', href: 'mailto:support@deessejs.com' },
    ],
  },
];

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/icon.svg"
                alt="@deessejs/errors logo"
                width={28}
                height={28}
                className="size-7"
              />
              <span className="text-lg font-semibold text-foreground">DeesseJS / Errors</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              A TypeScript library that gives errors fields, types, and a parent chain. Build a
              hierarchy once, narrow on it everywhere.
            </p>
          </div>

          {footerSections.map((section) => (
            <FooterColumn key={section.heading} heading={section.heading} links={section.links} />
          ))}
        </div>

        {/* Conway signature band — bleeds to the container max-width,
            separates from the section grid with a border-t. */}
        <div className="mt-12">
          <ConwayBand />
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DeesseJS. All rights reserved.
          </span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/deessejs/errors"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <GithubIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
