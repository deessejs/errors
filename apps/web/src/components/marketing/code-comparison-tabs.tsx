'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Tabs panel for the before/after code comparison. Client component
 * because it owns the active-tab state; the snippets themselves are
 * server-rendered children.
 *
 * Self-contained (no radix dependency): the marketing surface is
 * small enough that the few interactions we need — a tab list with
 * arrow-key support and per-tab content — fit on screen without an
 * external primitive.
 */
export function CodeComparisonTabs({
  examples,
}: {
  examples: ReadonlyArray<{
    id: string;
    label: string;
    description: string;
    before: ReactNode;
    after: ReactNode;
  }>;
}) {
  const [active, setActive] = useState<string>(examples[0]?.id ?? '');
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (index + dir + examples.length) % examples.length;
    setActive(examples[next]?.id ?? '');
    const nextId = `tab-${examples[next]?.id}`;
    document.getElementById(nextId)?.focus();
  };
  return (
    <div className="gap-0">
      <div
        role="tablist"
        aria-label="Code examples"
        className="min-w-0 overflow-x-auto border-b border-border px-6 md:px-8 lg:px-10"
      >
        <div className="flex h-auto items-center justify-start gap-6">
          {examples.map((example, index) => {
            const selected = example.id === active;
            return (
              <button
                key={example.id}
                id={`tab-${example.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(example.id)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={cn(
                  'min-h-12 flex-none border-b-2 px-0 py-3 text-label-13 transition-colors',
                  selected
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {example.label}
              </button>
            );
          })}
        </div>
      </div>
      {examples.map((example) => {
        if (example.id !== active) return null;
        return (
          <div key={example.id} role="tabpanel" aria-labelledby={`tab-${example.id}`}>
            <p className="border-b border-border bg-muted/30 px-6 py-4 text-copy-14 leading-6 text-muted-foreground md:px-8 lg:px-10">
              {example.description}
            </p>
            <div className="grid min-w-0 grid-cols-1 divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {example.before}
              {example.after}
            </div>
          </div>
        );
      })}
    </div>
  );
}
