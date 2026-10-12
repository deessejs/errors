'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';

import { GithubIcon, DeessejsMark } from '@/components/icons/brand';
import { NavSections } from './nav-sections';
import { MobileNavigation } from './mobile-navigation';

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <a href="#home-content" className="home-skip-link">
        Skip to content
      </a>
      <div className="mx-auto container px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-3 px-6 md:px-8 lg:px-10">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-lg"
              aria-label="@deessejs/errors home"
            >
              <DeessejsMark className="h-[18px] w-5" />
              <span>DeesseJS / Errors</span>
            </Link>
            <div className="hidden md:block">
              <NavSections pathname={pathname} />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <a
              href="https://github.com/deessejs/errors"
              aria-label="GitHub repository"
              className="hidden size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex"
            >
              <GithubIcon className="size-4" />
            </a>
            <ThemeSwitch className="home-theme-switch" />
            <MobileNavigation />
          </div>
        </div>
      </div>
    </header>
  );
}
