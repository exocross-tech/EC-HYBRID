import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { formatDate } from "@/lib/formatDate";

export async function GET() {
  const { error, status, user } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error }, { status });
  }

  try {
    if (user.role === "ADMIN") {
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        userDepts,
        activeProjects,
        clientsWithServices,
        allTasks,
        recentActivities,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: "ACTIVE" } }),
        prisma.user.count({ where: { status: "INACTIVE" } }),
        prisma.user.findMany({
          where: { status: "ACTIVE" },
          select: { department: true },
        }),
        prisma.project.findMany({
          where: { status: "ACTIVE" },
          include: {
            client: { select: { name: true, company: true } },
            tasks: { select: { status: true } },
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.client.findMany({
          where: { isDeleted: false },
          include: {
            invoices: { select: { totalAmount: true, status: true } },
            projects: { select: { id: true, budget: true, status: true } },
            orders: { select: { amount: true } },
          },
        }),
        prisma.task.findMany({
          select: { id: true, status: true, dueDate: true, updatedAt: true, createdAt: true },
        }),
        prisma.auditLog.findMany({
          take: 6,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true, role: true } } },
        }),
      ]);

      // 1. Total Workforce Breakdown
      const deptCounts: Record<string, number> = {};
      userDepts.forEach((u) => {
        const d = u.department || "General";
        deptCounts[d] = (deptCounts[d] || 0) + 1;
      });
      const workforce = {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        departments: Object.entries(deptCounts).map(([department, count]) => ({ department, count })),
      };

      // 2. Active Projects Completion Rates (Horizontal Progress Matrix)
      const projectsGraphData = activeProjects.map((p) => {
        const total = p.tasks.length;
        const completed = p.tasks.filter((t) => t.status === "DONE").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          id: p.id,
          name: p.name,
          clientName: p.client?.company || p.client?.name || "Internal",
          budget: p.budget,
          totalTasks: total,
          completedTasks: completed,
          progress,
        };
      });

      // 3. Client Companies Service Share (Which client company is buying/getting more services)
      const companyMap: Record<string, { company: string; revenue: number; projectCount: number }> = {};
      let totalBilledAllClients = 0;

      clientsWithServices.forEach((c) => {
        const companyKey = c.company?.trim() || c.name;
        const invoiceRev = c.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const orderRev = c.orders.reduce((sum, ord) => sum + ord.amount, 0);
        const totalRev = invoiceRev + orderRev;
        totalBilledAllClients += totalRev;

        if (!companyMap[companyKey]) {
          companyMap[companyKey] = {
            company: companyKey,
            revenue: 0,
            projectCount: 0,
          };
        }
        companyMap[companyKey].revenue += totalRev;
        companyMap[companyKey].projectCount += c.projects.length;
      });

      const clientServiceShare = Object.values(companyMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6)
        .map((item) => ({
          company: item.company,
          revenue: item.revenue,
          projectCount: item.projectCount,
          sharePercentage: totalBilledAllClients > 0
            ? Math.round((item.revenue / totalBilledAllClients) * 100)
            : 0,
        }));

      // 4. Today's Tasks Velocity (Resets daily at midnight)
      const now = new Date();
      const todoCount = allTasks.filter((t) => t.status === "TODO").length;
      const inProgressCount = allTasks.filter((t) => t.status === "IN_PROGRESS").length;
      const reviewCount = allTasks.filter((t) => t.status === "REVIEW").length;
      const completedCount = allTasks.filter((t) => t.status === "DONE").length;
      const notCompletedCount = allTasks.filter(
        (t) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now
      ).length;
      const totalTodayTasks = todoCount + inProgressCount + reviewCount + completedCount;

      const todayTasksData = {
        dateStr: formatDate(now),
        todo: todoCount,
        inProgress: inProgressCount,
        review: reviewCount,
        completed: completedCount,
        notCompleted: notCompletedCount,
        total: totalTodayTasks,
      };

      // 5. Lead Source Distribution Breakdown
      const leadSourceMap: Record<string, number> = {};
      let totalClientsWithSource = 0;
      clientsWithServices.forEach((c) => {
        const source = (c.leadSource && c.leadSource.trim().length > 0) ? c.leadSource.trim() : "Direct / Inbound";
        leadSourceMap[source] = (leadSourceMap[source] || 0) + 1;
        totalClientsWithSource++;
      });
      const leadSources = Object.entries(leadSourceMap)
        .map(([source, count]) => ({
          source,
          count,
          percentage: totalClientsWithSource > 0 ? Math.round((count / totalClientsWithSource) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      return NextResponse.json({
        role: "ADMIN",
        workforce,
        projectsGraphData,
        clientServiceShare,
        todayTasksData,
        leadSources,
        recentActivities,
      });
    }

    if (user.role === "MANAGER") {
      const [
        teamEmployees,
        totalClients,
        activeProjects,
        openTasks,
        pendingDepartmentLeaves,
        departmentMembers,
        todoTasks,
        inProgressTasks,
        reviewTasks,
        doneTasks,
        pendingDepartmentLeavesList,
        managerProjects,
      ] = await Promise.all([
        prisma.user.count({ where: { department: user.department, status: "ACTIVE" } }),
        prisma.client.count({ where: { isDeleted: false } }),
        prisma.project.count({ where: { status: "ACTIVE" } }),
        prisma.task.count({ where: { status: { not: "DONE" } } }),
        prisma.leaveRequest.count({
          where: {
            status: "PENDING",
            user: { department: user.department },
          },
        }),
        prisma.user.findMany({
          where: { department: user.department, status: "ACTIVE" },
          take: 6,
          select: { id: true, name: true, email: true, designation: true, role: true },
        }),
        prisma.task.count({ where: { status: "TODO" } }),
        prisma.task.count({ where: { status: "IN_PROGRESS" } }),
        prisma.task.count({ where: { status: "REVIEW" } }),
        prisma.task.count({ where: { status: "DONE" } }),
        prisma.leaveRequest.findMany({
          where: {
            status: "PENDING",
            user: { department: user.department },
          },
          take: 4,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, designation: true, email: true } },
          },
        }),
        prisma.project.findMany({
          where: { status: "ACTIVE" },
          take: 4,
          orderBy: { updatedAt: "desc" },
          include: {
            client: { select: { name: true } },
            tasks: { select: { status: true } },
          },
        }),
      ]);

      return NextResponse.json({
        role: "MANAGER",
        metrics: {
          teamEmployees,
          totalClients,
          activeProjects,
          openTasks,
          pendingDepartmentLeaves,
        },
        departmentMembers,
        taskBreakdown: {
          todo: todoTasks,
          inProgress: inProgressTasks,
          review: reviewTasks,
          done: doneTasks,
        },
        pendingDepartmentLeavesList,
        managerProjects: managerProjects.map((p) => {
          const total = p.tasks.length;
          const completed = p.tasks.filter((t) => t.status === "DONE").length;
          const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
          return {
            id: p.id,
            name: p.name,
            clientName: p.client?.name || "Internal",
            budget: p.budget,
            totalTasks: total,
            completedTasks: completed,
            progress,
          };
        }),
      });
    }

    if (user.role === "HR") {
      const [
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        pendingLeaves,
        salaries,
        allEmployees,
        pendingLeavesList,
        recentEmployees,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: "ACTIVE" } }),
        prisma.user.count({ where: { status: "INACTIVE" } }),
        prisma.leaveRequest.count({ where: { status: "PENDING" } }),
        prisma.salary.findMany({
          include: { user: { select: { status: true } } },
        }),
        prisma.user.findMany({
          where: { status: "ACTIVE" },
          select: { department: true },
        }),
        prisma.leaveRequest.findMany({
          where: { status: "PENDING" },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, department: true, designation: true } },
          },
        }),
        prisma.user.findMany({
          take: 5,
          orderBy: { dateJoined: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            designation: true,
            status: true,
            dateJoined: true,
          },
        }),
      ]);

      const activeSalaries = salaries.filter((s) => s.user.status === "ACTIVE");
      const monthlyPayroll = activeSalaries.reduce((acc, s) => acc + s.netSalary, 0);
      const totalBasic = activeSalaries.reduce((acc, s) => acc + s.basicPay, 0);
      const totalAllowances = activeSalaries.reduce((acc, s) => acc + s.allowances, 0);
      const totalDeductions = activeSalaries.reduce((acc, s) => acc + s.deductions, 0);
      const averageSalary = activeEmployees > 0 ? Math.round(monthlyPayroll / activeEmployees) : 0;

      // Group by department
      const deptMap: Record<string, number> = {};
      allEmployees.forEach((e) => {
        const d = e.department || "General";
        deptMap[d] = (deptMap[d] || 0) + 1;
      });
      const departmentHeadcounts = Object.entries(deptMap).map(([department, count]) => ({
        department,
        count,
      }));

      return NextResponse.json({
        role: "HR",
        metrics: {
          totalEmployees,
          activeEmployees,
          inactiveEmployees,
          pendingLeaves,
          monthlyPayroll,
          averageSalary,
        },
        payrollSummary: {
          totalBasic,
          totalAllowances,
          totalDeductions,
          totalNet: monthlyPayroll,
        },
        departmentHeadcounts,
        pendingLeavesList,
        recentEmployees,
      });
    }

    // EMPLOYEE role
    const [assignedTasks, completedTasks, pendingLeaves, myTasks, mySalary, myRecentLeaves, userProjects] =
      await Promise.all([
        prisma.task.count({ where: { assignedToId: user.userId, status: { not: "DONE" } } }),
        prisma.task.count({ where: { assignedToId: user.userId, status: "DONE" } }),
        prisma.leaveRequest.count({ where: { userId: user.userId, status: "PENDING" } }),
        prisma.task.findMany({
          where: { assignedToId: user.userId, status: { not: "DONE" } },
          take: 6,
          orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
          include: {
            project: { select: { name: true } },
          },
        }),
        prisma.salary.findUnique({
          where: { userId: user.userId },
        }),
        prisma.leaveRequest.findMany({
          where: { userId: user.userId },
          take: 4,
          orderBy: { createdAt: "desc" },
        }),
        prisma.project.findMany({
          where: {
            tasks: { some: { assignedToId: user.userId } },
          },
          take: 4,
          select: { id: true, name: true, status: true, type: true },
        }),
      ]);

    return NextResponse.json({
      role: "EMPLOYEE",
      metrics: {
        assignedTasks,
        completedTasks,
        pendingLeaves,
        activeProjects: userProjects.length,
      },
      myTasks,
      mySalary: mySalary || { basicPay: 0, allowances: 0, deductions: 0, netSalary: 0 },
      myRecentLeaves,
      myProjects: userProjects,
    });
  } catch (err: any) {
    console.error("Dashboard stats error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
