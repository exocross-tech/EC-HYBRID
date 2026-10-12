import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/payroll/payslips
export async function GET(req: NextRequest) {
  // Admin & HR see all; Manager & Employee see ONLY their own payslips
  const { error, status, user } = await requireAuth(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const targetUserId = searchParams.get("userId");

  let whereClause: any = {};

  if (user.role === "EMPLOYEE" || user.role === "MANAGER") {
    // Staff & Managers: see ONLY their own personal payslips
    whereClause.salary = { userId: user.userId };
  } else if (targetUserId) {
    whereClause.salary = { userId: targetUserId };
  }

  if (month) whereClause.month = month;
  if (year) whereClause.year = year;

  const payslips = await prisma.payslip.findMany({
    where: whereClause,
    include: {
      salary: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              designation: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy: [
      { year: "desc" },
      { month: "desc" },
    ],
  });

  return NextResponse.json({ payslips });
}

// POST /api/payroll/payslips - Admin & HR only
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "HR"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Only Admin & HR can generate payslips" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { month, year, userId, batchAll, paymentStatus } = body;

    const targetMonth = parseInt(month) || new Date().getMonth() + 1;
    const targetYear = parseInt(year) || new Date().getFullYear();

    if (batchAll) {
      // Generate for all active employees with a salary record
      const activeSalaries = await prisma.salary.findMany({
        where: {
          user: { status: "ACTIVE" },
        },
        include: { user: true },
      });

      const createdPayslips: any[] = [];

      for (const sal of activeSalaries) {
        // Check if payslip already exists for this month/year
        const existing = await prisma.payslip.findFirst({
          where: {
            salaryId: sal.id,
            month: targetMonth,
            year: targetYear,
          },
        });

        if (!existing) {
          const slip = await prisma.payslip.create({
            data: {
              salaryId: sal.id,
              month: targetMonth,
              year: targetYear,
              basicPay: sal.basicPay,
              allowances: sal.allowances,
              deductions: sal.deductions,
              netSalary: sal.netSalary,
              paymentStatus: paymentStatus || "PAID",
              generatedAt: new Date(),
            },
          });
          createdPayslips.push(slip);

          // In-app notification to employee
          await prisma.notification.create({
            data: {
              userId: sal.userId,
              title: "New Monthly Payslip Generated",
              message: `Your payslip for ${targetMonth}/${targetYear} has been generated (Net: ₹${sal.netSalary.toLocaleString()}).`,
              type: "SYSTEM",
              link: "/payroll",
            },
          });
        }
      }

      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "PAYROLL_RUN_BATCH",
          details: `Generated ${createdPayslips.length} monthly payslips for ${targetMonth}/${targetYear}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Generated ${createdPayslips.length} payslips for ${targetMonth}/${targetYear}`,
        count: createdPayslips.length,
      });
    }

    // Single employee payslip generation
    if (!userId) {
      return NextResponse.json({ error: "userId or batchAll is required" }, { status: 400 });
    }

    const sal = await prisma.salary.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!sal) {
      return NextResponse.json({ error: "Salary structure not found for this user" }, { status: 404 });
    }

    const isMilestone = Boolean(body.isMilestonePayout);
    const customAmt = body.customAmount !== undefined ? parseFloat(body.customAmount) : undefined;
    const notes = body.notes ? String(body.notes).trim() : null;
    const payoutType = isMilestone ? "MILESTONE" : "SALARY";

    if (!isMilestone) {
      const existing = await prisma.payslip.findFirst({
        where: {
          salaryId: sal.id,
          month: targetMonth,
          year: targetYear,
        },
      });

      if (existing) {
        return NextResponse.json({ error: `Monthly payslip already generated for ${targetMonth}/${targetYear}` }, { status: 400 });
      }
    }

    const bPay = isMilestone ? 0 : sal.basicPay;
    const allow = isMilestone ? (customAmt || 0) : sal.allowances;
    const ded = isMilestone ? 0 : sal.deductions;
    const net = isMilestone ? (customAmt || 0) : sal.netSalary;

    const slip = await prisma.payslip.create({
      data: {
        salaryId: sal.id,
        month: targetMonth,
        year: targetYear,
        basicPay: bPay,
        allowances: allow,
        deductions: ded,
        netSalary: net,
        payoutType: payoutType,
        notes: notes,
        paymentStatus: paymentStatus || "PAID",
        generatedAt: new Date(),
      },
      include: {
        salary: { include: { user: true } },
      },
    });

    await prisma.notification.create({
      data: {
        userId: sal.userId,
        title: isMilestone ? "Milestone Pay Disbursed" : "New Monthly Payslip Generated",
        message: isMilestone
          ? `A milestone payment of ₹${net.toLocaleString("en-IN")} has been disbursed to you.`
          : `Your payslip for ${targetMonth}/${targetYear} has been generated (Net: ₹${sal.netSalary.toLocaleString()}).`,
        type: "SYSTEM",
        link: "/payroll",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: isMilestone ? "MILESTONE_PAY_DISBURSED" : "PAYSLIP_GENERATED",
        details: isMilestone
          ? `Disbursed milestone pay of ₹${net.toLocaleString("en-IN")} to ${sal.user.name}`
          : `Generated payslip for ${sal.user.name} (${targetMonth}/${targetYear})`,
      },
    });

    return NextResponse.json({ success: true, payslip: slip }, { status: 201 });
  } catch (err: any) {
    console.error("Generate payslip error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate payslip" }, { status: 500 });
  }
}
