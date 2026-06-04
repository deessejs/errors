import Link from 'next/link';
import type { Metadata } from 'next';
import { CodeBlock } from '@/components/code-block';
import { CtaCard } from '@/components/cta-card';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: '@deessejs/errors — Error Handling, Reimagined',
  description:
    '@deessejs/errors is a TypeScript library bringing Python-inspired error handling to JavaScript. Exception chaining, hierarchical inheritance, message templates, and rich error semantics through a function-based API.',
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
    url: 'https://errors.deessejs.com',
    siteName: '@deessejs/errors',
    title: '@deessejs/errors — Error Handling, Reimagined',
    description:
      'A TypeScript library bringing Python-inspired error handling to JavaScript. Exception chaining, hierarchical inheritance, and rich error semantics.',
    images: [
      {
        url: 'https://errors.deessejs.com/og/home.png',
        width: 1200,
        height: 630,
        alt: '@deessejs/errors — TypeScript Error Handling Library',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '@deessejs/errors — Error Handling, Reimagined',
    description:
      'A TypeScript library bringing Python-inspired error handling to JavaScript.',
    images: ['https://errors.deessejs.com/og/home.png'],
    creator: '@nesalia_inc',
  },
  alternates: {
    canonical: 'https://errors.deessejs.com',
  },
};

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
          <div className="max-w-6xl mx-auto px-6 py-16">
            <CodeBlock language="typescript" title="example.ts" code={HERO_CODE} />
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
                <p className="mt-1.5 text-base text-fd-primary-foreground leading-relaxed">
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
              <CodeBlock language="typescript" title="before.ts" code={BEFORE_CODE} />

              {/* After */}
              <CodeBlock language="typescript" title="after.ts" code={AFTER_CODE} />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <CtaCard />

        <Footer />
      </main>
    </>
  );
}