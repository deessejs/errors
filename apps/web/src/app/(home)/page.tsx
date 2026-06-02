import Link from 'next/link';

// Floating squares data for blueprint aesthetic
const floatingSquares = [
  { x: 300, y: 120, opacity: 1.0, delay: 0.7 },
  { x: 220, y: 60, opacity: 0.8, delay: 0.3 },
  { x: 160, y: 160, opacity: 0.5, delay: 0.0 },
];

// Hero code example
const HERO_CODE = `import { error, raise, is, causes } from '@deessejs/errors';

const ValidationError = error({
  name: 'ValidationError',
  message: 'Field "{field}" is invalid: {reason}',
});

const err = ValidationError({
  field: 'email',
  reason: 'invalid format',
});

// Chain errors with .from()
appErr.from(err);

// Type-safe checking
if (is(err, ValidationError)) {
  console.log(err.fields.field); // "email"
}`;

// Features data
const features = [
  {
    title: 'Exception Chaining',
    description:
      'Preserve the full context of errors with the .from() method. Traverse the complete error chain to understand what went wrong.',
    href: '/docs/from-method',
  },
  {
    title: 'Hierarchical Inheritance',
    description:
      'Organize errors in meaningful hierarchies that reflect your domain. Use inheritance to categorize and handle errors by type.',
    href: '/docs/single-inheritance',
  },
  {
    title: 'Message Templates',
    description:
      'Define errors with {placeholder} templates that are replaced at runtime. Rich, contextual error messages made easy.',
    href: '/docs/message-templates',
  },
  {
    title: 'TypeScript Native',
    description:
      'Full type safety with generic error factories. Leverage TypeScript to catch errors before they happen.',
    href: '/docs/type-checking',
  },
];

// Code examples for showcase
const BEFORE_CODE = `// Traditional approach
throw new Error('Validation failed');

catch (err) {
  if (err.message.includes('Validation')) {
    // String matching... fragile!
  }
}`;

const AFTER_CODE = `// @deessejs/errors approach
raise(ValidationError({ field: 'email' }));

catch (err) {
  if (is(err, ValidationError)) {
    // Type-safe, reliable
    console.log(err.fields.field);
  }
}`;

export default function HomePage() {
  return (
    <>
      {/* Blueprint grid background */}
      <div
        className="absolute left-0 right-0 top-0 h-[1000px] pointer-events-none overflow-hidden -z-10"
        aria-hidden="true"
      >
        <div className="absolute top-[420px] left-1/2 transform -translate-y-1/3 rotate-12 scale-150 hidden lg:block">
          <svg
            width="700"
            height="850"
            viewBox="0 0 400 500"
            fill="none"
            overflow="visible"
          >
            <defs>
              <pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </pattern>
              <linearGradient
                id="fadeLeft"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
                <stop offset="35%" stopColor="currentColor" stopOpacity="0" />
                <stop offset="70%" stopColor="currentColor" stopOpacity="1" />
                <stop offset="90%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
              <mask id="fadeMask">
                <rect
                  x="-200"
                  y="-250"
                  width="800"
                  height="1000"
                  fill="url(#fadeLeft)"
                />
              </mask>
            </defs>
            <g mask="url(#fadeMask)">
              <rect
                x="-200"
                y="-250"
                width="800"
                height="1000"
                fill="url(#grid)"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-fd-background/80 backdrop-blur-sm border-b border-fd-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex h-full items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <svg
                className="size-6 shrink-0"
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
              <span className="text-2xl font-bold tracking-tight text-fd-foreground leading-8">
                @deessejs/errors
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/docs"
              className="text-sm font-medium text-fd-muted hover:text-fd-foreground transition-colors"
            >
              Documentation
            </Link>
            <a
              href="https://github.com/nesalia-inc/errors"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fd-muted hover:text-fd-foreground transition-colors"
              aria-label="GitHub"
            >
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 pt-20 lg:pt-28 pb-8 relative z-10">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[0.95] text-fd-foreground">
              Error Handling,
              <br />
              Reimagined.
            </h1>
            <p className="mt-6 max-w-2xl text-xl text-fd-muted-foreground">
              A TypeScript library that brings Python-inspired error handling to
              JavaScript. Exception chaining, hierarchical inheritance, and rich
              error semantics through a function-based API.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/docs"
                className="inline-flex items-center gap-2.5 bg-fd-primary hover:bg-fd-primary/90 rounded-none px-5 py-3 text-sm font-medium text-fd-primary-foreground transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/docs/installation"
                className="inline-flex items-center gap-2.5 border border-fd-border hover:border-fd-accent bg-fd-card hover:bg-fd-accent/50 rounded-none px-5 py-3 text-sm font-medium text-fd-muted-foreground transition-colors"
              >
                npm install @deessejs/errors
              </Link>
            </div>
          </div>
        </section>

        {/* Hero Code Section */}
        <section className="relative z-10">
          <div
            className="max-w-6xl mx-auto px-6 py-16"
            style={{
              background:
                'linear-gradient(to bottom, transparent 0%, transparent 50%, transparent 50%, transparent 100%)',
            }}
          >
            <div className="border-fd-border rounded-none overflow-hidden shadow-lg bg-fd-card/70 backdrop-blur-sm">
              {/* Code block chrome */}
              <div className="flex items-stretch border-b border-fd-border bg-fd-secondary/60">
                <div className="flex items-center gap-2 px-4 py-2.5 min-w-0">
                  <svg
                    className="w-3.5 h-3.5 text-blue-500 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="font-mono text-[13px] text-fd-muted-foreground truncate">
                    example.ts
                  </span>
                </div>
              </div>
              <pre className="p-6 text-sm leading-relaxed overflow-x-auto bg-transparent m-0 rounded-none">
                <code className="font-mono text-fd-foreground">{HERO_CODE}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-fd-background-secondary">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1] text-fd-foreground">
                Features
              </h2>
              <p className="mt-4 text-lg text-fd-muted-foreground leading-relaxed">
                Everything you need for robust error handling in TypeScript.
              </p>
            </div>

            <div className="mt-10 grid lg:grid-cols-6 gap-5">
              {/* Feature cards - spans 3 columns each */}
              {features.map((feature) => (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="lg:col-span-3 border border-fd-border bg-fd-card border-fd-border hover:border-fd-accent hover:bg-fd-secondary rounded-none p-6 transition-colors"
                >
                  <h3 className="text-xl font-semibold tracking-tight text-fd-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-[15px] text-fd-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </Link>
              ))}

              {/* Secondary features - spans 2 columns */}
              <Link
                href="/docs/type-checking"
                className="lg:col-span-2 border border-fd-border bg-fd-card border-fd-border hover:border-fd-accent hover:bg-fd-secondary rounded-none p-6 transition-colors"
              >
                <h3 className="text-xl font-semibold tracking-tight text-fd-foreground">
                  Type Guards
                </h3>
                <p className="mt-1.5 text-[15px] text-fd-muted-foreground leading-relaxed">
                  The <code className="text-sm bg-fd-muted px-1">is()</code>{' '}
                  function provides type-safe error checking.
                </p>
              </Link>

              <Link
                href="/docs/fields-schema"
                className="lg:col-span-2 border border-fd-border bg-fd-card border-fd-border hover:border-fd-accent hover:bg-fd-secondary rounded-none p-6 transition-colors"
              >
                <h3 className="text-xl font-semibold tracking-tight text-fd-foreground">
                  Schema Validation
                </h3>
                <p className="mt-1.5 text-[15px] text-fd-muted-foreground leading-relaxed">
                  Validate error fields with Standard Schema (Zod, Valibot, etc.).
                </p>
              </Link>

              <Link
                href="/docs/from-method"
                className="lg:col-span-2 border border-fd-border bg-fd-card border-fd-border hover:border-fd-accent hover:bg-fd-secondary rounded-none p-6 transition-colors"
              >
                <h3 className="text-xl font-semibold tracking-tight text-fd-foreground">
                  Cause Traversal
                </h3>
                <p className="mt-1.5 text-[15px] text-fd-muted-foreground leading-relaxed">
                  Use <code className="text-sm bg-fd-muted px-1">causes()</code> to
                  iterate the full error chain.
                </p>
              </Link>

              {/* CTA card */}
              <Link
                href="/docs"
                className="group lg:col-span-2 border-fd-border bg-fd-primary hover:bg-fd-primary/90 rounded-none p-6 transition-colors"
              >
                <h3 className="text-xl font-semibold tracking-tight text-fd-primary-foreground">
                  Explore the docs
                </h3>
                <p className="mt-1.5 text-base text-fd-secondary-foreground leading-relaxed">
                  Learn how to build robust error handling in your TypeScript
                  projects.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-fd-primary-foreground">
                  Read the docs <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Before/After Comparison */}
        <section className="bg-fd-background">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="max-w-2xl mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1] text-fd-foreground">
                From fragile to robust.
              </h2>
              <p className="mt-4 text-lg text-fd-muted-foreground leading-relaxed">
                Stop relying on fragile string matching. Get type-safe, structured
                errors that make debugging a breeze.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Before */}
              <div className="border-fd-border rounded-none overflow-hidden">
                <div className="border-b border-fd-border bg-fd-muted px-4 py-2.5">
                  <span className="text-sm font-medium text-fd-destructive">
                    Before
                  </span>
                </div>
                <pre className="p-6 text-sm leading-relaxed overflow-x-auto bg-fd-background m-0 rounded-none">
                  <code className="font-mono text-fd-muted-foreground">{BEFORE_CODE}</code>
                </pre>
              </div>

              {/* After */}
              <div className="border-fd-border rounded-none overflow-hidden">
                <div className="border-b border-fd-border bg-fd-accent/30 px-4 py-2.5">
                  <span className="text-sm font-medium text-fd-primary">
                    @deessejs/errors
                  </span>
                </div>
                <pre className="p-6 text-sm leading-relaxed overflow-x-auto bg-fd-background m-0 rounded-none">
                  <code className="font-mono text-fd-foreground">{AFTER_CODE}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Install Section */}
        <section className="bg-fd-background-secondary">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1] text-fd-foreground">
                Get started in seconds.
              </h2>
              <p className="mt-4 text-lg text-fd-muted-foreground leading-relaxed">
                Install the package and start building better errors today.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4">
              <div className="inline-flex items-center gap-3 bg-fd-primary text-fd-primary-foreground px-5 py-3 font-mono text-sm rounded-none">
                <span className="text-fd-muted">$</span>
                <span>npm install @deessejs/errors</span>
              </div>
              <div className="inline-flex items-center gap-3 bg-fd-background border-fd-border text-fd-muted-foreground px-5 py-3 font-mono text-sm rounded-none">
                <span className="text-fd-muted">$</span>
                <span>pnpm add @deessejs/errors</span>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 text-sm font-medium text-fd-muted hover:text-fd-foreground transition-colors"
              >
                Read the full documentation
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
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
          <a
            href="https://github.com/nesalia-inc/errors"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-fd-muted hover:text-fd-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </>
  );
}