import { Slot } from '@/components/ui/slot';
import { cn } from '@/lib/cn';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-foreground text-background hover:bg-foreground/90',
  outline: 'border border-border bg-background text-foreground hover:bg-accent',
  ghost: 'bg-transparent text-foreground hover:bg-accent',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, asChild, size = 'md', variant = 'default', children, ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref as never}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});
