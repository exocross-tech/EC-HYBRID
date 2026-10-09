import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/reports - Admin & HR only per Section 3.9
export async function GET() {
  const { error, status, user } = await requireAuth(["ADMIN", "HR"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Only Admin & HR have access to financial reports" }, { status: status || 403 });
  }

  try {
    const [
      orders,
      serviceProjects,
      salaries,
      projects,
      tasks,
      leaves,
      employees,
    ] = await Promise.all([
      // Product Sales
      prisma.order.findMany({
        where: { status: "PAID" },
        include: { product: true, client: true },
      }),
      // Service Line Billing
      prisma.project.findMany({
        where: { type: "SERVICE" },
        include: { client: true },
      }),
      // Payroll Expenses
      prisma.salary.findMany({
        where: { user: { status: "ACTIVE" } },
        include: { user: true },
      }),
      // Project statuses
      prisma.project.findMany(),
      // Tasks
      prisma.task.findMany({
        include: {
          assignedTo: { select: { id: true, name: true, department: true } },
          project: { select: { name: true } },
        },
      }),
      // Leaves
      prisma.leaveRequest.findMany({
        include: { user: { select: { name: true, department: true } } },
      }),
      // Employees
      prisma.user.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, department: true, designation: true },
      }),
    ]);

    // Financial Computations
    const productRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
    const serviceRevenue = serviceProjects.reduce((sum, p) => sum + p.budget, 0);
    const totalRevenue = productRevenue + serviceRevenue;

    const monthlyPayrollExpense = salaries.reduce((sum, s) => sum + s.netSalary, 0);
    // Projecting annual payroll (monthly * 12) or 3-month operational cycle:
    const annualPayrollExpense = monthlyPayrollExpense * 12;
    const netProfit = totalRevenue - monthlyPayrollExpense;

    // Project breakdown
    const projectSummary = {
      total: projects.length,
      active: projects.filter((p) => p.status === "ACTIVE").length,
      planning: projects.filter((p) => p.status === "PLANNING").length,
      onHold: projects.filter((p) => p.status === "ON_HOLD").length,
      completed: projects.filter((p) => p.status === "COMPLETED").length,
    };

    // Task breakdown
    const now = new Date();
    const taskSummary = {
      total: tasks.length,
      done: tasks.filter((t) => t.status === "DONE").length,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      todo: tasks.filter((t) => t.status === "TODO").length,
      review: tasks.filter((t) => t.status === "REVIEW").length,
      overdue: tasks.filter((t) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now).length,
      completionRate: tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === "DONE").length / tasks.length) * 100) : 0,
    };

    // Workload per employee
    const workloadPerEmployee = employees.map((emp) => {
      const empTasks = tasks.filter((t) => {
        if (t.assignedTo?.id === emp.id || t.assignedToId === emp.id) return true;
        if (t.assignees) {
          try {
            const parsed = JSON.parse(t.assignees);
            if (Array.isArray(parsed) && parsed.some((u: any) => u.id === emp.id)) return true;
          } catch {
            return t.assignees.includes(emp.id);
          }
        }
        return false;
      });
      return {
        id: emp.id,
        name: emp.name,
        department: emp.department,
        totalTasks: empTasks.length,
        completedTasks: empTasks.filter((t) => t.status === "DONE").length,
        openTasks: empTasks.filter((t) => t.status !== "DONE").length,
      };
    });

    // Leaves by type
    const leaveSummary = {
      total: leaves.length,
      casual: leaves.filter((l) => l.leaveType === "CASUAL").length,
      sick: leaves.filter((l) => l.leaveType === "SICK").length,
      unpaid: leaves.filter((l) => l.leaveType === "UNPAID").length,
      approved: leaves.filter((l) => l.status === "APPROVED").length,
      pending: leaves.filter((l) => l.status === "PENDING").length,
      rejected: leaves.filter((l) => l.status === "REJECTED").length,
    };

    return NextResponse.json({
      revenueBreakdown: {
        productRevenue,
        serviceRevenue,
        totalRevenue,
      },
      expenseBreakdown: {
        monthlyPayroll: monthlyPayrollExpense,
        annualPayroll: annualPayrollExpense,
      },
      netProfit,
      projectSummary,
      taskSummary,
      workloadPerEmployee,
      leaveSummary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
