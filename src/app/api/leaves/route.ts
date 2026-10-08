import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/leaves
export async function GET(req: NextRequest) {
  const { error, status, user } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  const typeFilter = searchParams.get("type");

  let whereClause: any = {};

  if (user.role === "EMPLOYEE") {
    // Employee sees only their own requests
    whereClause.userId = user.userId;
  } else if (user.role === "MANAGER") {
    // Manager sees leaves for their department
    whereClause.user = {
      department: user.department,
    };
  }
  // Admin and HR can see all leaves (HR needs this for payroll/leave tracking per spec)

  if (statusFilter) whereClause.status = statusFilter;
  if (typeFilter) whereClause.leaveType = typeFilter;

  const leaves = await prisma.leaveRequest.findMany({
    where: whereClause,
    include: {
      user: { select: { id: true, name: true, email: true, department: true, designation: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ leaves });
}

// POST /api/leaves - any authenticated employee can submit a leave request
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await req.json();
    const { leaveType, startDate, endDate, reason } = body;

    if (!leaveType || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Leave type, start date, and end date are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return NextResponse.json({ error: "End date cannot be earlier than start date" }, { status: 400 });
    }

    const newLeave = await prisma.leaveRequest.create({
      data: {
        userId: user.userId,
        leaveType: leaveType.toUpperCase(),
        startDate: start,
        endDate: end,
        reason: reason || null,
        status: "PENDING",
      },
      include: {
        user: { select: { id: true, name: true, email: true, department: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "LEAVE_SUBMITTED",
        details: `${user.name} submitted ${newLeave.leaveType} leave request from ${start.toDateString()} to ${end.toDateString()}`,
      },
    });

    return NextResponse.json({ success: true, leave: newLeave }, { status: 201 });
  } catch (err: any) {
    console.error("Create leave request error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit leave request" }, { status: 500 });
  }
}
