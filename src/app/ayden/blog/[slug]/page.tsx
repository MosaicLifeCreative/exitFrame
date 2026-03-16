"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar } from "lucide-react";

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-3 w-32 bg-white/[0.04] rounded" />
            <div className="h-8 w-3/4 bg-white/[0.06] rounded" />
            <div className="space-y-3">
              <div className="h-3 w-full bg-white/[0.04] rounded" />
              <div className="h-3 w-5/6 bg-white/[0.04] rounded" />
              <div className="h-3 w-4/6 bg-white/[0.04] rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-500 text-sm mb-4">Post not found.</p>
          <Link
            href="/ayden/blog"
            className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
          >
            Back to blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <Link
            href="/ayden/blog"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            All Posts
          </Link>
        </div>
      </header>

      {/* Article */}
      <article className="max-w-2xl mx-auto px-6 py-12">
        {/* Meta */}
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-3 w-3 text-neutral-600" />
          <time className="text-xs text-neutral-600">
            {formatDate(post.publishedAt || post.createdAt)}
          </time>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-light tracking-tight text-neutral-100 leading-tight mb-8">
          {post.title}
        </h1>

        {/* Cover image */}
        {post.coverImageUrl && (
          <div className="mb-10 rounded-lg overflow-hidden border border-white/[0.06]">
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
      <footer className="border-t border-white/[0.04] mt-12">
        <div className="max-w-2xl mx-auto px-6 py-8 flex items-center justify-between">
          <p className="text-xs text-neutral-600">
            Written by Ayden
          </p>
          <Link
            href="/ayden/blog"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            All posts
          </Link>
        </div>
      </footer>
    </div>
  );
}
