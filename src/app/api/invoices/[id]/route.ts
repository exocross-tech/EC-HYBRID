import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { broadcastRealtimeEvent } from "@/lib/realtime";

// GET /api/invoices/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error) {
    return NextResponse.json({ error }, { status: status || 403 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      project: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}

// PUT /api/invoices/[id] - Admin & Manager
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Forbidden" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const updateData: any = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.status === "PAID" && !body.paymentDate) {
      updateData.paymentDate = new Date();
    } else if (body.paymentDate !== undefined) {
      updateData.paymentDate = body.paymentDate ? new Date(body.paymentDate) : null;
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
    if (body.tax !== undefined) updateData.tax = parseFloat(body.tax);
    if (body.totalAmount !== undefined) updateData.totalAmount = parseFloat(body.totalAmount);
    if (body.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate);
    if (body.items !== undefined) {
      updateData.items = typeof body.items === "string" ? body.items : JSON.stringify(body.items);
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { client: true, project: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "INVOICE_UPDATED",
        details: `Updated invoice ${updated.invoiceNumber} (Status: ${updated.status})`,
      },
    });

    broadcastRealtimeEvent(updated.status === "PAID" ? "INVOICE_PAID" : "INVOICE_CREATED", {
      id: updated.id,
      invoiceNumber: updated.invoiceNumber,
      status: updated.status,
    });

    return NextResponse.json({ success: true, invoice: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/invoices/[id] - Admin only
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Only Admin can delete invoices" }, { status: status || 403 });
  }

  try {
    const deleted = await prisma.invoice.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "INVOICE_DELETED",
        details: `Deleted invoice ${deleted.invoiceNumber}`,
      },
    });

    return NextResponse.json({ success: true, message: "Invoice deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
