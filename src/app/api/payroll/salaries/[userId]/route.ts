import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// PUT /api/payroll/salaries/[userId] - Admin & HR only
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "HR"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Forbidden: Only Admin & HR can edit salary structures" }, { status: status || 403 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // HR is strictly blocked from modifying the Admin (CEO) salary structure
  if (targetUser.role === "ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "HR personnel are not permitted to modify the Administrator/CEO compensation package" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const basicPay = parseFloat(body.basicPay) || 0;
  const allowances = parseFloat(body.allowances) || 0;
  const deductions = parseFloat(body.deductions) || 0;
  const netSalary = Math.max(0, basicPay + allowances - deductions);

  const salary = await prisma.salary.upsert({
    where: { userId },
    update: {
      basicPay,
      allowances,
      deductions,
      netSalary,
    },
    create: {
      userId,
      basicPay,
      allowances,
      deductions,
      netSalary,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "SALARY_STRUCTURE_CHANGED",
      details: `Updated salary for ${targetUser.name}: Basic ₹${basicPay}, Allowances ₹${allowances}, Deductions ₹${deductions}, Net ₹${netSalary}`,
    },
  });

  return NextResponse.json({ success: true, salary });
}
