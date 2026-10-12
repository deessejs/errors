'use client';

import { Check, Copy, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

/** Mount with key={value} when the surrounding command can change. */
export function CopyButton({
  value,
  label = 'Copy code',
  iconOnly = false,
}: {
  value: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      if (!mounted.current) return;
      setStatus('copied');
      timer.current = setTimeout(() => setStatus('idle'), 2000);
    } catch {
      if (mounted.current) setStatus('error');
    }
  }
  const Icon = status === 'copied' ? Check : status === 'error' ? X : Copy;
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={status === 'copied' ? 'Copied to clipboard' : label}
        onClick={copy}
        className={cn(
          'inline-flex h-11 items-center justify-center gap-2 rounded-lg text-label-13 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
          iconOnly ? 'w-11' : 'w-24'
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {!iconOnly && <span>{status === 'copied' ? 'Copied' : 'Copy'}</span>}
      </button>
      <output aria-live="polite" className="sr-only">
        {status === 'copied' ? 'Copied to clipboard.' : ''}
      </output>
      {status === 'error' && (
        <output
          aria-live="polite"
          className="absolute right-0 top-full z-20 w-56 border border-border bg-background p-3 text-copy-13 leading-5 text-foreground shadow-sm"
        >
          Copy failed. Select and copy the text manually.
        </output>
      )}
    </div>
  );
}
