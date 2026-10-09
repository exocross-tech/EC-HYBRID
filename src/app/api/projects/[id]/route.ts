import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function getProjectId(context: RouteContext): Promise<string> {
  const resolved = await Promise.resolve(context.params);
  return resolved?.id || "";
}

function parseBudget(value: any, fallback: number = 0): number {
  if (value === undefined || value === null || value === "" || value === false) {
    return fallback;
  }
  const num = typeof value === "number" ? value : parseFloat(value);
  return isNaN(num) ? fallback : num;
}

function parseDate(value: any, fallback?: Date | null): Date | null | undefined {
  if (value === undefined) return fallback;
  if (value === null || value === "" || value === false) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function parseClientId(value: any, fallback?: string | null): string | null | undefined {
  if (value === undefined) return fallback;
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

function parseString(value: any, fallback?: string | null): string | null | undefined {
  if (value === undefined) return fallback;
  if (value === null) return null;
  return String(value);
}

// GET /api/projects/[id]
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const id = await getProjectId(context);
    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

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
      // Employees are allowed to view company in-house products
      if (!hasTask && project.type !== "PRODUCT") {
        return NextResponse.json({ error: "Access denied: not assigned to this project" }, { status: 403 });
      }
    }

    return NextResponse.json({ project });
  } catch (err: any) {
    console.error("GET /api/projects/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Admin & Manager only
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const id = await getProjectId(context);
    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
    if (error || !user) {
      return NextResponse.json({ error: error || "Forbidden" }, { status: status || 403 });
    }

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    // Build update payload defensively
    const updateData: any = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name) updateData.name = name;
    }

    if (body.description !== undefined) {
      updateData.description = parseString(body.description);
    }

    if (body.requirements !== undefined) {
      updateData.requirements = parseString(body.requirements);
    }

    if (body.type !== undefined) {
      updateData.type = body.type === "PRODUCT" ? "PRODUCT" : "SERVICE";
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (body.billingType !== undefined) {
      updateData.billingType = body.billingType;
    }

    if (body.budget !== undefined) {
      updateData.budget = parseBudget(body.budget, existing.budget);
    }

    if (body.startDate !== undefined) {
      updateData.startDate = parseDate(body.startDate, existing.startDate);
    }

    if (body.endDate !== undefined) {
      updateData.endDate = parseDate(body.endDate, existing.endDate);
    }

    if (body.clientId !== undefined) {
      updateData.clientId = parseClientId(body.clientId, existing.clientId);
    }

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true, company: true } },
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "PROJECT_UPDATED",
          details: `Updated project ${updated.name} (Status: ${updated.status})`,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation warning:", auditErr);
    }

    return NextResponse.json({ success: true, project: updated });
  } catch (err: any) {
    console.error("PUT /api/projects/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update project" },
      { status: 500 }
    );
  }
}

// Explicit PATCH handler supporting partial updates (e.g. vault notes)
export async function PATCH(req: NextRequest, context: RouteContext) {
  return PUT(req, context);
}

// DELETE /api/projects/[id] - Admin only
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const id = await getProjectId(context);
    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const { error, status, user } = await requireAuth(["ADMIN"]);
    if (error || !user) {
      return NextResponse.json({ error: error || "Forbidden: Only Admin can delete projects" }, { status: status || 403 });
    }

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.delete({ where: { id } });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "PROJECT_DELETED",
          details: `Deleted project ${existing.name}`,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation warning:", auditErr);
    }

    return NextResponse.json({ success: true, message: `Project ${existing.name} deleted` });
  } catch (err: any) {
    console.error("DELETE /api/projects/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete project" },
      { status: 500 }
    );
  }
}
