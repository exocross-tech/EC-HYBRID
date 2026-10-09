import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/payroll/distributions - Founders and Admins Only
export async function GET(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized: Founder profit distributions are restricted to Admin role" }, { status: status || 403 });
  }

  try {
    // 1. Fetch all founder profit distributions
    const distributions = await prisma.founderDistribution.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true,
            role: true,
            avatarUrl: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            paidAmount: true,
          },
        },
      },
      orderBy: {
        distributionDate: "desc",
      },
    });

    // 2. Fetch founders (Admins / Executives)
    const founders = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { role: "ADMIN" },
          { department: { contains: "Executive", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        designation: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // 3. Fetch invoices with recorded payments
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { paidAmount: { gt: 0 } },
          { status: "PAID" },
        ],
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // 4. Calculate Financial Metrics
    const allInvoices = await prisma.invoice.findMany({
      select: {
        totalAmount: true,
        paidAmount: true,
        status: true,
      },
    });

    const totalCollectedRevenue = allInvoices.reduce((sum, inv) => {
      const paid = inv.paidAmount > 0 ? inv.paidAmount : (inv.status === "PAID" ? inv.totalAmount : 0);
      return sum + paid;
    }, 0);

    const totalDisbursed = distributions.reduce((sum, d) => sum + d.amount, 0);
    const retainedReserves = Math.max(0, totalCollectedRevenue - totalDisbursed);

    return NextResponse.json({
      distributions,
      founders,
      paidInvoices,
      metrics: {
        totalCollectedRevenue,
        totalDisbursed,
        retainedReserves,
      },
    });
  } catch (err: any) {
    console.error("Error fetching founder distributions:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch distributions" }, { status: 500 });
  }
}

// POST /api/payroll/distributions - Log profit draw / revenue split
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Only Admins / Founders can log revenue splits" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const {
      invoiceId,
      projectId,
      distributions, // array of { userId: string, amount: number }
      userId,        // for single entry fallback
      amount,        // for single entry fallback
      paymentMethod = "UPI",
      distributionDate,
      reference,
      notes,
    } = body;

    const parsedDate = distributionDate ? new Date(distributionDate) : new Date();

    // Multi-founder batch split (e.g., CEO & Co-CEO)
    if (Array.isArray(distributions) && distributions.length > 0) {
      const createdRecords = [];

      for (const item of distributions) {
        const itemAmount = parseFloat(item.amount);
        if (!item.userId || isNaN(itemAmount) || itemAmount <= 0) continue;

        const record = await prisma.founderDistribution.create({
          data: {
            userId: item.userId,
            amount: itemAmount,
            invoiceId: invoiceId || null,
            projectId: projectId || null,
            paymentMethod: paymentMethod || "UPI",
            distributionDate: parsedDate,
            reference: reference?.trim() || null,
            notes: notes?.trim() || null,
            status: "COMPLETED",
          },
          include: {
            user: { select: { name: true, email: true } },
          },
        });
        createdRecords.push(record);
      }

      if (createdRecords.length === 0) {
        return NextResponse.json({ error: "No valid distribution amounts provided" }, { status: 400 });
      }

      return NextResponse.json({
        message: `Successfully logged ${createdRecords.length} founder distributions`,
        distributions: createdRecords,
      });
    }

    // Single entry fallback
    const singleAmount = parseFloat(amount);
    if (!userId || isNaN(singleAmount) || singleAmount <= 0) {
      return NextResponse.json({ error: "Please provide a valid founder and amount" }, { status: 400 });
    }

    const singleRecord = await prisma.founderDistribution.create({
      data: {
        userId,
        amount: singleAmount,
        invoiceId: invoiceId || null,
        projectId: projectId || null,
        paymentMethod: paymentMethod || "UPI",
        distributionDate: parsedDate,
        reference: reference?.trim() || null,
        notes: notes?.trim() || null,
        status: "COMPLETED",
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({
      message: "Founder distribution logged successfully",
      distribution: singleRecord,
    });
  } catch (err: any) {
    console.error("Error creating founder distribution:", err);
    return NextResponse.json({ error: err.message || "Failed to log distribution" }, { status: 500 });
  }
}
