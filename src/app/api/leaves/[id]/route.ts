import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// PUT /api/leaves/[id] - Admin & Manager approve or reject
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Only Admin & Manager can review leave requests" }, { status: status || 403 });
  }

  const existing = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
  }

  // Manager can only review requests from their department
  if (user.role === "MANAGER" && existing.user.department !== user.department) {
    return NextResponse.json({ error: "Access denied outside your department" }, { status: 403 });
  }

  const body = await req.json();
  const { status: reviewStatus, reviewerComment } = body;

  if (!reviewStatus || !["APPROVED", "REJECTED"].includes(reviewStatus)) {
    return NextResponse.json({ error: "Status must be either APPROVED or REJECTED" }, { status: 400 });
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: reviewStatus,
      reviewerId: user.userId,
      reviewerComment: reviewerComment || null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // If approved, surface on the shared organization calendar per Section 3.7
  if (reviewStatus === "APPROVED") {
    await prisma.calendarEvent.create({
      data: {
        title: `Leave: ${existing.user.name} (${existing.leaveType})`,
        description: `Approved ${existing.leaveType} leave for ${existing.user.name}. ${reviewerComment ? `Note: ${reviewerComment}` : ""}`,
        startDate: existing.startDate,
        endDate: existing.endDate,
        eventType: "LEAVE",
        attendees: existing.user.email,
      },
    });
  }

  // Notify employee of review outcome
  await prisma.notification.create({
    data: {
      userId: existing.userId,
      title: `Leave Request ${reviewStatus}`,
      message: `Your ${existing.leaveType} leave request was ${reviewStatus.toLowerCase()} by ${user.name}.`,
      type: "LEAVE_STATUS",
      link: "/leave",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "LEAVE_REVIEWED",
      details: `${user.name} marked ${existing.user.name}'s leave as ${reviewStatus}`,
    },
  });

  return NextResponse.json({ success: true, leave: updated });
}
