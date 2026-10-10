import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/payroll/salaries - Admin & HR only per Section 3.3
export async function GET(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "HR"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Only Admin & HR have access to salary structures" }, { status: status || 403 });
  }

  // Ensure every active staff member (Employee / Manager) has a salary record
  const allStaff = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { in: ["EMPLOYEE", "MANAGER"] },
    },
    select: { id: true, name: true },
  });

  for (const staff of allStaff) {
    const existing = await prisma.salary.findUnique({ where: { userId: staff.id } });
    if (!existing) {
      await prisma.salary.create({
        data: {
          userId: staff.id,
          basicPay: 0,
          allowances: 0,
          deductions: 0,
          netSalary: 0,
        },
      });
    }
  }

  const salaries = await prisma.salary.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          designation: true,
          status: true,
          dateJoined: true,
        },
      },
      _count: { select: { payslips: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return NextResponse.json({ salaries });
}

// POST /api/payroll/salaries - Admin & HR can manually assign a salary structure
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "HR"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Only Admin & HR can configure salary structures" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { userId, basicPay, allowances, deductions } = body;

    if (!userId) {
      return NextResponse.json({ error: "Please select an employee or admin account" }, { status: 400 });
    }

    const bPay = parseFloat(basicPay) || 0;
    const allow = parseFloat(allowances) || 0;
    const ded = parseFloat(deductions) || 0;
    const net = Math.max(0, bPay + allow - ded);

    // Verify employee exists
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    // Check if salary record already exists
    const existing = await prisma.salary.findUnique({ where: { userId } });
    if (existing) {
      return NextResponse.json({ error: "Salary structure already exists for this user. You can edit their existing structure." }, { status: 400 });
    }

    const newSalary = await prisma.salary.create({
      data: {
        userId,
        basicPay: bPay,
        allowances: allow,
        deductions: ded,
        netSalary: net,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            designation: true,
            status: true,
            dateJoined: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "SALARY_STRUCTURE_CREATED",
        details: `Manually created salary structure for ${targetUser.name} (${targetUser.email}) - Net: ₹${net.toLocaleString("en-IN")}`,
      },
    });

    return NextResponse.json({ success: true, salary: newSalary }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create salary structure" }, { status: 500 });
  }
}
