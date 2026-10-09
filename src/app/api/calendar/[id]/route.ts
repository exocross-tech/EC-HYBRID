import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// DELETE /api/calendar/[id] - Admin & Manager
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  const existing = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  await prisma.calendarEvent.delete({ where: { id } });

  return NextResponse.json({ success: true, message: "Calendar event removed" });
}

// PUT /api/calendar/[id] - Admin & Manager
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  const existing = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { title, description, startDate, endDate, eventType, attendees, projectId } = body;

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(eventType !== undefined && { eventType }),
        ...(attendees !== undefined && { attendees: attendees || null }),
        ...(projectId !== undefined && { projectId: projectId || null }),
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "CALENDAR_EVENT_UPDATED",
        details: `Updated ${updatedEvent.eventType}: "${updatedEvent.title}"`,
      },
    });

    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (err: any) {
    console.error("Update calendar event error:", err);
    return NextResponse.json({ error: err.message || "Failed to update calendar event" }, { status: 500 });
  }
}

