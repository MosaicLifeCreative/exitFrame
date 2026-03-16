import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public: get a single post by slug
export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: params.slug },
    });

    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error("Failed to get blog post:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Auth'd: update a post
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const { title, content, excerpt, coverImageUrl, status } = body;

    const existing = await prisma.blogPost.findUnique({
      where: { slug: params.slug },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // If publishing for the first time, set publishedAt
    const publishedAt =
      status === "published" && !existing.publishedAt
        ? new Date()
        : existing.publishedAt;

    // If title changed, update slug
    let newSlug = existing.slug;
    if (title && title !== existing.title) {
      const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      newSlug = baseSlug;
      let suffix = 1;
      while (true) {
        const conflict = await prisma.blogPost.findUnique({
          where: { slug: newSlug },
        });
        if (!conflict || conflict.id === existing.id) break;
        newSlug = `${baseSlug}-${suffix}`;
        suffix++;
      }
    }

    const post = await prisma.blogPost.update({
      where: { slug: params.slug },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(excerpt !== undefined && { excerpt }),
        ...(coverImageUrl !== undefined && { coverImageUrl }),
        ...(status !== undefined && { status, publishedAt }),
        slug: newSlug,
      },
    });

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error("Failed to update blog post:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Auth'd: delete a post
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await prisma.blogPost.delete({
      where: { slug: params.slug },
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Failed to delete blog post:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
