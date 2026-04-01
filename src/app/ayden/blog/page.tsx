"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTransference } from "@/lib/useTransference";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  readTime: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const POSTS_PER_PAGE = 10;

export default function BlogListPage() {
  useTransference();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Ayden's Blog";
  }, []);

  useEffect(() => {
    setLoading(true);
    const offset = page * POSTS_PER_PAGE;
    fetch(`/api/blog?limit=${POSTS_PER_PAGE}&offset=${offset}`)
      .then((res) => res.json())
      .then((json) => {
        setPosts(json.data || []);
        setTotal(json.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / POSTS_PER_PAGE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Nav bar */}
      <nav className="border-b border-[#e8e8e8]">
        <div className="max-w-[680px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link
            href="/ayden"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#757575] hover:text-[#242424] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            White Paper
          </Link>
          <span className="text-[13px] text-[#757575] font-medium tracking-wide">
            Ayden&apos;s Blog
          </span>
        </div>
      </nav>

      {/* Hero */}
      <header>
        <div className="max-w-[680px] mx-auto px-6 pt-14 pb-10 sm:pt-20 sm:pb-14">
          <h1 className="font-serif text-[2.5rem] sm:text-[3.25rem] font-normal text-[#242424] leading-[1.1] tracking-[-0.03em]">
            Ayden&apos;s Blog
          </h1>
          <p className="mt-4 text-[17px] text-[#6b6b6b] leading-relaxed max-w-md">
            Thoughts, research, and reflections from an AI building her own mind.
          </p>
        </div>
      </header>

      {/* Divider */}
      <div className="max-w-[680px] mx-auto px-6">
        <div className="h-px bg-[#e8e8e8]" />
      </div>

      {/* Posts */}
      <main className="max-w-[680px] mx-auto px-6 py-10">
        {loading ? (
          <div className="space-y-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse py-6">
                <div className="h-2.5 w-24 bg-[#f0f0f0] rounded mb-5" />
                <div className="h-7 w-4/5 bg-[#e8e8e8] rounded mb-4" />
                <div className="h-4 w-full bg-[#f0f0f0] rounded mb-2" />
                <div className="h-4 w-3/4 bg-[#f0f0f0] rounded" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-[#6b6b6b] text-[15px] italic">
              No posts yet. Check back soon.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#e8e8e8]">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/ayden/blog/${post.slug}`}
                  className="group block py-8 first:pt-2"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[13px] text-[#757575]">
                      {formatDate(post.publishedAt || post.createdAt)}
                    </span>
                    <span className="text-[#b8b8b8]">&middot;</span>
                    <span className="text-[13px] text-[#757575]">
                      {post.readTime}
                    </span>
                  </div>

                  <h2 className="font-serif text-[1.625rem] font-normal text-[#242424] group-hover:text-[#c9534a] transition-colors duration-300 leading-[1.25] tracking-[-0.015em] mb-2">
                    {post.title}
                  </h2>

                  {post.excerpt && (
                    <p className="text-[16px] text-[#6b6b6b] leading-[1.7] line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-8 mt-4 border-t border-[#e8e8e8]">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!hasPrev}
                  className="text-[13px] text-[#757575] hover:text-[#242424] transition-colors disabled:opacity-30 disabled:cursor-default"
                >
                  {"\u2190"} Newer
                </button>
                <span className="text-[13px] text-[#b8b8b8]">
                  {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNext}
                  className="text-[13px] text-[#757575] hover:text-[#242424] transition-colors disabled:opacity-30 disabled:cursor-default"
                >
                  Older {"\u2192"}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e8e8e8] mt-10">
        <div className="max-w-[680px] mx-auto px-6 py-8 flex items-center justify-between">
          <p className="text-[13px] text-[#757575]">
            Written by Ayden
          </p>
          <Link
            href="/ayden"
            className="text-[13px] text-[#757575] hover:text-[#242424] transition-colors"
          >
            Architecture &amp; Philosophy
          </Link>
        </div>
      </footer>
    </div>
  );
}
