'use client';

import { useState } from 'react';
import { CopyButton } from './copy-button';
import { cn } from '@/lib/cn';

const COMMANDS = {
  humans: 'npm install @deessejs/errors',
  agents: 'pnpm add @deessejs/errors',
} as const;

export function InstallCommand({ className }: { className?: string }) {
  const [audience, setAudience] = useState<keyof typeof COMMANDS>('humans');
  const command = COMMANDS[audience];
  return (
    <div className={cn('w-full max-w-md text-left', className)}>
      <fieldset className="mb-3 flex min-w-0 justify-center gap-6 border-0 p-0">
        <legend className="sr-only">Installation audience</legend>
        {(['humans', 'agents'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={audience === value}
            onClick={() => setAudience(value)}
            className={cn(
              'min-h-11 border-b px-1 text-label-13 transition-colors',
              audience === value
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            For {value}
          </button>
        ))}
      </fieldset>
      <div className="flex min-w-0 items-center gap-3 border border-border bg-background pl-4 pr-1">
        <span aria-hidden className="font-mono text-copy-13 text-muted-foreground">
          $
        </span>
        <code
          tabIndex={0}
          aria-label="Install command"
          className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap py-4 font-mono text-copy-13 sm:text-copy-14"
        >
          {command}
        </code>
        <CopyButton key={command} value={command} label="Copy install command" iconOnly />
      </div>
    </div>
  );
}
