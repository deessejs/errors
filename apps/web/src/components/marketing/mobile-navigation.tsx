'use client';

import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { NavSectionsMobile } from './nav-sections';

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <>
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-accent md:hidden"
      >
        <Menu className="size-4" aria-hidden />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className="fixed inset-0 z-50 md:hidden"
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <aside className="fp-mobile-menu absolute inset-y-0 right-0 flex w-80 max-w-[calc(100vw-32px)] flex-col border-l border-border bg-background p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-end">
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-accent"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <NavSectionsMobile pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
