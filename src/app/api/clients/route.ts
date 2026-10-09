import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/clients
export async function GET(req: NextRequest) {
  // HR has NO access to client data per Section 2 rules
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "HR has no access to client data" }, { status: status || 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const clientType = searchParams.get("type"); // PRODUCT, SERVICE, BOTH
  const statusFilter = searchParams.get("status"); // LEAD, ACTIVE, INACTIVE

  let whereClause: any = {
    isDeleted: false,
  };

  // Employees can view ONLY clients tied to work (projects/tasks) assigned to them
  if (user.role === "EMPLOYEE") {
    // Find project IDs where employee is assigned tasks
    const employeeTasks = await prisma.task.findMany({
      where: { assignedToId: user.userId },
      select: { projectId: true },
    });
    const projectIds = employeeTasks.map((t) => t.projectId);

    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds }, clientId: { not: null } },
      select: { clientId: true },
    });
    const clientIds = projects.map((p) => p.clientId).filter(Boolean) as string[];

    whereClause.id = { in: clientIds };
  }

  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { company: { contains: search } },
      { email: { contains: search } },
    ];
  }

  if (clientType) {
    whereClause.clientType = clientType;
  }

  if (statusFilter) {
    whereClause.status = statusFilter;
  }

  const clients = await prisma.client.findMany({
    where: whereClause,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      projects: {
        select: {
          id: true,
          name: true,
          status: true,
          budget: true,
          type: true,
          billingType: true,
          startDate: true,
          endDate: true,
          description: true,
        },
      },
      orders: {
        select: {
          id: true,
          amount: true,
          status: true,
          orderDate: true,
          product: {
            select: { name: true, price: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ clients });
}

// POST /api/clients - Admin and Manager only
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Only Admin and Manager can create clients" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { name, company, email, phone, address, notes, clientType, leadSource, status: clientStatus } = body;

    if (!name || !company || !email) {
      return NextResponse.json(
        { error: "Contact name, company name, and email are required" },
        { status: 400 }
      );
    }

    const newClient = await prisma.client.create({
      data: {
        name,
        company,
        email: email.toLowerCase().trim(),
        phone: phone || null,
        address: address || null,
        notes: notes || null,
        clientType: clientType || "SERVICE", // tagged for business line reporting
        leadSource: leadSource || "Direct",
        status: clientStatus || "ACTIVE",
        createdById: user.userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "CLIENT_CREATED",
        details: `Created client ${newClient.name} at ${newClient.company} (${newClient.clientType})`,
      },
    });

    return NextResponse.json({ success: true, client: newClient }, { status: 201 });
  } catch (err: any) {
    console.error("Create client error:", err);
    return NextResponse.json({ error: err.message || "Failed to create client" }, { status: 500 });
  }
}
