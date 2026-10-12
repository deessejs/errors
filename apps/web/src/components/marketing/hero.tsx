import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CodeBlock } from '@/components/code-block';
import { Button } from '@/components/ui/button';
import { InstallCommand } from './install-command';
import { HERO_CODE } from './examples';

export function Hero() {
  return (
    <div className="px-6 pb-12 pt-16 md:px-8 sm:pb-16 sm:pt-20 lg:px-10 lg:pb-20 lg:pt-24">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <p className="home-eyebrow">@deessejs/errors</p>
        <h1 className="mt-6 text-heading-40 font-medium leading-[1.08] tracking-[-0.04em] text-balance sm:text-heading-48 lg:text-heading-56">
          Errors with structure, not strings.
        </h1>
        <p className="mt-6 max-w-2xl text-copy-16 leading-7 text-muted-foreground text-pretty sm:text-copy-18">
          A TypeScript library that gives errors fields, types, and a parent chain. Build a
          hierarchy once, narrow on it everywhere, and preserve the cause through every raise.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="home-button">
            <Link href="/docs">Read the docs</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="home-button">
            <Link href="#examples">
              View inheritance example
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
        <InstallCommand className="mt-5" />
      </div>
      <CodeBlock
        code={HERO_CODE}
        title="register-errors.ts"
        className="mx-auto mt-10 max-w-5xl lg:mt-12"
        footer={
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-copy-13 leading-5">
            <span className="text-muted-foreground">ValidationError</span>
            <span>
              {`{field:'email', reason:'invalid format'}`}{' '}
              <span className="text-muted-foreground">→</span> Field &ldquo;email&rdquo; is invalid:
              invalid format
            </span>
            <span className="text-muted-foreground">
              {`{field:'age', reason:'not a number'}`} → Field &ldquo;age&rdquo; is invalid: not a
              number
            </span>
          </div>
        }
      />
    </div>
  );
}
