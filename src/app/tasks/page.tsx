"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  FolderGit2,
  AlertCircle,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  ArrowRight,
  ShieldAlert,
  Kanban,
  ListTodo,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/formatDate";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  projectId: string;
  project: {
    id: string;
    name: string;
    type: string;
  };
  assignedToId?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
}

interface ProjectOption {
  id: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  department: string;
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"KANBAN" | "PLANNER">("KANBAN");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [plannerDate, setPlannerDate] = useState("");
  const [selectedMobileColumn, setSelectedMobileColumn] = useState<string>("ALL");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    projectId: "",
    assignedToId: "",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-dismiss success notification after 3 seconds
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => {
        setActionSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER";
  const isHR = user?.role === "HR";
  const isEmployee = user?.role === "EMPLOYEE";
  const canAssignTasks = isAdmin || isManager;

  const fetchTasks = async () => {
    if (isHR) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (viewMode === "PLANNER" && plannerDate) params.set("date", plannerDate);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Fetch tasks error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    if (canAssignTasks) {
      try {
        const [projRes, empRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/employees"),
        ]);
        if (projRes.ok) {
          const pData = await projRes.json();
          setProjects(pData.projects || []);
        }
        if (empRes.ok) {
          const eData = await empRes.json();
          setEmployees(eData.employees || []);
        }
      } catch (err) {
        console.error("Failed to load options:", err);
      }
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [search, priorityFilter, viewMode, plannerDate, user?.role]);

  useEffect(() => {
    fetchOptions();
  }, [user?.role]);

  // Real-time synchronization: auto-refreshes task board and planner live across all active devices
  useRealtimeSync((event) => {
    if (event.type === "TASK_UPDATED" || event.type === "TASK_CREATED" || event.type === "DATA_MUTATED") {
      fetchTasks();
    }
  });

  if (isHR) {
    return (
      <AppLayout title="Tasks & Planner" subtitle="Task tracking & daily work assignments">
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto mt-12 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-2">Access Restricted (HR Role)</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Per company permission specification Section 2, the <strong>HR</strong> role
            manages employee records and payroll exclusively and does not have access to tasks or project data.
          </p>
        </div>
      </AppLayout>
    );
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccess(`Task "${formData.title}" assigned successfully.`);
        setIsAddModalOpen(false);
        setFormData({
          title: "",
          description: "",
          projectId: "",
          assignedToId: "",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: "",
        });
        fetchTasks();
      } else {
        setActionError(data.error || "Failed to create task");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveTaskStatus = async (task: Task, newStatus: Task["status"]) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        // Optimistic UI update
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
        );
      } else {
        const data = await res.json();
        setActionError(data.error || "Status update failed");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    }
  };

  const handleOpenEdit = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      projectId: task.projectId,
      assignedToId: task.assignedToId || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    });
    setActionError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setActionError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccess(`Task "${formData.title}" updated.`);
        setIsEditModalOpen(false);
        fetchTasks();
      } else {
        setActionError(data.error || "Update failed");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) {
        setActionSuccess(`Task "${task.title}" deleted.`);
        fetchTasks();
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    }
  };

  const kanbanColumns: Array<{ id: Task["status"]; title: string; color: string }> = [
    { id: "TODO", title: "To Do", color: "border-slate-300" },
    { id: "IN_PROGRESS", title: "In Progress", color: "border-blue-400" },
    { id: "REVIEW", title: "In Review", color: "border-amber-400" },
    { id: "DONE", title: "Completed", color: "border-emerald-400" },
  ];

  return (
    <AppLayout
      title={isEmployee ? "My Daily Planner & Assigned Tasks" : "Tasks & Work Planner"}
      subtitle={
        isEmployee
          ? "Your daily work agenda: update task progress and complete assigned sprint deliverables"
          : "Work assignments, daily scheduling, and team execution tracking"
      }
    >
      {/* Floating Success Toast (Compact, Non-Intrusive, 3s Auto-dismiss) */}
      {actionSuccess && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-auto animate-in fade-in slide-in-from-top-4 duration-200 shadow-2xl rounded-2xl bg-white border border-emerald-200 p-3.5 flex items-center gap-3 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-800 pr-2">{actionSuccess}</p>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
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

      {/* Control Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode("KANBAN")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "KANBAN"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Kanban className="w-3.5 h-3.5 text-indigo-600" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setViewMode("PLANNER")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "PLANNER"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListTodo className="w-3.5 h-3.5 text-indigo-600" />
              <span>Daily Planner</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent 🔥</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Date Picker for Daily Planner */}
          {viewMode === "PLANNER" && (
            <input
              type="date"
              value={plannerDate}
              onChange={(e) => setPlannerDate(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          )}
        </div>

        {canAssignTasks && (
          <button
            onClick={() => {
              setFormData({
                title: "",
                description: "",
                projectId: projects[0]?.id || "",
                assignedToId: employees[0]?.id || "",
                status: "TODO",
                priority: "MEDIUM",
                dueDate: "",
              });
              setIsAddModalOpen(true);
            }}
            className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 gradient-brand text-white font-medium text-xs rounded-lg hover:opacity-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign New Task</span>
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading tasks and daily schedule...
        </div>
      ) : viewMode === "KANBAN" ? (
        /* KANBAN BOARD VIEW */
        <div className="space-y-3">
          {/* Mobile Column Quick Selector */}
          <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedMobileColumn("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedMobileColumn === "ALL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              All ({tasks.length})
            </button>
            {kanbanColumns.map((col) => {
              const count = tasks.filter((t) => t.status === col.id).length;
              return (
                <button
                  key={col.id}
                  onClick={() => setSelectedMobileColumn(col.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    selectedMobileColumn === col.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  {col.title} ({count})
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {kanbanColumns
              .filter((col) => selectedMobileColumn === "ALL" || col.id === selectedMobileColumn)
              .map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-slate-100/70 rounded-xl p-3 border border-slate-200/80 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">{col.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 shadow-2xs">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Task Cards in Column */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnTasks.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-[11px] border border-dashed border-slate-200 rounded-lg">
                      No tasks in {col.title}
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const priorityColor =
                        task.priority === "URGENT"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : task.priority === "HIGH"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : task.priority === "MEDIUM"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-100 text-slate-600 border-slate-200";

                      return (
                        <div
                          key={task.id}
                          className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Priority & Project Tag */}
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border uppercase ${priorityColor}`}
                              >
                                {task.priority}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                                {task.project.name}
                              </span>
                            </div>

                            {/* Title & Description */}
                            <h4 className="font-bold text-xs text-slate-900 leading-snug">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            {/* Due Date */}
                            {task.dueDate && (
                              <div className="mt-2.5 flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>Due: {formatDate(task.dueDate)}</span>
                              </div>
                            )}
                          </div>

                          {/* Footer with Assignee & Status Quick Switcher */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-700 to-blue-500 text-white flex items-center justify-center font-bold text-[9px]">
                                {task.assignedTo?.name?.charAt(0) || "U"}
                              </div>
                              <span className="text-[11px] text-slate-600 font-medium truncate max-w-[90px]">
                                {task.assignedTo?.name?.split(" ")[0] || "Unassigned"}
                              </span>
                            </div>

                            {/* Move Status Dropdown (Accessible to employee for their task & managers) */}
                            <div className="flex items-center gap-1">
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  handleMoveTaskStatus(task, e.target.value as any)
                                }
                                className="text-[10px] font-semibold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600 cursor-pointer"
                              >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">Progress</option>
                                <option value="REVIEW">Review</option>
                                <option value="DONE">Done</option>
                              </select>

                              {canAssignTasks && (
                                <button
                                  onClick={() => handleOpenEdit(task)}
                                  className="p-1 text-slate-400 hover:text-indigo-600"
                                  title="Edit Task"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                              {canAssignTasks && (
                                <button
                                  onClick={() => handleDeleteTask(task)}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      ) : (
        /* DAILY PLANNER VIEW */
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-indigo-600" />
                <span>Daily Work Schedule & Checklist</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Focus on high-priority items and toggle checkboxes to mark progress
              </p>
            </div>
            <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              {tasks.filter((t) => t.status === "DONE").length} / {tasks.length} Completed
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No tasks scheduled for this day or query.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`py-3.5 flex items-start justify-between gap-4 transition-colors ${
                    task.status === "DONE" ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() =>
                        handleMoveTaskStatus(
                          task,
                          task.status === "DONE" ? "TODO" : "DONE"
                        )
                      }
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all mt-0.5 cursor-pointer ${
                        task.status === "DONE"
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 hover:border-indigo-600 bg-white"
                      }`}
                    >
                      {task.status === "DONE" && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold text-xs text-slate-900 ${
                            task.status === "DONE" ? "line-through text-slate-400" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                            task.priority === "URGENT"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                      )}

                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <FolderGit2 className="w-3 h-3 text-slate-400" />
                          {task.project.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {task.assignedTo?.name || "Unassigned"}
                        </span>
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-amber-700">
                            <Clock className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        task.status === "DONE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : task.status === "IN_PROGRESS"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create / Edit Task */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                {isEditModalOpen ? "Edit Task Details" : "Assign New Work Task"}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={isEditModalOpen ? handleUpdateTask : handleCreateTask}
              className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Audit database read-replica latency"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Spec</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed criteria, link to docs, or acceptance test..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project</label>
                  <select
                    required
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assignee</label>
                  <select
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent 🔥</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 gradient-brand text-white font-medium rounded-lg hover:opacity-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? "Saving..." : isEditModalOpen ? "Save Changes" : "Assign Task"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
