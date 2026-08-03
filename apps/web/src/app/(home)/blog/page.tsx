import Link from 'next/link';
import { blogSource } from '@/lib/source';
import { baseUrl } from '@/lib/shared';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Latest articles about TypeScript error handling, exception chaining, and best practices with @deessejs/errors.',
  alternates: {
    canonical: `${baseUrl}/blog`,
  },
};

function getName(path: string) {
  return (
    path
      .split('/')
      .pop()
      ?.replace(/\.[^.]+$/, '') ?? path
  );
}

export default function Page() {
  const posts = [...blogSource.getPages()].sort(
    (a, b) =>
      new Date(b.data.date ?? getName(b.path)).getTime() -
      new Date(a.data.date ?? getName(a.path)).getTime()
  );

  return (
    <main className="mx-auto w-full max-w-page px-4 pb-12 md:py-12">
      {/* Hero Section */}
      <div className="relative mb-8">
        <h1 className="text-3xl font-semibold mb-2">@deessejs/errors Blog</h1>
        <p className="text-fd-muted-foreground">
          Latest articles about TypeScript error handling, exception chaining, and best practices.
        </p>
      </div>

      {/* Post Grid */}
      {posts.length === 0 ? (
        <div className="text-center py-12 text-fd-muted-foreground">
          <p>No blog posts yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.url}
              href={post.url}
              className="flex flex-col bg-fd-card rounded-xl border p-4 transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <h2 className="font-medium mb-2 line-clamp-2">{post.data.title}</h2>
              <p className="text-sm text-fd-muted-foreground mb-4 line-clamp-2">
                {post.data.description}
              </p>
              <time className="text-xs text-fd-muted-foreground mt-auto">
                {new Date(post.data.date ?? getName(post.path)).toDateString()}
              </time>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
