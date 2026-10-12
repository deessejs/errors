import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const BENEFITS = [
  {
    title: 'Fields, not strings',
    description:
      'Define a name and a typed field shape once. Every instance carries the same structure, and TypeScript narrows on it for free.',
    href: '/docs/fields-schema',
  },
  {
    title: 'A hierarchy you can read',
    description:
      'Inherit from one or many parent errors. Compatibility is checked at compile time, so a wrong parent is a build error, not a runtime surprise.',
    href: '/docs/single-inheritance',
  },
  {
    title: 'Chained, not lost',
    description:
      'Attach the underlying cause with .from(). Traverse the full chain with causes() to see exactly what went wrong.',
    href: '/docs/from-method',
  },
] as const;

export function BenefitsGrid() {
  return (
    <div className="grid min-w-0 grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
      {BENEFITS.map((benefit) => (
        <article key={benefit.title} className="flex min-w-0 flex-col p-6 md:p-8 lg:p-10">
          <h3 className="text-heading-20 font-medium leading-7 tracking-tight">{benefit.title}</h3>
          <p className="mt-3 text-copy-16 leading-7 text-muted-foreground">{benefit.description}</p>
          <Link
            href={benefit.href}
            className="mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-6 text-label-13 hover:underline underline-offset-4"
          >
            Read the guide
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </article>
      ))}
    </div>
  );
}
