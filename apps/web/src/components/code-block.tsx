import { codeToHtml } from 'shiki';
import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  size?: 'sm' | 'lg';
  unframed?: boolean;
  className?: string;
  footer?: ReactNode;
}

const sizeClasses = {
  sm: 'p-3 text-xs',
  lg: 'p-6 text-sm',
};

export async function CodeBlock({
  code,
  language = 'typescript',
  title,
  size = 'sm',
  unframed = false,
  className,
  footer,
}: CodeBlockProps) {
  const html = await codeToHtml(code, {
    lang: language,
    theme: 'github-dark',
  });
  return (
    <div
      className={cn(
        unframed
          ? 'h-full w-full'
          : 'h-full bg-fd-background w-full overflow-hidden border border-border',
        className
      )}
    >
      {title && (
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-2',
            unframed ? 'border-b border-border bg-muted/30' : 'border-b bg-muted/30'
          )}
        >
          {!unframed && (
            <>
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </>
          )}
          <span
            className={cn('font-mono text-[13px] text-fd-muted-foreground', !unframed && 'ml-2')}
          >
            {title}
          </span>
        </div>
      )}
      <div className={sizeClasses[size]} dangerouslySetInnerHTML={{ __html: html }} />
      {footer ? (
        <div
          className={cn(
            'px-4 py-3',
            unframed
              ? 'border-t border-border bg-background'
              : 'border-t border-border bg-fd-background'
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
