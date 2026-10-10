import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/licenses/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, status } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error) {
    return NextResponse.json({ error }, { status: status || 403 });
  }

  const { id } = await params;
  try {
    const license = await prisma.productLicense.findUnique({
      where: { id },
      include: {
        client: true,
        project: true,
      },
    });

    if (!license) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    return NextResponse.json({ license });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/licenses/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const {
      tier,
      deploymentUrl,
      billingCycle,
      price,
      renewalDate,
      status: licStatus,
      notes,
    } = body;

    const existing = await prisma.productLicense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    const updated = await prisma.productLicense.update({
      where: { id },
      data: {
        ...(tier && { tier }),
        ...(deploymentUrl !== undefined && { deploymentUrl: deploymentUrl ? deploymentUrl.trim() : null }),
        ...(billingCycle && { billingCycle }),
        ...(price !== undefined && { price: parseFloat(price) || 0 }),
        ...(renewalDate !== undefined && { renewalDate: renewalDate ? new Date(renewalDate) : null }),
        ...(licStatus && { status: licStatus }),
        ...(notes !== undefined && { notes: notes ? notes.trim() : null }),
      },
      include: {
        client: true,
        project: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "PRODUCT_LICENSE_UPDATED",
        details: `Updated license ${updated.licenseKey} for ${updated.client.company} (Status: ${updated.status})`,
      },
    });

    return NextResponse.json({ success: true, license: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/licenses/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, status, user } = await requireAuth(["ADMIN"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Admin only" }, { status: status || 403 });
  }

  const { id } = await params;
  try {
    const existing = await prisma.productLicense.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    await prisma.productLicense.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "PRODUCT_LICENSE_DELETED",
        details: `Deleted license ${existing.licenseKey} of product ${existing.productName} for ${existing.client.company}`,
      },
    });

    return NextResponse.json({ success: true, message: "License deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
