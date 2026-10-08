import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { broadcastRealtimeEvent } from "@/lib/realtime";

// GET /api/tasks
export async function GET(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Forbidden: HR has no access to tasks" }, { status: status || 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const projectId = searchParams.get("projectId");
  const assignedToId = searchParams.get("assignedToId");
  const statusFilter = searchParams.get("status");
  const priorityFilter = searchParams.get("priority");
  const dateFilter = searchParams.get("date"); // for daily planner

  let whereClause: any = {};

  if (user.role === "EMPLOYEE") {
    // Standard staff: sees ONLY their own tasks
    whereClause.assignedToId = user.userId;
  } else if (assignedToId) {
    whereClause.assignedToId = assignedToId;
  }

  if (projectId) whereClause.projectId = projectId;
  if (statusFilter) whereClause.status = statusFilter;
  if (priorityFilter) whereClause.priority = priorityFilter;

  if (search) {
    whereClause.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { project: { name: { contains: search } } },
    ];
  }

  // Daily planner date filtering: tasks due on or before specified day
  if (dateFilter) {
    const targetDate = new Date(dateFilter);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    whereClause.dueDate = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: {
      project: { select: { id: true, name: true, type: true, status: true } },
      assignedTo: { select: { id: true, name: true, email: true, department: true } },
    },
    orderBy: [
      { priority: "desc" },
      { dueDate: "asc" },
    ],
  });

  return NextResponse.json({ tasks });
}

// POST /api/tasks - Admin & Manager only
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Forbidden: Only Admin & Manager can assign tasks" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { title, description, projectId, assignedToId, status: taskStatus, priority, dueDate } = body;

    if (!title || !projectId) {
      return NextResponse.json({ error: "Title and Project are required" }, { status: 400 });
    }

    const newTask = await prisma.task.create({
      data: {
        title,
        description: description || null,
        projectId,
        assignedToId: assignedToId || null,
        status: taskStatus || "TODO",
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        project: { select: { id: true, name: true, type: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    // Create in-app notification for the assigned employee
    if (newTask.assignedToId) {
      await prisma.notification.create({
        data: {
          userId: newTask.assignedToId,
          title: "New Task Assigned",
          message: `You were assigned task: "${newTask.title}" in project ${newTask.project.name}`,
          type: "TASK_ASSIGNED",
          link: "/tasks",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "TASK_CREATED",
        details: `Created task "${newTask.title}" assigned to ${newTask.assignedTo?.name || "Unassigned"}`,
      },
    });

    broadcastRealtimeEvent("TASK_CREATED", { id: newTask.id, title: newTask.title });

    return NextResponse.json({ success: true, task: newTask }, { status: 201 });
  } catch (err: any) {
    console.error("Create task error:", err);
    return NextResponse.json({ error: err.message || "Failed to create task" }, { status: 500 });
  }
}
