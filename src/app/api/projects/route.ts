import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/projects
export async function GET(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Forbidden: HR has no access to projects" }, { status: status || 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const typeFilter = searchParams.get("type");
  const statusFilter = searchParams.get("status");

  let whereClause: any = {};
  if (user.role === "EMPLOYEE") {
    // Only projects with tasks assigned to this employee
    whereClause.tasks = {
      some: { assignedToId: user.userId },
    };
  }

  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { client: { company: { contains: search } } },
    ];
  }

  if (typeFilter) whereClause.type = typeFilter;
  if (statusFilter) whereClause.status = statusFilter;

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      client: { select: { id: true, name: true, company: true } },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assignedTo: { select: { id: true, name: true } },
        },
      },
      _count: { select: { tasks: true, calendarEvents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
}

// POST /api/projects - Admin & Manager only
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Forbidden" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { name, description, type, status: projectStatus, budget, billingType, startDate, endDate, clientId } = body;

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const newProject = await prisma.project.create({
      data: {
        name,
        description: description || null,
        type: type || "SERVICE", // SERVICE or PRODUCT
        status: projectStatus || "PLANNING",
        budget: parseFloat(budget) || 0,
        billingType: billingType || "FIXED",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        clientId: clientId || null, // null for internal product work per spec
      },
      include: {
        client: { select: { id: true, name: true, company: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "PROJECT_CREATED",
        details: `Created project ${newProject.name} (${newProject.type}) with budget ₹${newProject.budget}`,
      },
    });

    return NextResponse.json({ success: true, project: newProject }, { status: 201 });
  } catch (err: any) {
    console.error("Create project error:", err);
    return NextResponse.json({ error: err.message || "Failed to create project" }, { status: 500 });
  }
}
