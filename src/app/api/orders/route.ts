import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/orders
export async function GET() {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  let whereClause: any = {};
  if (user.role === "EMPLOYEE") {
    // Employee sees only orders for clients they have tasks for
    const tasks = await prisma.task.findMany({
      where: { assignedToId: user.userId },
      select: { project: { select: { clientId: true } } },
    });
    const clientIds = tasks.map((t) => t.project?.clientId).filter(Boolean) as string[];
    whereClause.clientId = { in: clientIds };
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      client: { select: { id: true, name: true, company: true, email: true } },
      product: { select: { id: true, name: true, price: true, type: true } },
    },
    orderBy: { orderDate: "desc" },
  });

  return NextResponse.json({ orders });
}

// POST /api/orders - Admin & Manager
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { clientId, productId, quantity, status: orderStatus, invoiceNumber } = body;

    if (!clientId || !productId) {
      return NextResponse.json({ error: "Client and Product are required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const qty = parseInt(quantity) || 1;
    const amount = product.price * qty;

    const invoiceNum = invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = await prisma.order.create({
      data: {
        clientId,
        productId,
        quantity: qty,
        amount,
        status: orderStatus || "PAID",
        invoiceNumber: invoiceNum,
      },
      include: {
        client: true,
        product: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "ORDER_CREATED",
        details: `Recorded order ${order.invoiceNumber} for ${order.client.company} (₹${amount})`,
      },
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
