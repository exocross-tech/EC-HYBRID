import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// POST /api/licenses/[id]/renew
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  const { id } = await params;
  try {
    const license = await prisma.productLicense.findUnique({
      where: { id },
      include: { client: true, project: true },
    });

    if (!license) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    if (license.billingModel === "ONE_TIME") {
      return NextResponse.json({ error: "One-time perpetual licenses do not require renewal" }, { status: 400 });
    }

    const currentRenewal = license.renewalDate ? new Date(license.renewalDate) : new Date();
    // If past expired date, base renewal from now or from current renewal
    const baseDate = currentRenewal.getTime() < Date.now() ? new Date() : currentRenewal;
    const nextRenewal = new Date(baseDate);

    if (license.billingCycle === "MONTHLY") {
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);
    } else if (license.billingCycle === "QUARTERLY") {
      nextRenewal.setMonth(nextRenewal.getMonth() + 3);
    } else {
      nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
    }

    // Auto-generate Renewal Invoice in Invoice engine
    const invoiceNumber = `INV-REN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const taxRate = 0.18;
    const tax = Math.round(license.price * taxRate);
    const totalAmount = license.price + tax;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: license.clientId,
        projectId: license.productId || null,
        description: `Subscription Renewal: ${license.productName} (${license.billingCycle} Cycle)`,
        amount: license.price,
        tax,
        totalAmount,
        dueDate: nextRenewal,
        status: "SENT",
        items: JSON.stringify([
          {
            description: `${license.productName} Subscription Renewal (${license.tier} Tier) [Next Cycle: ${nextRenewal.toLocaleDateString("en-GB")}]`,
            quantity: 1,
            unitPrice: license.price,
            amount: license.price,
          },
        ]),
      },
    });

    const updatedLicense = await prisma.productLicense.update({
      where: { id },
      data: {
        renewalDate: nextRenewal,
        lastRenewedAt: new Date(),
        status: "ACTIVE",
        invoiceNumber: invoice.invoiceNumber,
      },
      include: {
        client: true,
        project: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "SUBSCRIPTION_RENEWED",
        details: `Renewed subscription for ${license.client.company} - ${license.productName} until ${nextRenewal.toISOString().split("T")[0]} (Invoice: ${invoice.invoiceNumber})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Subscription renewed until ${nextRenewal.toLocaleDateString("en-GB")}`,
      license: updatedLicense,
      invoice,
    });
  } catch (err: any) {
    console.error("Renewal error:", err);
    return NextResponse.json({ error: err.message || "Failed to renew subscription" }, { status: 500 });
  }
}
