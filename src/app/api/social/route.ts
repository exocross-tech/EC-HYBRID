import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/social
export async function GET(req: NextRequest) {
  const { error, status } = await requireAuth(["ADMIN", "MANAGER", "HR", "EMPLOYEE"]);
  if (error) {
    return NextResponse.json({ error }, { status: status || 403 });
  }

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const postStatus = searchParams.get("status");

  let whereClause: any = {};
  if (platform && platform !== "ALL") whereClause.platform = platform;
  if (postStatus && postStatus !== "ALL") whereClause.status = postStatus;

  try {
    const posts = await prisma.socialPost.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    // Compute aggregated analytics
    const allPosts = await prisma.socialPost.findMany();
    const published = allPosts.filter((p) => p.status === "PUBLISHED");
    const scheduled = allPosts.filter((p) => p.status === "SCHEDULED");
    const drafts = allPosts.filter((p) => p.status === "DRAFT");

    const totalLikes = published.reduce((acc, p) => acc + p.likes, 0);
    const totalShares = published.reduce((acc, p) => acc + p.shares, 0);
    const totalClicks = published.reduce((acc, p) => acc + p.clicks, 0);
    const estimatedReach = totalClicks * 12 + totalLikes * 5;

    return NextResponse.json({
      posts,
      stats: {
        total: allPosts.length,
        publishedCount: published.length,
        scheduledCount: scheduled.length,
        draftsCount: drafts.length,
        totalLikes,
        totalShares,
        totalClicks,
        estimatedReach,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/social - Admin, Manager & Employee can create marketing posts
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { platform, content, scheduledFor, status: postStatus } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Post content is required" }, { status: 400 });
    }

    const state = postStatus || (scheduledFor ? "SCHEDULED" : "PUBLISHED");

    // Simulated engagement generation on instant publish
    const initialLikes = state === "PUBLISHED" ? Math.floor(Math.random() * 45) + 12 : 0;
    const initialShares = state === "PUBLISHED" ? Math.floor(Math.random() * 12) + 2 : 0;
    const initialClicks = state === "PUBLISHED" ? Math.floor(Math.random() * 85) + 20 : 0;

    const post = await prisma.socialPost.create({
      data: {
        platform: platform || "LINKEDIN",
        content: content.trim(),
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: state,
        publishedAt: state === "PUBLISHED" ? new Date() : null,
        likes: initialLikes,
        shares: initialShares,
        clicks: initialClicks,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "SOCIAL_POST_CREATED",
        details: `Created ${post.platform} post (${post.status})`,
      },
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
