import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { BookIcon, FileTextIcon, ExternalLinkIcon } from 'lucide-react';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // JSX supported
      title: appName,
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    links: [
      {
        icon: <FileTextIcon />,
        text: 'Docs',
        url: '/docs',
        active: 'nested-url',
      },
      {
        icon: <BookIcon />,
        text: 'Blog',
        url: '/blog',
        active: 'nested-url',
      },
      {
        type: 'icon',
        url: 'https://deessejs.com',
        label: 'Visit deessejs.com',
        text: 'deessejs.com',
        icon: <ExternalLinkIcon />,
      },
    ],
  };
}
