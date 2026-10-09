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
    // Standard staff: sees tasks where they are primary lead OR co-assigned
    whereClause.OR = [
      { assignedToId: user.userId },
      { assignees: { contains: user.userId } },
    ];
  } else if (assignedToId) {
    whereClause.OR = [
      { assignedToId: assignedToId },
      { assignees: { contains: assignedToId } },
    ];
  }

  if (projectId) whereClause.projectId = projectId;
  if (statusFilter) whereClause.status = statusFilter;
  if (priorityFilter) whereClause.priority = priorityFilter;

  if (search) {
    const searchConditions = [
      { title: { contains: search } },
      { description: { contains: search } },
      { project: { name: { contains: search } } },
    ];
    if (whereClause.OR) {
      whereClause.AND = [
        { OR: whereClause.OR },
        { OR: searchConditions },
      ];
      delete whereClause.OR;
    } else {
      whereClause.OR = searchConditions;
    }
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

  try {
    const rawTasks = await prisma.task.findMany({
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

    // Parse assignees JSON string for each task with automatic fallback
    const tasks = rawTasks.map((t) => {
      let parsedAssignees: any[] = [];
      if (t.assignees) {
        try {
          parsedAssignees = JSON.parse(t.assignees);
        } catch {
          parsedAssignees = [];
        }
      }
      if (!parsedAssignees || parsedAssignees.length === 0) {
        if (t.assignedTo) {
          parsedAssignees = [t.assignedTo];
        }
      }
      return {
        ...t,
        assignees: parsedAssignees,
      };
    });

    return NextResponse.json({ tasks });
  } catch (err: any) {
    console.error("GET /api/tasks error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch tasks" }, { status: 500 });
  }
}

// POST /api/tasks - Admin & Manager only
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Forbidden: Only Admin & Manager can assign tasks" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { title, description, projectId, assignedToId, assigneeIds, status: taskStatus, priority, dueDate } = body;

    if (!title || !projectId) {
      return NextResponse.json({ error: "Title and Project are required" }, { status: 400 });
    }

    // Resolve multi-assignees list
    let targetAssigneeIds: string[] = [];
    if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      targetAssigneeIds = Array.from(new Set(assigneeIds.filter(Boolean)));
    } else if (assignedToId) {
      targetAssigneeIds = [assignedToId];
    }

    // Fetch user details for all assigned members
    let assignedUsers: Array<{ id: string; name: string; email: string; department?: string }> = [];
    if (targetAssigneeIds.length > 0) {
      assignedUsers = await prisma.user.findMany({
        where: { id: { in: targetAssigneeIds } },
        select: { id: true, name: true, email: true, department: true },
      });
    }

    const primaryAssigneeId = targetAssigneeIds[0] || null;
    const assigneesJson = assignedUsers.length > 0 ? JSON.stringify(assignedUsers) : null;

    const newTask = await prisma.task.create({
      data: {
        title,
        description: description || null,
        projectId,
        assignedToId: primaryAssigneeId,
        assignees: assigneesJson,
        status: taskStatus || "TODO",
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        project: { select: { id: true, name: true, type: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    // Create in-app notification for ALL assigned collaborators simultaneously
    for (const collaborator of assignedUsers) {
      if (collaborator.id !== user.userId) {
        await prisma.notification.create({
          data: {
            userId: collaborator.id,
            title: "New Task Assigned",
            message: `You were assigned to: "${newTask.title}" in project ${newTask.project.name}`,
            type: "TASK_ASSIGNED",
            link: "/tasks",
          },
        });
      }
    }

    const namesList = assignedUsers.map((u) => u.name).join(", ") || "Unassigned";

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "TASK_CREATED",
        details: `Created task "${newTask.title}" assigned to: ${namesList}`,
      },
    });

    broadcastRealtimeEvent("TASK_CREATED", { id: newTask.id, title: newTask.title });

    return NextResponse.json({
      success: true,
      task: {
        ...newTask,
        assignees: assignedUsers,
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error("Create task error:", err);
    return NextResponse.json({ error: err.message || "Failed to create task" }, { status: 500 });
  }
}
