"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Users,
  FolderGit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
  Eye,
  Info,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  eventType: "MEETING" | "DEADLINE" | "LEAVE" | "PROJECT_MILESTONE";
  attendees?: string;
  project?: {
    id: string;
    name: string;
  };
}

interface ProjectOption {
  id: string;
  name: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "agenda">("grid");

  // Current view date for calendar navigation
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dayEventsModal, setDayEventsModal] = useState<{ date: string; events: CalendarEvent[] } | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    eventType: "MEETING",
    projectId: "",
    attendees: "",
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER";
  const canSchedule = isAdmin || isManager;

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/calendar?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Fetch calendar error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch {
      // HR or unauthorized can ignore
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [typeFilter]);

  useEffect(() => {
    if (canSchedule) fetchProjects();
  }, [user?.role]);

  // Date Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Open Add Modal pre-filled for a specific date cell
  const handleOpenAddForDate = (dateStr: string) => {
    if (!canSchedule) return;
    setFormData({
      title: "",
      description: "",
      startDate: `${dateStr}T09:00`,
      endDate: `${dateStr}T10:00`,
      eventType: "MEETING",
      projectId: "",
      attendees: "",
    });
    setIsAddModalOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccess(`Event "${formData.title}" scheduled successfully.`);
        setIsAddModalOpen(false);
        setFormData({
          title: "",
          description: "",
          startDate: "",
          endDate: "",
          eventType: "MEETING",
          projectId: "",
          attendees: "",
        });
        fetchEvents();
      } else {
        setActionError(data.error || "Failed to create event");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    }
  };

  const handleDeleteEvent = async (ev: CalendarEvent) => {
    if (!confirm(`Remove event "${ev.title}"?`)) return;

    try {
      const res = await fetch(`/api/calendar/${ev.id}`, { method: "DELETE" });
      if (res.ok) {
        setActionSuccess(`Event "${ev.title}" removed.`);
        setSelectedEvent(null);
        if (dayEventsModal) {
          setDayEventsModal({
            ...dayEventsModal,
            events: dayEventsModal.events.filter((e) => e.id !== ev.id),
          });
        }
        fetchEvents();
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    }
  };

  // Event style helper
  const getEventBadgeClass = (type: CalendarEvent["eventType"]) => {
    switch (type) {
      case "MEETING":
        return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
      case "PROJECT_MILESTONE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
      case "DEADLINE":
        return "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100";
      case "LEAVE":
        return "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200";
    }
  };

  // 7-Column Month Grid Calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun, ..., 6 = Sat
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;

  // Build grid calendar cells
  interface DayCell {
    dayNumber: number;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    events: CalendarEvent[];
  }

  const calendarCells: DayCell[] = [];

  // 1. Previous month padding days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, day);
    const dateStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    const cellEvents = events.filter((ev) => {
      const s = ev.startDate.slice(0, 10);
      const e = ev.endDate.slice(0, 10);
      return dateStr >= s && dateStr <= e;
    });
    calendarCells.push({
      dayNumber: day,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      events: cellEvents,
    });
  }

  // 2. Current month days
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const cellEvents = events.filter((ev) => {
      const s = ev.startDate.slice(0, 10);
      const e = ev.endDate.slice(0, 10);
      return dateStr >= s && dateStr <= e;
    });
    calendarCells.push({
      dayNumber: day,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      events: cellEvents,
    });
  }

  // 3. Next month padding days to make full 5 or 6 weeks (35 or 42 cells)
  const remainingCells = 42 - calendarCells.length;
  for (let day = 1; day <= remainingCells; day++) {
    const nextMonthDate = new Date(year, month + 1, day);
    const dateStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    const cellEvents = events.filter((ev) => {
      const s = ev.startDate.slice(0, 10);
      const e = ev.endDate.slice(0, 10);
      return dateStr >= s && dateStr <= e;
    });
    calendarCells.push({
      dayNumber: day,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      events: cellEvents,
    });
  }

  return (
    <AppLayout
      title="Shared Organization Calendar"
      subtitle="Interactive 7-day month view: meetings, deliverable deadlines, project milestones, and approved leaves"
    >
      {/* Alerts */}
      {actionSuccess && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Control & Navigation Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-5 flex flex-wrap items-center justify-between gap-3">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-base font-black text-slate-900 ml-2">
            {MONTH_NAMES[month]} {year}
          </h2>
        </div>

        {/* Filters, View Toggle & Actions */}
        <div className="flex items-center gap-2.5">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">All Categories</option>
            <option value="MEETING">Meetings</option>
            <option value="PROJECT_MILESTONE">Project Milestones</option>
            <option value="DEADLINE">Deadlines</option>
            <option value="LEAVE">Approved Leaves</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                viewMode === "grid"
                  ? "bg-white text-indigo-700 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="7-Column Month Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Month</span>
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                viewMode === "agenda"
                  ? "bg-white text-indigo-700 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Agenda List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Agenda</span>
            </button>
          </div>

          {canSchedule && (
            <button
              onClick={() => {
                const now = new Date();
                const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
                  now.getDate()
                ).padStart(2, "0")}`;
                handleOpenAddForDate(nowStr);
              }}
              className="px-3.5 py-1.5 gradient-brand text-white font-medium text-xs rounded-lg hover:opacity-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Calendar Views */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading company calendar schedule...
        </div>
      ) : viewMode === "grid" ? (
        /* ================= 7-COLUMN MONTH CALENDAR GRID ================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Day of Week Headers (Sun - Sat) */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 py-2.5">
            {WEEKDAYS.map((dayName, idx) => (
              <div
                key={dayName}
                className={idx === 0 || idx === 6 ? "text-slate-400" : "text-slate-700"}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* 42 Date Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100">
            {calendarCells.map((cell, idx) => (
              <div
                key={`${cell.dateStr}-${idx}`}
                onClick={() => {
                  if (canSchedule) handleOpenAddForDate(cell.dateStr);
                }}
                className={`min-h-[105px] p-1.5 flex flex-col justify-between transition-all group relative ${
                  cell.isCurrentMonth ? "bg-white hover:bg-indigo-50/20" : "bg-slate-50/60"
                } ${canSchedule ? "cursor-pointer" : "cursor-default"}`}
              >
                {/* Top Row: Date Number and Quick Add Button */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-semibold ${
                      cell.isToday
                        ? "w-6 h-6 rounded-full bg-indigo-600 text-white font-bold shadow-2xs"
                        : cell.isCurrentMonth
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {canSchedule && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddForDate(cell.dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      title={`Schedule event on ${cell.dateStr}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Event Chips (Up to 3 per cell) */}
                <div className="mt-1 space-y-1 overflow-hidden flex-1">
                  {cell.events.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(ev);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border truncate transition-all cursor-pointer ${getEventBadgeClass(
                        ev.eventType
                      )}`}
                      title={`${ev.title} (${ev.eventType.replace("_", " ")})`}
                    >
                      <span className="font-bold mr-1">
                        {new Date(ev.startDate).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span>{ev.title}</span>
                    </div>
                  ))}

                  {/* "+N more" badge if cell has more than 3 events */}
                  {cell.events.length > 3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDayEventsModal({ date: cell.dateStr, events: cell.events });
                      }}
                      className="w-full text-left text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline px-1"
                    >
                      +{cell.events.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ================= AGENDA / LIST VIEW ================= */
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              No calendar events found matching the filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getEventBadgeClass(
                          ev.eventType
                        )}`}
                      >
                        {ev.eventType.replace("_", " ")}
                      </span>
                      {canSchedule && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(ev);
                          }}
                          className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                          title="Remove Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <h3 className="font-bold text-xs text-slate-900 leading-snug">{ev.title}</h3>
                    {ev.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{ev.description}</p>
                    )}

                    {ev.project && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-indigo-700 font-medium">
                        <FolderGit2 className="w-3.5 h-3.5" />
                        <span>Project: {ev.project.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(ev.startDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(ev.startDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: EVENT DETAILS ================= */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getEventBadgeClass(
                  selectedEvent.eventType
                )}`}
              >
                {selectedEvent.eventType.replace("_", " ")}
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <h3 className="text-base font-bold text-slate-900">{selectedEvent.title}</h3>

              {selectedEvent.description && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-xs leading-relaxed">
                  {selectedEvent.description}
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-100 text-slate-600">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong>Starts:</strong>{" "}
                    {new Date(selectedEvent.startDate).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong>Ends:</strong>{" "}
                    {new Date(selectedEvent.endDate).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                {selectedEvent.project && (
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      <strong>Project:</strong> {selectedEvent.project.name}
                    </span>
                  </div>
                )}

                {selectedEvent.attendees && (
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Attendees:</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5 break-all">
                        {selectedEvent.attendees}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {canSchedule && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Event</span>
                  </button>

                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ALL EVENTS ON DAY ================= */}
      {dayEventsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <span>Events for {new Date(dayEventsModal.date).toLocaleDateString()}</span>
              </h3>
              <button
                onClick={() => setDayEventsModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2.5">
              {dayEventsModal.events.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setDayEventsModal(null);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${getEventBadgeClass(
                    ev.eventType
                  )}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">{ev.eventType.replace("_", " ")}</span>
                    <span className="text-[10px] font-mono">
                      {new Date(ev.startDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs mt-1">{ev.title}</h4>
                  {ev.description && <p className="text-[11px] opacity-80 mt-0.5 line-clamp-1">{ev.description}</p>}
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDayEventsModal(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SCHEDULE EVENT ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                Schedule Organization Calendar Event
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Apex FinTech Bi-Weekly Architecture Sync"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Agenda, video call URL, or meeting notes..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Event Type</label>
                  <select
                    value={formData.eventType}
                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="MEETING">Meeting</option>
                    <option value="PROJECT_MILESTONE">Project Milestone</option>
                    <option value="DEADLINE">Deadline</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Linked Project</label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">General (No Project Link)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attendees (Comma-separated emails)</label>
                <input
                  type="text"
                  value={formData.attendees}
                  onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                  placeholder="alex@echybrid.com, marcus@echybrid.com"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 gradient-brand text-white font-medium rounded-lg hover:opacity-95 transition-all shadow-xs cursor-pointer"
                >
                  Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
