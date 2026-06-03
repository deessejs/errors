import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-fd-border bg-fd-background">
      <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5"
            viewBox="0 0 108 108"
            fill="none"
            aria-hidden="true"
          >
            <rect width="108" height="108" fill="currentColor" />
            <rect
              width="18"
              height="18"
              transform="matrix(-1 0 0 1 72 18)"
              fill="currentColor"
            />
            <rect
              width="18"
              height="18"
              transform="matrix(-1 0 0 1 54 72)"
              fill="currentColor"
            />
            <rect
              width="18"
              height="18"
              transform="matrix(-1 0 0 1 54 36)"
              fill="currentColor"
            />
            <rect
              width="18"
              height="18"
              transform="matrix(-1 0 0 1 72 54)"
              fill="currentColor"
            />
          </svg>
          <span className="text-sm text-fd-muted">
            @deessejs/errors — MIT License
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/docs"
            className="text-sm text-fd-muted hover:text-fd-foreground transition-colors"
          >
            Docs
          </Link>
          <a
            href="https://github.com/nesalia-inc/errors"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-fd-muted hover:text-fd-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}