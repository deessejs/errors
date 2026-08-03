import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  const base = baseOptions();

  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...base}
      // Only show icon-type links in sidebar (filter out text links like Blog)
      links={base.links?.filter((item) => item.type === 'icon')}
    >
      {children}
    </DocsLayout>
  );
}
