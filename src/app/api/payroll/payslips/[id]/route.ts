import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/payroll/payslips/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  const payslip = await prisma.payslip.findUnique({
    where: { id },
    include: {
      salary: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              department: true,
              designation: true,
              dateJoined: true,
            },
          },
        },
      },
    },
  });

  if (!payslip) {
    return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
  }

  // Employee or Manager can view only their own payslip
  if ((user.role === "EMPLOYEE" || user.role === "MANAGER") && payslip.salary.userId !== user.userId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json({ payslip });
}
