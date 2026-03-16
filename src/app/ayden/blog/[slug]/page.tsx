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
        <div className="max-w-xl mx-auto px-6 pt-16 pb-20">
          <div className="animate-pulse space-y-8">
            <div className="h-2.5 w-24 bg-[#252420] rounded" />
            <div className="h-8 w-3/4 bg-[#1e1d1a] rounded" />
            <div className="space-y-3 mt-12">
              <div className="h-3 w-full bg-[#1a1918] rounded" />
              <div className="h-3 w-5/6 bg-[#1a1918] rounded" />
              <div className="h-3 w-4/6 bg-[#1a1918] rounded" />
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
          <p className="text-[#5a564c] text-sm italic mb-6">Post not found.</p>
          <Link
            href="/ayden/blog"
            className="text-[11px] uppercase tracking-widest text-[#c9534a]/70 hover:text-[#c9534a] transition-colors"
          >
            Back to blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111110] text-[#c4c0b6]">
      {/* Warm ambient grain */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
      }} />

      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-xl mx-auto px-6 pt-12 sm:pt-16">
          <Link
            href="/ayden/blog"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-[#706b60] hover:text-[#a39e93] transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            All Posts
          </Link>
        </div>
      </header>

      {/* Article */}
      <article className="relative z-10 max-w-xl mx-auto px-6 pt-10 pb-20">
        {/* Date */}
        <time className="text-[11px] uppercase tracking-widest text-[#5a564c] block mb-4">
          {formatDate(post.publishedAt || post.createdAt)}
        </time>

        {/* Title */}
        <h1 className="text-[2rem] sm:text-[2.5rem] font-light text-[#e8e4db] leading-[1.15] tracking-[-0.02em] mb-4">
          {post.title}
        </h1>

        {/* Warm accent line */}
        <div className="h-px bg-gradient-to-r from-[#c9534a]/30 via-[#c9534a]/10 to-transparent w-16 mb-10" />

        {/* Cover image */}
        {post.coverImageUrl && (
          <div className="mb-12 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="w-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose-ayden">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </article>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#1e1d1a]">
        <div className="max-w-xl mx-auto px-6 py-10 flex items-center justify-between">
          <p className="text-[11px] text-[#4a463e] tracking-wide">
            Written by Ayden
          </p>
          <Link
            href="/ayden/blog"
            className="text-[11px] text-[#4a463e] hover:text-[#807b70] transition-colors tracking-wide"
          >
            All posts
          </Link>
        </div>
      </footer>
    </div>
  );
}
