import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/clients/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  const client = await prisma.client.findFirst({
    where: { id, isDeleted: false },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      projects: {
        include: {
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              assignedTo: { select: { id: true, name: true } },
            },
          },
        },
      },
      orders: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Employee can only view if assigned to a task in one of this client's projects
  if (user.role === "EMPLOYEE") {
    const isAssigned = client.projects.some((p) =>
      p.tasks.some((t) => t.assignedTo?.id === user.userId)
    );
    if (!isAssigned) {
      return NextResponse.json({ error: "You are not assigned to work for this client" }, { status: 403 });
    }
  }

  return NextResponse.json({ client });
}

// PUT /api/clients/[id] - Admin & Manager
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Forbidden" }, { status: status || 403 });
  }

  const existing = await prisma.client.findFirst({ where: { id, isDeleted: false } });
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await prisma.client.update({
    where: { id },
    data: {
      name: body.name || existing.name,
      company: body.company || existing.company,
      email: body.email || existing.email,
      phone: body.phone !== undefined ? body.phone : existing.phone,
      address: body.address !== undefined ? body.address : existing.address,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      clientType: body.clientType || existing.clientType,
      leadSource: body.leadSource || existing.leadSource,
      status: body.status || existing.status,
      isDeleted: body.isDeleted !== undefined ? body.isDeleted : existing.isDeleted,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "CLIENT_UPDATED",
      details: `Updated client ${updated.name} (${updated.company})`,
    },
  });

  return NextResponse.json({ success: true, client: updated });
}

// DELETE /api/clients/[id] - Admin only
// - ?permanent=true: Safe cascading permanent deletion: unlinks shared projects, cleans up orders/invoices, deletes client
// - Default: Soft-delete (sets isDeleted: true and status: INACTIVE, retaining all DB records)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN"]);
  if (error || !user) {
    return NextResponse.json(
      { error: "Forbidden: Only Admin has permission to delete client records" },
      { status: status || 403 }
    );
  }

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const isPermanent = req.nextUrl.searchParams.get("permanent") === "true";

  if (isPermanent) {
    // 1. Safely detach all linked projects so projects, milestones and tasks are PRESERVED!
    await prisma.project.updateMany({
      where: { clientId: id },
      data: { clientId: null },
    });

    // 2. Cascade delete direct client orders and invoices
    await prisma.order.deleteMany({ where: { clientId: id } });
    await prisma.invoice.deleteMany({ where: { clientId: id } });

    // 3. Delete client record
    await prisma.client.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "CLIENT_PERMANENTLY_DELETED",
        details: `Permanently deleted client ${existing.name} (${existing.company})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Client ${existing.name} and related records permanently deleted successfully. Linked projects were safely preserved.`,
    });
  }

  // Soft delete mode: retaining all data in database
  await prisma.client.update({
    where: { id },
    data: { isDeleted: true, status: "INACTIVE" },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "CLIENT_SOFT_DELETED",
      details: `Soft-deleted client ${existing.name} (${existing.company})`,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Client ${existing.name} soft-deleted (archived) successfully. Records preserved in database.`,
  });
}
