import type { ReactNode } from 'react';

/** Same container ladder as the DeesseJS marketing sites. Only the decorative layer is clipped. */
export function GlobalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="mx-auto container h-full px-4 sm:px-6">
          <div className="relative h-full">
            <div className="home-rail absolute inset-y-0 left-0 hidden w-10 -translate-x-full border-x border-border xl:block" />
            <div className="home-rail absolute inset-y-0 right-0 hidden w-10 translate-x-full border-x border-border xl:block" />
          </div>
        </div>
      </div>
      <div className="mx-auto container px-4 my-20 sm:px-6">
        <div className="border border-border bg-background">{children}</div>
      </div>
    </div>
  );
}
