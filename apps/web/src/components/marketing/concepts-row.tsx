import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const CONCEPTS = [
  {
    title: 'error()',
    type: 'error({ name, fields, message })',
    description:
      'Define a factory once, with a name, a typed field shape, and a message template. The factory returns a callable that produces runtime instances.',
    href: '/docs/error-factory',
  },
  {
    title: 'is()',
    type: 'is(err, ErrorFactory): err is ErrorInstance',
    description:
      'A type guard that checks the error against a factory. Returns the narrowed instance, with fields you can read without a cast.',
    href: '/docs/type-checking',
  },
  {
    title: '.from() / causes()',
    type: 'err.from(cause); causes(err)',
    description:
      'Attach the original cause to an error and raise it in one expression. Walk the full chain with causes() to see the order of failures.',
    href: '/docs/from-method',
  },
] as const;

export function ConceptsRow() {
  return (
    <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
      {CONCEPTS.map((concept) => (
        <article key={concept.title} className="flex min-w-0 flex-col p-6 md:p-8 lg:p-10">
          <code className="mb-5 font-mono text-copy-13 text-muted-foreground">{concept.type}</code>
          <h3 className="text-heading-24 font-medium leading-8 tracking-tight">{concept.title}</h3>
          <p className="mt-3 text-copy-16 leading-7 text-muted-foreground">{concept.description}</p>
          <Link
            href={concept.href}
            className="mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-6 text-label-13 hover:underline underline-offset-4"
          >
            Explore {concept.title}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </article>
      ))}
    </div>
  );
}
