import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';
import { blogSource } from '@/lib/source';
import { baseUrl } from '@/lib/shared';
import { getMDXComponents } from '@/components/mdx';
import { ShareButton } from './page.client';

export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const params = await props.params;
  const page = blogSource.getPage([params.slug]);

  if (!page) notFound();

  const MDX = page.data.body;
  const toc = page.data.toc;

  return (
    <article className="flex flex-col mx-auto w-full max-w-[800px] px-4 py-8">
      {/* Author& Date */}
      <div className="flex flex-row gap-8 text-sm mb-8">
        <div>
          <p className="mb-1 text-fd-muted-foreground">Written by</p>
          <p className="font-medium">{page.data.author}</p>
        </div>
        <div>
          <p className="mb-1 text-fd-muted-foreground">Published</p>
          <p className="font-medium">
            {new Date(page.data.date).toDateString()}
          </p>
        </div>
      </div>

      {/* Title & Description */}
      <h1 className="text-3xl font-semibold mb-4">{page.data.title}</h1>
      <p className="text-fd-muted-foreground mb-8">{page.data.description}</p>

      {/* Actions */}
      <div className="flex flex-row gap-2 mb-8">
        <ShareButton url={page.url} />
        <Link
          href="/blog"
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-fd-accent"
        >
          Back to Blog
        </Link>
      </div>

      {/* Content */}
      <div className="prose min-w-0 flex-1">
        <InlineTOC items={toc} />
        <MDX components={getMDXComponents()} />
      </div>

      {/* Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: page.data.title,
            description: page.data.description,
            datePublished: page.data.date,
            dateModified: page.data.date,
            author: {
              '@type': 'Person',
              name: page.data.author,
            },
            publisher: {
              '@type': 'Organization',
              name: 'Nesalia Inc',
              logo: {
                '@type': 'ImageObject',
                url: `${baseUrl}/icon.svg`,
              },
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `${baseUrl}${page.url}`,
            },
          }).replace(/</g, '\\u003c'),
        }}
      />
    </article>
  );
}

export async function generateMetadata(props: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const params = await props.params;
  const page = blogSource.getPage([params.slug]);

  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: `${baseUrl}${page.url}`,
    },
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      type: 'article',
      publishedTime: new Date(page.data.date).toISOString(),
      authors: [page.data.author],
      images: [
        {
          url: `${baseUrl}/og/blog/${params.slug}/image.png`,
          width: 1200,
          height: 630,
          alt: page.data.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.data.title,
      description: page.data.description,
    },
  };
}

export function generateStaticParams(): { slug: string }[] {
  return blogSource.getPages().map((page) => ({
    slug: page.slugs[0],
  }));
}
