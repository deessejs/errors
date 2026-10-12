import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * Section — the shared-border wrapper for every homepage section.
 *
 * Owns the separator only. GlobalLayout owns the frame width and
 * each content component owns its padding, so neither is duplicated.
 */
export function Section({ className, ...props }: React.ComponentProps<'section'>) {
  return <section className={cn('border-b border-border', className)} {...props} />;
}
