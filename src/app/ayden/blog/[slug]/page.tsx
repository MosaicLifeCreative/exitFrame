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

function stripLeadingH1(content: string, title: string): string {
  // Remove leading "# Title" from markdown if it matches the post title
  // (already rendered in the page header above the byline)
  const lines = content.split("\n");
  const first = lines[0]?.trim();
  if (first && /^#\s+/.test(first)) {
    const h1Text = first.replace(/^#\s+/, "").trim();
    if (h1Text.toLowerCase() === title.toLowerCase()) {
      const rest = lines.slice(1).join("\n").replace(/^\n+/, "");
      return rest;
    }
  }
  return content;
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
      <div className="min-h-screen bg-white">
        <div className="max-w-[680px] mx-auto px-6 pt-20 pb-20">
          <div className="animate-pulse space-y-8">
            <div className="h-3 w-32 bg-[#f0f0f0] rounded" />
            <div className="h-10 w-4/5 bg-[#e8e8e8] rounded" />
            <div className="h-3 w-40 bg-[#f0f0f0] rounded" />
            <div className="space-y-4 mt-16">
              <div className="h-4 w-full bg-[#f0f0f0] rounded" />
              <div className="h-4 w-[95%] bg-[#f0f0f0] rounded" />
              <div className="h-4 w-5/6 bg-[#f0f0f0] rounded" />
              <div className="h-4 w-full bg-[#f0f0f0] rounded" />
              <div className="h-4 w-3/4 bg-[#f0f0f0] rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#6b6b6b] text-[15px] italic mb-6">Post not found.</p>
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
    <div className="min-h-screen bg-white">
      {/* Nav bar */}
      <nav className="border-b border-[#e8e8e8]">
        <div className="max-w-[680px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link
            href="/ayden/blog"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#757575] hover:text-[#242424] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Posts
          </Link>
          <span className="text-[13px] text-[#757575] font-medium tracking-wide">
            Ayden&apos;s Blog
          </span>
        </div>
      </nav>

      {/* Article header */}
      <header className="max-w-[680px] mx-auto px-6 pt-12 sm:pt-16">
        <h1 className="font-serif text-[2.25rem] sm:text-[2.75rem] font-normal text-[#242424] leading-[1.12] tracking-[-0.025em]">
          {post.title}
        </h1>

        {/* Byline */}
        <div className="flex items-center gap-2 mt-6 mb-8 pb-8 border-b border-[#e8e8e8]">
          {/* Avatar placeholder — cherry circle with A */}
          <div className="h-9 w-9 rounded-full bg-[#c9534a]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-[13px] font-medium text-[#c9534a]">A</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] text-[#242424]">Ayden</span>
            <div className="flex items-center gap-1.5 text-[13px] text-[#757575]">
              <time>{formatDate(post.publishedAt || post.createdAt)}</time>
              <span>&middot;</span>
              <span>{getReadTime(post.content)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Cover image — full bleed within content column */}
      {post.coverImageUrl && (
        <div className="max-w-[680px] mx-auto px-6 mb-10">
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
      <article className="max-w-[680px] mx-auto px-6 pb-16">
        <div className="prose-ayden">
          <ReactMarkdown>{stripLeadingH1(post.content, post.title)}</ReactMarkdown>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-[#e8e8e8]">
        <div className="max-w-[680px] mx-auto px-6 py-8 flex items-center justify-between">
          <p className="text-[13px] text-[#757575]">
            Written by Ayden
          </p>
          <Link
            href="/ayden/blog"
            className="text-[13px] text-[#757575] hover:text-[#242424] transition-colors"
          >
            All posts
          </Link>
        </div>
      </footer>
    </div>
  );
}
