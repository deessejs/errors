import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  bordered = true,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
  bordered?: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 p-6 md:p-8 lg:p-10',
        bordered && 'border-b border-border',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {eyebrow && <p className="home-eyebrow">{eyebrow}</p>}
        {action && (
          <Link
            href={action.href}
            className="inline-flex min-h-8 items-center gap-1 text-label-13 hover:underline underline-offset-4"
          >
            {action.label}
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        )}
      </div>
      <h2 className="max-w-3xl text-heading-32 font-medium leading-[1.15] tracking-tight text-balance lg:text-heading-40">
        {title}
      </h2>
      {subtitle && (
        <p className="max-w-2xl text-copy-16 leading-7 text-muted-foreground text-pretty">
          {subtitle}
        </p>
      )}
    </header>
  );
}
