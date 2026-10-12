'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

type NavItem = {
  label: string;
  href: string;
  description?: string;
  external?: boolean;
};

type NavCategory = {
  label: string;
  items: ReadonlyArray<NavItem>;
};

type NavSection = {
  label: string;
  href?: string;
  external?: boolean;
  categories?: ReadonlyArray<NavCategory>;
};

/**
 * Single source of truth for the home page nav. Both the desktop
 * mega-menu and the mobile drawer read from this list.
 *
 * The list is adapted from the deessejs main site so the two
 * surfaces read as one product. Cross-site links (Ecosystem, DeesseJS
 * surface) open in a new tab. Destinations that do not exist on
 * this errors site are kept as placeholders that match the deessejs
 * source: the user lands on a future page or a 404, but the nav
 * structure stays stable.
 */
const NAV_SECTIONS: ReadonlyArray<NavSection> = [
  {
    label: 'Learn',
    categories: [
      {
        label: 'Documentation',
        items: [
          { label: 'Getting started', href: '/docs', description: 'Install and configure' },
          {
            label: 'API reference',
            href: '/docs/api-reference',
            description: 'The full @deessejs/errors surface',
          },
          {
            label: 'Recipes',
            href: '/docs/recipes',
            description: 'Common patterns for real apps',
          },
        ],
      },
      {
        label: 'Concepts',
        items: [
          {
            label: 'Error factories',
            href: '/docs/error-factory',
            description: 'How error() works',
          },
          {
            label: 'Inheritance',
            href: '/docs/single-inheritance',
            description: 'Hierarchies, statically checked',
          },
          {
            label: 'Cause chains',
            href: '/docs/from-method',
            description: '.from() and causes()',
          },
        ],
      },
      {
        label: 'Reference',
        items: [
          {
            label: 'Type checking',
            href: '/docs/type-checking',
            description: 'Narrowing with is()',
          },
          {
            label: 'Fields & schema',
            href: '/docs/fields-schema',
            description: 'Standard Schema validation',
          },
          {
            label: 'Message templates',
            href: '/docs/message-templates',
            description: 'Render the message at instantiation',
          },
        ],
      },
    ],
  },
  {
    label: 'Resources',
    categories: [
      {
        label: 'Site',
        items: [
          { label: 'Blog', href: '/blog', description: 'Posts and announcements' },
          { label: 'Changelog', href: 'https://github.com/deessejs/errors/releases' },
          {
            label: 'GitHub',
            href: 'https://github.com/deessejs/errors',
            description: 'Source, issues, RFCs',
            external: true,
          },
        ],
      },
      {
        label: 'Ecosystem',
        items: [
          {
            label: 'DeesseJS',
            href: 'https://deessejs.com',
            description: 'The platform',
            external: true,
          },
          {
            label: 'FP',
            href: 'https://fp.deessejs.com',
            description: 'Result, Maybe, Unit',
            external: true,
          },
          {
            label: 'DRPC',
            href: 'https://drpc.deessejs.com',
            description: 'Durable RPC for agents',
            external: true,
          },
          {
            label: 'Collections',
            href: 'https://collections.deessejs.com',
            description: 'Type-safe data access',
            external: true,
          },
        ],
      },
    ],
  },
  { label: 'Docs', href: '/docs' },
  { label: 'Blog', href: '/blog' },
];

export const isNavActive = (pathname: string, href: string): boolean => {
  if (href === '/') return pathname === '/';
  if (href.startsWith('#') || href.startsWith('http')) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
};

const externalProps = (external?: boolean) =>
  external ? ({ target: '_blank', rel: 'noopener noreferrer' } as const) : ({} as const);

/** Desktop — top-level links, mega-menu for sections with `categories`. */
export function NavSections({ pathname }: { pathname: string }) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const open = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenLabel(label);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenLabel(null), 120);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      {NAV_SECTIONS.map((section) => {
        if (!section.categories) {
          const active = section.href ? isNavActive(pathname, section.href) : false;
          return (
            <Link
              key={section.label}
              href={section.href ?? '#'}
              className={cn(
                'inline-flex h-9 items-center rounded-md px-2.5 text-sm font-medium transition-colors',
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground focus-visible:text-foreground'
              )}
              {...externalProps(section.external)}
            >
              {section.label}
            </Link>
          );
        }
        const open_ = openLabel === section.label;
        return (
          <div
            key={section.label}
            className="relative"
            onMouseEnter={() => open(section.label)}
            onMouseLeave={scheduleClose}
            onFocus={() => open(section.label)}
            onBlur={scheduleClose}
          >
            <button
              type="button"
              aria-expanded={open_}
              aria-haspopup="menu"
              className={cn(
                'inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-sm font-medium transition-colors',
                open_
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground focus-visible:text-foreground'
              )}
            >
              {section.label}
              <ChevronDown
                aria-hidden
                className={cn('size-3.5 transition-transform', open_ ? 'rotate-180' : 'rotate-0')}
              />
            </button>
            {open_ && (
              <div
                role="menu"
                aria-label={section.label}
                className={cn(
                  'fp-nav-content absolute left-0 top-full z-50 mt-1 grid gap-6 p-4',
                  (section.categories?.length ?? 0) >= 3
                    ? 'w-[640px] grid-cols-3'
                    : (section.categories?.length ?? 0) === 2
                      ? 'w-[480px] grid-cols-2'
                      : 'w-[280px] grid-cols-1'
                )}
              >
                {section.categories?.map((category) => (
                  <div key={category.label} className="flex flex-col gap-2">
                    <span className="fp-nav-eyebrow">{category.label}</span>
                    <ul className="flex flex-col gap-1">
                      {category.items.map((item) => (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            className="fp-nav-item"
                            {...externalProps(item.external)}
                          >
                            <span className="text-sm font-medium">{item.label}</span>
                            {item.description ? (
                              <span className="fp-nav-item-desc">{item.description}</span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Mobile — accordion-style list using <details>/<summary>. */
export function NavSectionsMobile({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Primary mobile" className="flex flex-col gap-6">
      {NAV_SECTIONS.map((section) => {
        if (!section.categories) {
          const active = section.href ? isNavActive(pathname, section.href) : false;
          return (
            <Link
              key={section.label}
              href={section.href ?? '#'}
              onClick={onNavigate}
              className={cn(
                'text-sm font-medium',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              {...externalProps(section.external)}
            >
              {section.label}
            </Link>
          );
        }
        return (
          <details key={section.label} className="group">
            <summary className="fp-mobile-trigger cursor-pointer list-none">
              {section.label}
              <span aria-hidden className="fp-mobile-chevron group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="flex flex-col gap-3 pt-2">
              {section.categories.map((category) => (
                <div key={category.label} className="flex flex-col gap-1">
                  <span className="fp-mobile-eyebrow">{category.label}</span>
                  <ul className="flex flex-col gap-1">
                    {category.items.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          className="text-sm text-foreground transition-colors hover:text-foreground/70"
                          {...externalProps(item.external)}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </nav>
  );
}
