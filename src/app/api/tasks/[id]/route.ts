import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { broadcastRealtimeEvent } from "@/lib/realtime";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function getTaskId(context: RouteContext): Promise<string> {
  const resolved = await Promise.resolve(context.params);
  return resolved?.id || "";
}

function parseAssignees(task: any): any[] {
  let parsed: any[] = [];
  if (task.assignees) {
    try {
      parsed = JSON.parse(task.assignees);
    } catch {
      parsed = [];
    }
  }
  if (!parsed || parsed.length === 0) {
    if (task.assignedTo) {
      parsed = [task.assignedTo];
    }
  }
  return parsed;
}

// GET /api/tasks/[id]
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const id = await getTaskId(context);
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

    const assigneesList = parseAssignees(task);

    // Employee can view if they are lead or in co-assignees
    if (user.role === "EMPLOYEE") {
      const isAssigned =
        task.assignedToId === user.userId ||
        assigneesList.some((u) => u.id === user.userId);
      if (!isAssigned) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json({
      task: {
        ...task,
        assignees: assigneesList,
      },
    });
  } catch (err: any) {
    console.error("GET /api/tasks/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch task" }, { status: 500 });
  }
}

// PUT /api/tasks/[id]
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const id = await getTaskId(context);
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

    const existingAssignees = parseAssignees(existing);
    const body = await req.json();

    // Employee restriction: can only update status on tasks where they are assigned/co-assigned
    if (user.role === "EMPLOYEE") {
      const isAssigned =
        existing.assignedToId === user.userId ||
        existingAssignees.some((u) => u.id === user.userId);

      if (!isAssigned) {
        return NextResponse.json(
          { error: "You can only update status on your own assigned tasks" },
          { status: 403 }
        );
      }

      if (!body.status) {
        return NextResponse.json({ error: "Employees can only modify task status" }, { status: 400 });
      }

      const updated = await prisma.task.update({
        where: { id },
        data: { status: body.status },
        include: {
          project: { select: { id: true, name: true, type: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "TASK_STATUS_CHANGED",
          details: `Employee ${user.name} moved task "${updated.title}" to ${updated.status}`,
        },
      });

      broadcastRealtimeEvent("TASK_UPDATED", { id: updated.id, status: updated.status });

      return NextResponse.json({
        success: true,
        task: {
          ...updated,
          assignees: parseAssignees(updated),
        },
      });
    }

    // Admin & Manager: full edit
    const updateData: any = {};
    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.projectId) updateData.projectId = body.projectId;
    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;

    // Handle multi-assignees update
    let updatedAssignees: any[] = existingAssignees;
    if (body.assigneeIds !== undefined || body.assignedToId !== undefined) {
      let targetIds: string[] = [];
      if (Array.isArray(body.assigneeIds)) {
        targetIds = Array.from(new Set(body.assigneeIds.filter(Boolean)));
      } else if (body.assignedToId) {
        targetIds = [body.assignedToId];
      }

      if (targetIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: targetIds } },
          select: { id: true, name: true, email: true, department: true },
        });
        updateData.assignedToId = targetIds[0];
        updateData.assignees = JSON.stringify(users);
        updatedAssignees = users;

        // Notify any newly assigned members
        const oldIds = new Set(existingAssignees.map((u) => u.id));
        for (const u of users) {
          if (!oldIds.has(u.id) && u.id !== user.userId) {
            await prisma.notification.create({
              data: {
                userId: u.id,
                title: "Task Assigned",
                message: `You were added to task: "${existing.title}"`,
                type: "TASK_ASSIGNED",
                link: "/tasks",
              },
            });
          }
        }
      } else {
        updateData.assignedToId = null;
        updateData.assignees = null;
        updatedAssignees = [];
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true, type: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "TASK_UPDATED",
        details: `Updated task "${updated.title}" (Status: ${updated.status}, Priority: ${updated.priority})`,
      },
    });

    broadcastRealtimeEvent("TASK_UPDATED", { id: updated.id, status: updated.status });

    return NextResponse.json({
      success: true,
      task: {
        ...updated,
        assignees: updatedAssignees,
      },
    });
  } catch (err: any) {
    console.error("PUT /api/tasks/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to update task" }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Admin & Manager
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const id = await getTaskId(context);
    const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
    if (error || !user) {
      return NextResponse.json(
        { error: error || "Forbidden: Only Admin & Manager can delete tasks" },
        { status: status || 403 }
      );
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
  } catch (err: any) {
    console.error("DELETE /api/tasks/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete task" }, { status: 500 });
  }
}
