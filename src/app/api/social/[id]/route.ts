import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// PUT /api/social/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error) {
    return NextResponse.json({ error }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const updateData: any = {};

    if (body.content !== undefined) updateData.content = body.content.trim();
    if (body.platform !== undefined) updateData.platform = body.platform;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "PUBLISHED" && !updateData.publishedAt) {
        updateData.publishedAt = new Date();
        updateData.likes = Math.floor(Math.random() * 50) + 10;
        updateData.shares = Math.floor(Math.random() * 15) + 3;
        updateData.clicks = Math.floor(Math.random() * 95) + 25;
      }
    }
    if (body.scheduledFor !== undefined) {
      updateData.scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
    }

    const post = await prisma.socialPost.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, post });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/social/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error) {
    return NextResponse.json({ error }, { status: status || 403 });
  }

  try {
    await prisma.socialPost.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Post deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
