import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { broadcastRealtimeEvent } from "@/lib/realtime";

// GET /api/tasks/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, type: true } },
      assignedTo: { select: { id: true, name: true, email: true, department: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Employee can view only their own assigned task
  if (user.role === "EMPLOYEE" && task.assignedToId !== user.userId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json({ task });
}

// PUT /api/tasks/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  const existing = await prisma.task.findUnique({
    where: { id },
    include: { assignedTo: true, project: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await req.json();

  // Employee restriction: can only update status on their own task per Section 3.5
  if (user.role === "EMPLOYEE") {
    if (existing.assignedToId !== user.userId) {
      return NextResponse.json({ error: "You can only update status on your own assigned tasks" }, { status: 403 });
    }

    if (!body.status) {
      return NextResponse.json({ error: "Employees can only modify task status" }, { status: 400 });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { status: body.status },
      include: {
        project: { select: { id: true, name: true, type: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "TASK_STATUS_CHANGED",
        details: `Employee ${user.name} moved task "${updated.title}" to ${updated.status}`,
      },
    });

    return NextResponse.json({ success: true, task: updated });
  }

  // Admin & Manager: full edit
  const updateData: any = {};
  if (body.title) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.projectId) updateData.projectId = body.projectId;
  if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId || null;
  if (body.status) updateData.status = body.status;
  if (body.priority) updateData.priority = body.priority;
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      project: { select: { id: true, name: true, type: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  // If reassigned to someone else, trigger notification
  if (body.assignedToId && body.assignedToId !== existing.assignedToId) {
    await prisma.notification.create({
      data: {
        userId: body.assignedToId,
        title: "Task Reassigned",
        message: `Task "${updated.title}" was reassigned to you`,
        type: "TASK_ASSIGNED",
        link: "/tasks",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "TASK_UPDATED",
      details: `Updated task "${updated.title}" (Status: ${updated.status}, Priority: ${updated.priority})`,
    },
  });

  broadcastRealtimeEvent("TASK_UPDATED", { id: updated.id, status: updated.status });

  return NextResponse.json({ success: true, task: updated });
}

// DELETE /api/tasks/[id] - Admin & Manager
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Forbidden: Only Admin & Manager can delete tasks" }, { status: status || 403 });
  }

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "TASK_DELETED",
      details: `Deleted task "${existing.title}"`,
    },
  });

  return NextResponse.json({ success: true, message: `Task "${existing.title}" deleted` });
}
