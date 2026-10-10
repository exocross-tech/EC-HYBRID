import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// POST /api/tasks/cleanup - Admin only cleanup for old completed tasks
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Only Admins can perform database task cleanup" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const days = parseInt(body.olderThanDays) || 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Find completed tasks updated before cutoffDate
    const completedTasks = await prisma.task.findMany({
      where: {
        status: "DONE",
        updatedAt: { lte: cutoffDate },
      },
      include: {
        project: { select: { name: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    });

    if (body.action === "EXPORT") {
      return NextResponse.json({
        tasks: completedTasks,
        count: completedTasks.length,
      });
    }

    // Delete tasks
    const deleteResult = await prisma.task.deleteMany({
      where: {
        status: "DONE",
        updatedAt: { lte: cutoffDate },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "TASK_CLEANUP",
        details: `Cleaned up and deleted ${deleteResult.count} completed tasks older than ${days} days`,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      message: `Successfully cleaned up ${deleteResult.count} completed tasks older than ${days} days`,
    });
  } catch (err: any) {
    console.error("Task cleanup error:", err);
    return NextResponse.json({ error: err.message || "Failed to cleanup tasks" }, { status: 500 });
  }
}
