import { cloneElement, type HTMLAttributes, type ReactElement, type ReactNode } from 'react';

/**
 * Minimal Slot — passes props (including `className`) through to its
 * single child. Sufficient for the marketing site, which uses
 * `asChild` only with `Link` (a single React element child).
 */
export function Slot({
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  if (!children || typeof children !== 'object') {
    throw new Error('Slot requires a single React element child.');
  }
  const child = children as ReactElement<{ className?: string }>;
  return cloneElement(child, {
    ...props,
    ...(child.props as Record<string, unknown>),
    className: [props.className, (child.props as { className?: string }).className]
      .filter(Boolean)
      .join(' '),
  } as Record<string, unknown>);
}
