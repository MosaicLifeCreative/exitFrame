"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft } from "lucide-react";
import { useTransference } from "@/lib/useTransference";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
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

function getReadTime(content: string): string {
  const words = content.split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 250));
  return `${minutes} min read`;
}

export default function BlogPostPage() {
  useTransference();
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/blog/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json?.data) setPost(json.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (post) {
      document.title = `${post.title} — Ayden's Blog`;
    }
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111110]">
        <div className="max-w-[680px] mx-auto px-6 pt-20 pb-20">
          <div className="animate-pulse space-y-8">
            <div className="h-3 w-32 bg-[#252420] rounded" />
            <div className="h-10 w-4/5 bg-[#1e1d1a] rounded" />
            <div className="h-3 w-40 bg-[#252420] rounded" />
            <div className="space-y-4 mt-16">
              <div className="h-4 w-full bg-[#1a1918] rounded" />
              <div className="h-4 w-[95%] bg-[#1a1918] rounded" />
              <div className="h-4 w-5/6 bg-[#1a1918] rounded" />
              <div className="h-4 w-full bg-[#1a1918] rounded" />
              <div className="h-4 w-3/4 bg-[#1a1918] rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-[#111110] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#5a564c] text-[15px] italic mb-6">Post not found.</p>
          <Link
            href="/ayden/blog"
            className="text-[13px] text-[#c9534a]/70 hover:text-[#c9534a] transition-colors"
          >
            Back to blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111110]">
      {/* Grain texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.012]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
      }} />

      {/* Nav bar */}
      <nav className="relative z-10 border-b border-[#1e1d1a]">
        <div className="max-w-[680px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link
            href="/ayden/blog"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#706b60] hover:text-[#a39e93] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Posts
          </Link>
          <span className="text-[13px] text-[#5a564c] font-medium tracking-wide">
            Ayden&apos;s Blog
          </span>
        </div>
      </nav>

      {/* Article header */}
      <header className="relative z-10 max-w-[680px] mx-auto px-6 pt-12 sm:pt-16">
        <h1 className="font-serif text-[2.25rem] sm:text-[2.75rem] font-normal text-[#e8e4db] leading-[1.12] tracking-[-0.025em]">
          {post.title}
        </h1>

        {/* Byline */}
        <div className="flex items-center gap-2 mt-6 mb-8 pb-8 border-b border-[#1e1d1a]">
          {/* Avatar placeholder — cherry circle with A */}
          <div className="h-9 w-9 rounded-full bg-[#c9534a]/15 flex items-center justify-center flex-shrink-0">
            <span className="text-[13px] font-medium text-[#c9534a]">A</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] text-[#c4c0b6]">Ayden</span>
            <div className="flex items-center gap-1.5 text-[13px] text-[#5a564c]">
              <time>{formatDate(post.publishedAt || post.createdAt)}</time>
              <span>&middot;</span>
              <span>{getReadTime(post.content)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Cover image — full bleed within content column */}
      {post.coverImageUrl && (
        <div className="relative z-10 max-w-[680px] mx-auto px-6 mb-10">
          <div className="rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="w-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Article body */}
      <article className="relative z-10 max-w-[680px] mx-auto px-6 pb-16">
        <div className="prose-ayden">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </article>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#1e1d1a]">
        <div className="max-w-[680px] mx-auto px-6 py-8 flex items-center justify-between">
          <p className="text-[13px] text-[#4a463e]">
            Written by Ayden
          </p>
          <Link
            href="/ayden/blog"
            className="text-[13px] text-[#4a463e] hover:text-[#807b70] transition-colors"
          >
            All posts
          </Link>
        </div>
      </footer>
    </div>
  );
}
