import Link from 'next/link';

const footerLinks = {
  deessejs: [
    { label: 'Errors', href: '/docs' },
    { label: 'DRPC', href: '#' },
    { label: 'Collections', href: '#' },
    { label: 'FP', href: '#' },
    { label: 'Admin', href: '#' },
    { label: 'Cloud', href: '#' },
  ],
  learn: [
    { label: 'Docs', href: '/docs' },
    { label: 'Blog', href: '#' },
    { label: 'Changelog', href: '#' },
    { label: 'Academy', href: '#' },
    { label: 'Community', href: '#' },
  ],
  usecases: [
    { label: 'Autonomous Agents', href: '#' },
    { label: 'Workflows', href: '#' },
    { label: 'Github Bot', href: '#' },
    { label: 'Content Creation', href: '#' },
  ],
  company: [
    { label: 'About', href: '#' },
    { label: 'Help', href: '#' },
    { label: 'Legal', href: '#' },
    { label: 'Privacy Policy', href: '#' },
  ],
  community: [
    { label: 'Open Source Program', href: '#' },
    { label: 'Students', href: '#' },
    { label: 'Github', href: 'https://github.com/nesalia-inc/errors' },
    { label: 'LinkedIn', href: '#' },
    { label: 'X', href: '#' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-fd-border bg-fd-background">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-6 h-6"
                viewBox="0 0 108 108"
                fill="none"
                aria-hidden="true"
              >
                <rect width="108" height="108" fill="currentColor" />
                <rect width="18" height="18" transform="matrix(-1 0 0 1 72 18)" fill="currentColor" />
                <rect width="18" height="18" transform="matrix(-1 0 0 1 54 72)" fill="currentColor" />
                <rect width="18" height="18" transform="matrix(-1 0 0 1 54 36)" fill="currentColor" />
                <rect width="18" height="18" transform="matrix(-1 0 0 1 72 54)" fill="currentColor" />
              </svg>
              <span className="text-lg font-bold text-fd-foreground">DeesseJS</span>
            </div>
            <p className="text-sm text-fd-muted-foreground max-w-xs">
              TypeScript error handling library inspired by Python — exception chaining, hierarchical inheritance, and rich error semantics.
            </p>
          </div>

          {/* DeesseJS */}
          <div>
            <h3 className="font-semibold text-fd-foreground mb-3">DeesseJS</h3>
            <ul className="space-y-2">
              {footerLinks.deessejs.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-fd-primary hover:text-fd-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Learn */}
          <div>
            <h3 className="font-semibold text-fd-foreground mb-3">Learn</h3>
            <ul className="space-y-2">
              {footerLinks.learn.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-fd-primary hover:text-fd-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Use cases */}
          <div>
            <h3 className="font-semibold text-fd-foreground mb-3">Use cases</h3>
            <ul className="space-y-2">
              {footerLinks.usecases.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-fd-primary hover:text-fd-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-fd-foreground mb-3">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-fd-primary hover:text-fd-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-fd-foreground mb-3">Community</h3>
            <ul className="space-y-2">
              {footerLinks.community.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-sm text-fd-primary hover:text-fd-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-fd-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-fd-primary">
            @deessejs/errors — MIT License
          </span>
          <span className="text-sm text-fd-muted">
            © {new Date().getFullYear()} Nesalia Inc. All rights reserved.
          </span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/nesalia-inc/errors"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fd-primary hover:text-fd-foreground transition-colors"
              aria-label="GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}