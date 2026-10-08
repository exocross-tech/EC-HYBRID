import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/payroll/salaries - Admin & HR only per Section 3.3
export async function GET(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "HR"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Only Admin & HR have access to salary structures" }, { status: status || 403 });
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
