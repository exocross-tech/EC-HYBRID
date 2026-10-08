import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { broadcastRealtimeEvent } from "@/lib/realtime";

// GET /api/invoices
export async function GET(req: NextRequest) {
  // HR has NO access to CRM / Client / Invoicing per Section 2
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const invoiceStatus = searchParams.get("status");
  const search = searchParams.get("search");

  let whereClause: any = {};

  if (clientId) whereClause.clientId = clientId;
  if (invoiceStatus) whereClause.status = invoiceStatus;

  if (search) {
    whereClause.OR = [
      { invoiceNumber: { contains: search } },
      { description: { contains: search } },
      { client: { name: { contains: search } } },
      { client: { company: { contains: search } } },
    ];
  }

  // Employee sees invoices for clients assigned to them or created by them
  if (user.role === "EMPLOYEE") {
    whereClause.client = {
      ...whereClause.client,
      OR: [
        { assignedToId: user.userId },
        { createdById: user.userId },
      ],
    };
  }

  try {
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
            phone: true,
            address: true,
            clientType: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            type: true,
            budget: true,
          },
        },
      },
      orderBy: { issueDate: "desc" },
    });

    return NextResponse.json({ invoices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/invoices - Admin & Manager only
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Forbidden: Only Admin & Managers can create invoices" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { clientId, projectId, description, items, amount, tax, totalAmount, dueDate, invoiceNumber } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Client is required" }, { status: 400 });
    }

    const subtotal = parseFloat(amount) || 0;
    const computedTax = tax !== undefined ? parseFloat(tax) : Math.round(subtotal * 0.18);
    const computedTotal = totalAmount !== undefined ? parseFloat(totalAmount) : subtotal + computedTax;

    // Generate Invoice Number if not provided
    let num = invoiceNumber;
    if (!num) {
      const count = await prisma.invoice.count();
      num = `INV-2026-${String(count + 1).padStart(3, "0")}`;
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: num,
        clientId,
        projectId: projectId || null,
        description: description || "Professional Services Engagement",
        amount: subtotal,
        tax: computedTax,
        totalAmount: computedTotal,
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 86400000),
        status: "SENT",
        items: typeof items === "string" ? items : JSON.stringify(items || []),
      },
      include: {
        client: true,
        project: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "INVOICE_CREATED",
        details: `Created invoice ${num} for ${invoice.client.name} (Amount: INR ${computedTotal})`,
      },
    });

    broadcastRealtimeEvent("INVOICE_CREATED", { id: invoice.id, invoiceNumber: invoice.invoiceNumber });

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (err: any) {
    console.error("Create invoice error:", err);
    return NextResponse.json({ error: err.message || "Failed to create invoice" }, { status: 500 });
  }
}
