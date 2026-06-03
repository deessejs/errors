'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export function CtaCard() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText('npm install @deessejs/errors');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = 'npm install @deessejs/errors';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="bg-fd-background-secondary">
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="mt-10 border border-fd-border bg-fd-card rounded-none p-8">
          <h3 className="text-2xl font-bold text-fd-foreground">
            Ready to get started?
          </h3>
          <p className="mt-2 text-fd-muted-foreground">
            Install the package and start building better errors today.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 bg-fd-primary hover:bg-fd-primary/90 text-fd-primary-foreground px-6 py-3 font-medium rounded-none transition-colors"
            >
              Read the docs
            </Link>
            <button
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-2 border border-fd-border bg-fd-background hover:bg-fd-secondary text-fd-foreground px-6 py-3 font-mono text-sm rounded-none transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  npm install @deessejs/errors
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}