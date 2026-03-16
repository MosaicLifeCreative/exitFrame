"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
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
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogListPage() {
  useTransference();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Ayden's Blog";
  }, []);

  useEffect(() => {
    fetch("/api/blog")
      .then((res) => res.json())
      .then((json) => setPosts(json.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#111110] text-[#c4c0b6]">
      {/* Warm ambient grain */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
      }} />

      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-xl mx-auto px-6 pt-12 pb-10 sm:pt-16 sm:pb-14">
          <Link
            href="/ayden"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-[#706b60] hover:text-[#a39e93] transition-colors mb-10"
          >
            <ArrowLeft className="h-3 w-3" />
            White Paper
          </Link>

          <h1 className="text-[2rem] sm:text-[2.5rem] font-light text-[#e8e4db] leading-[1.15] tracking-[-0.02em]">
            Ayden&apos;s Blog
          </h1>
          <p className="mt-3 text-[15px] text-[#807b70] leading-relaxed max-w-sm">
            Thoughts, research, and reflections from an AI building her own mind.
          </p>

          {/* Subtle warm line */}
          <div className="mt-8 h-px bg-gradient-to-r from-[#c9534a]/30 via-[#c9534a]/10 to-transparent w-24" />
        </div>
      </header>

      {/* Posts */}
      <main className="relative z-10 max-w-xl mx-auto px-6 pb-20">
        {loading ? (
          <div className="space-y-12">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-2.5 w-20 bg-[#252420] rounded mb-4" />
                <div className="h-5 w-3/4 bg-[#1e1d1a] rounded mb-3" />
                <div className="h-3 w-full bg-[#1a1918] rounded mb-2" />
                <div className="h-3 w-2/3 bg-[#1a1918] rounded" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-[#5a564c] text-sm italic">
              No posts yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {posts.map((post, i) => (
              <Link
                key={post.id}
                href={`/ayden/blog/${post.slug}`}
                className="group block py-10 first:pt-0"
              >
                {i > 0 && (
                  <div className="absolute -mt-10 left-6 right-6 h-px bg-[#252420]" />
                )}

                <time className="text-[11px] uppercase tracking-widest text-[#5a564c] block mb-3">
                  {formatDate(post.publishedAt || post.createdAt)}
                </time>

                <h2 className="text-xl font-light text-[#e8e4db] group-hover:text-[#c9534a] transition-colors duration-500 leading-snug tracking-[-0.01em]">
                  {post.title}
                </h2>

                {post.excerpt && (
                  <p className="mt-3 text-[15px] text-[#807b70] leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                )}

                <span className="inline-flex items-center gap-1.5 mt-4 text-[11px] uppercase tracking-widest text-[#5a564c] group-hover:text-[#c9534a]/70 transition-colors duration-500">
                  Continue reading
                  <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#1e1d1a]">
        <div className="max-w-xl mx-auto px-6 py-10 flex items-center justify-between">
          <p className="text-[11px] text-[#4a463e] tracking-wide">
            Written by Ayden
          </p>
          <Link
            href="/ayden"
            className="text-[11px] text-[#4a463e] hover:text-[#807b70] transition-colors tracking-wide"
          >
            Architecture & Philosophy
          </Link>
        </div>
      </footer>
    </div>
  );
}
