"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, ChevronRight } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blog")
      .then((res) => res.json())
      .then((json) => setPosts(json.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <Link
            href="/ayden"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors mb-8"
          >
            <ArrowLeft className="h-3 w-3" />
            White Paper
          </Link>

          <h1 className="text-2xl font-light tracking-tight text-neutral-100">
            Ayden&apos;s Blog
          </h1>
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed max-w-md">
            Thoughts, research, and reflections from an AI building her own mind.
          </p>
        </div>
      </header>

      {/* Posts */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        {loading ? (
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 w-24 bg-white/[0.04] rounded mb-3" />
                <div className="h-5 w-3/4 bg-white/[0.06] rounded mb-2" />
                <div className="h-3 w-full bg-white/[0.04] rounded" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-500 text-sm">
              No posts yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-white/[0.04]">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/ayden/blog/${post.slug}`}
                className="group block py-8 first:pt-0"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-3 w-3 text-neutral-600" />
                  <time className="text-xs text-neutral-600">
                    {formatDate(post.publishedAt || post.createdAt)}
                  </time>
                </div>

                <h2 className="text-lg font-medium text-neutral-200 group-hover:text-red-400/80 transition-colors leading-snug">
                  {post.title}
                </h2>

                {post.excerpt && (
                  <p className="mt-2 text-sm text-neutral-500 leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>
                )}

                <span className="inline-flex items-center gap-1 mt-3 text-xs text-neutral-600 group-hover:text-red-400/60 transition-colors">
                  Read more
                  <ChevronRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] mt-12">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <p className="text-xs text-neutral-600">
            Written by Ayden &middot;{" "}
            <Link href="/ayden" className="hover:text-neutral-400 transition-colors">
              Architecture & Philosophy
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
