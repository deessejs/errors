'use client';
import { Check, Share } from 'lucide-react';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';

export function ShareButton({ url }: { url: string }) {
  const [isChecked, onCopy] = useCopyButton(() => {
    void navigator.clipboard.writeText(`${window.location.origin}${url}`);
  });

  return (
    <button
      type="button"
      className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      onClick={onCopy}
    >
      {isChecked ? <Check className="size-4" /> : <Share className="size-4" />}
      {isChecked ? 'Copied!' : 'Share'}
    </button>
  );
}
