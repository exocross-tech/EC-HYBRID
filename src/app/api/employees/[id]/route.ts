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
    if (body.status) updateData.status = body.status;
    if (body.password) updateData.passwordHash = await hashPassword(body.password);

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
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "EMPLOYEE_UPDATED",
        details: `Updated employee ${updated.name} (${updated.email})`,
      },
    });

    return NextResponse.json({ success: true, employee: updated });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// DELETE /api/employees/[id] - Soft delete (deactivation status flag) per spec
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
    return NextResponse.json({ error: "Only an Administrator can deactivate an Admin" }, { status: 403 });
  }

  // Soft delete flag per spec: preserving historical records
  const updated = await prisma.user.update({
    where: { id },
    data: { status: "INACTIVE" },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "EMPLOYEE_DEACTIVATED",
      details: `Deactivated employee ${existing.name} (${existing.email})`,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Employee ${existing.name} deactivated (soft deleted) successfully`,
  });
}
