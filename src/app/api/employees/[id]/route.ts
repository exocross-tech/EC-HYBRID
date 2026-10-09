import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hashPassword } from "@/lib/auth";

// GET /api/employees/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error }, { status });
  }

  // Check access:
  // - Employee can only view themselves
  // - Manager can only view members of their department
  // - Admin & HR can view any
  if (user.role === "EMPLOYEE" && user.userId !== id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const employee = await prisma.user.findUnique({
    where: { id },
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
      salary: user.role === "ADMIN" || user.role === "HR" || user.userId === id,
      assignedTasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
        },
      },
      leaves: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  if (user.role === "MANAGER" && employee.department !== user.department) {
    return NextResponse.json({ error: "Access denied outside your department" }, { status: 403 });
  }

  return NextResponse.json({ employee });
}

// PUT /api/employees/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error }, { status });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const body = await req.json();

  // Employee: can only edit own limited fields (phone, avatarUrl)
  if (user.role === "EMPLOYEE") {
    if (user.userId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        phone: body.phone !== undefined ? body.phone : existing.phone,
        avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : existing.avatarUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        designation: true,
        department: true,
        status: true,
        role: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({ success: true, employee: updated });
  }

  // Manager cannot edit employee records per spec
  if (user.role === "MANAGER") {
    return NextResponse.json({ error: "Managers have view-only access to employee records" }, { status: 403 });
  }

  // Admin and HR can edit
  if (user.role === "ADMIN" || user.role === "HR") {
    // HR is strictly prohibited from editing Admin/CEO accounts
    if (existing.role === "ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "HR personnel are not permitted to edit or modify Administrator/CEO accounts" }, { status: 403 });
    }

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.designation) updateData.designation = body.designation;
    if (body.department) updateData.department = body.department;
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status) updateData.status = body.status;
    if (body.action === "RESTRICT") updateData.status = "RESTRICTED";
    if (body.action === "UNRESTRICT") updateData.status = "ACTIVE";
    if (body.password) updateData.passwordHash = await hashPassword(body.password);

    // Email update support with collision check
    if (body.email && body.email.toLowerCase().trim() !== existing.email.toLowerCase()) {
      const emailTrimmed = body.email.toLowerCase().trim();
      const emailExists = await prisma.user.findFirst({
        where: {
          email: emailTrimmed,
          id: { not: id },
        },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: `Email address "${emailTrimmed}" is already registered to another user.` },
          { status: 400 }
        );
      }
      updateData.email = emailTrimmed;
    }

    // Only Admin can change roles to ADMIN or modify other Admins
    if (body.role) {
      if (body.role === "ADMIN" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only Admin can grant Admin role" }, { status: 403 });
      }
      updateData.role = body.role;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        designation: true,
        department: true,
        status: true,
        role: true,
        avatarUrl: true,
        notes: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: updateData.status === "RESTRICTED" ? "EMPLOYEE_RESTRICTED" : "EMPLOYEE_UPDATED",
        details: `Updated employee ${updated.name} (${updated.email}) - Status: ${updated.status}`,
      },
    });

    return NextResponse.json({ success: true, employee: updated });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// DELETE /api/employees/[id]
// - ?permanent=true: Cascading permanent deletion of user and isolated records while preserving collaborative projects
// - Default: Restrict access flag (preserves data, kills session and login)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "HR"]);
  if (error || !user) {
    return NextResponse.json({ error }, { status });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  if (existing.role === "ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only an Administrator can modify or delete an Admin account" }, { status: 403 });
  }

  const isPermanent = req.nextUrl.searchParams.get("permanent") === "true";

  if (isPermanent) {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only an Administrator can permanently delete an employee" }, { status: 403 });
    }

    // 1. Delete isolated personal records: Salary (cascades Payslip), Leaves, Notifications
    await prisma.salary.deleteMany({ where: { userId: id } });
    await prisma.leaveRequest.deleteMany({ where: { userId: id } });
    await prisma.notification.deleteMany({ where: { userId: id } });

    // 2. Safely detach from collaborative shared records (projects remain untouched!)
    await prisma.task.updateMany({
      where: { assignedToId: id },
      data: { assignedToId: null },
    });

    await prisma.client.updateMany({
      where: { createdById: id },
      data: { createdById: null },
    });

    // 3. Nullify or clean up audit logs linked to this user
    await prisma.auditLog.updateMany({
      where: { userId: id },
      data: { userId: null },
    });

    // 4. Delete user record
    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "EMPLOYEE_PERMANENTLY_DELETED",
        details: `Permanently deleted employee ${existing.name} (${existing.email})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Employee ${existing.name} and related records permanently deleted successfully.`,
    });
  }

  // Restrict access mode: keeps all database records intact, prevents login and forces active session termination
  const updated = await prisma.user.update({
    where: { id },
    data: { status: "RESTRICTED" },
    select: { id: true, name: true, email: true, status: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "EMPLOYEE_RESTRICTED",
      details: `Restricted system access for employee ${existing.name} (${existing.email})`,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Access for employee ${existing.name} has been restricted.`,
    employee: updated,
  });
}
