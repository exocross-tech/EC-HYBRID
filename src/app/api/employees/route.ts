import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hashPassword } from "@/lib/auth";

// GET /api/employees - list employees based on user role
export async function GET(req: NextRequest) {
  const { error, status, user } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const department = searchParams.get("department");
  const roleFilter = searchParams.get("role");
  const statusFilter = searchParams.get("status");

  // Server-side role-based filtering:
  // - Admin & HR: can view all employees
  // - Manager: view-only for their department/team
  // - Employee: view only their own record
  let whereClause: any = {};

  if (user.role === "EMPLOYEE") {
    whereClause.id = user.userId;
  } else if (user.role === "MANAGER") {
    // Manager sees only their department
    whereClause.department = user.department;
  }

  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { designation: { contains: search } },
    ];
  }

  if (department && user.role !== "MANAGER" && user.role !== "EMPLOYEE") {
    whereClause.department = department;
  }

  if (roleFilter && (user.role === "ADMIN" || user.role === "HR")) {
    whereClause.role = roleFilter;
  }

  if (statusFilter) {
    whereClause.status = statusFilter;
  }

  const employees = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      designation: true,
      department: true,
      dateJoined: true,
      status: true,
      role: true,
      avatarUrl: true,
      notes: true,
      createdAt: true,
      _count: {
        select: {
          assignedTasks: true,
          leaves: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ employees });
}

// POST /api/employees - Admin / HR create an employee account
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "HR"]);
  if (error || !user) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await req.json();
    const { name, email, password, phone, designation, department, role, notes } = body;

    if (!name || !email || !password || !designation || !department) {
      return NextResponse.json(
        { error: "Name, email, password, designation, and department are required" },
        { status: 400 }
      );
    }

    // Role restrictions: HR cannot create ADMIN accounts, only Admin can
    if (role === "ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only an existing Administrator can create Admin accounts" },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An employee with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newEmployee = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        phone: phone || null,
        designation,
        department,
        role: role || "EMPLOYEE",
        status: "ACTIVE",
        avatarUrl: body.avatarUrl || null,
        notes: notes || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        designation: true,
        department: true,
        dateJoined: true,
        status: true,
        role: true,
        avatarUrl: true,
        notes: true,
      },
    });


    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "EMPLOYEE_CREATED",
        details: `Created employee ${newEmployee.name} (${newEmployee.email}) with role ${newEmployee.role}`,
      },
    });

    return NextResponse.json({ success: true, employee: newEmployee }, { status: 201 });
  } catch (err: any) {
    console.error("Create employee error:", err);
    return NextResponse.json({ error: err.message || "Failed to create employee" }, { status: 500 });
  }
}
