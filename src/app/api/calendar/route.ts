import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/calendar - all roles can view organization calendar
export async function GET(req: NextRequest) {
  const { error, status, user } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(req.url);
  const eventType = searchParams.get("type");
  const projectId = searchParams.get("projectId");

  let whereClause: any = {};
  if (eventType) whereClause.eventType = eventType;
  if (projectId) whereClause.projectId = projectId;

  // If user is Employee, we include all company calendar events, but if linked to a project, employee can see public meetings & their projects
  const events = await prisma.calendarEvent.findMany({
    where: whereClause,
    include: {
      project: { select: { id: true, name: true, type: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json({ events });
}

// POST /api/calendar - Admin & Manager
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Only Admin & Manager can schedule calendar events" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { title, description, startDate, endDate, eventType, attendees, projectId } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: "Title, start date/time, and end date/time are required" }, { status: 400 });
    }

    const newEvent = await prisma.calendarEvent.create({
      data: {
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        eventType: eventType || "MEETING",
        attendees: attendees || null,
        projectId: projectId || null,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "CALENDAR_EVENT_CREATED",
        details: `Scheduled ${newEvent.eventType}: "${newEvent.title}" on ${newEvent.startDate.toDateString()}`,
      },
    });

    return NextResponse.json({ success: true, event: newEvent }, { status: 201 });
  } catch (err: any) {
    console.error("Create calendar event error:", err);
    return NextResponse.json({ error: err.message || "Failed to create calendar event" }, { status: 500 });
  }
}
