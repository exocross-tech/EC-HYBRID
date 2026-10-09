import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/projects/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      tasks: {
        include: {
          assignedTo: { select: { id: true, name: true, email: true, department: true } },
        },
        orderBy: { dueDate: "asc" },
      },
      calendarEvents: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (user.role === "EMPLOYEE") {
    const hasTask = project.tasks.some((t) => t.assignedToId === user.userId);
    if (!hasTask) {
      return NextResponse.json({ error: "Access denied: not assigned to this project" }, { status: 403 });
    }
  }

  return NextResponse.json({ project });
}

// PUT /api/projects/[id] - Admin & Manager only
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Forbidden" }, { status: status || 403 });
  }

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await prisma.project.update({
    where: { id },
    data: {
      name: body.name || existing.name,
      description: body.description !== undefined ? body.description : existing.description,
      requirements: body.requirements !== undefined ? body.requirements : existing.requirements,
      type: body.type || existing.type,
      status: body.status || existing.status,
      budget: body.budget !== undefined ? parseFloat(body.budget) : existing.budget,
      billingType: body.billingType || existing.billingType,
      startDate: body.startDate ? new Date(body.startDate) : existing.startDate,
      endDate: body.endDate ? new Date(body.endDate) : existing.endDate,
      clientId: body.clientId !== undefined ? (body.clientId || null) : existing.clientId,
    },
    include: {
      client: { select: { id: true, name: true, company: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "PROJECT_UPDATED",
      details: `Updated project ${updated.name} (Status: ${updated.status})`,
    },
  });

  return NextResponse.json({ success: true, project: updated });
}

export const PATCH = PUT;

// DELETE /api/projects/[id] - Admin only (Managers cannot delete records per Section 2)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Forbidden: Only Admin can delete projects" }, { status: status || 403 });
  }

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await prisma.project.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "PROJECT_DELETED",
      details: `Deleted project ${existing.name}`,
    },
  });

  return NextResponse.json({ success: true, message: `Project ${existing.name} deleted` });
}
