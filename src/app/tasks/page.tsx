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
  Users,
  Archive,
  Download,
} from "lucide-react";
import { formatDate } from "@/lib/formatDate";
import { AssigneeAvatarCluster } from "@/components/AssigneeAvatarCluster";
import { MultiAssigneeSelect } from "@/components/MultiAssigneeSelect";
import { DateInput } from "@/components/DateInput";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

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
  assignees?: Array<{
    id: string;
    name: string;
    email?: string;
    department?: string;
  }>;
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
  const [assigneeFilter, setAssigneeFilter] = useState("");
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
    assigneeIds: [] as string[],
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag and drop state (Item 2)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Completed task cleanup state (Item 3)
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupOlderDays, setCleanupOlderDays] = useState(30);
  const [isCleaning, setIsCleaning] = useState(false);

  // Custom Delete Task Modal state (Item 5)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

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
      if (assigneeFilter) params.set("assignedToId", assigneeFilter);
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
  }, [search, priorityFilter, assigneeFilter, viewMode, plannerDate, user?.role]);

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
        body: JSON.stringify({
          ...formData,
          assignedToId: formData.assigneeIds[0] || formData.assignedToId || null,
          assigneeIds: formData.assigneeIds,
        }),
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
          assigneeIds: [],
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

  // HTML5 Drag and Drop Handler (Item 2)
  const handleDropTask = async (taskId: string, newStatus: Task["status"]) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Instant optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        // Rollback on failure
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
        );
        setActionError("Failed to update task status");
      }
    } catch (err: any) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      );
      setActionError(err.message || "Network error");
    }
  };

  // Export completed tasks backup before cleanup (Item 3)
  const handleExportCompletedTasks = async () => {
    try {
      const res = await fetch("/api/tasks/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olderThanDays: cleanupOlderDays, action: "EXPORT" }),
      });
      const data = await res.json();
      if (res.ok) {
        const jsonStr = JSON.stringify(data.tasks, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `EC_HYBRID_Completed_Tasks_Backup_${cleanupOlderDays}d.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setActionError("Failed to export backup");
    }
  };

  // Execute database task cleanup (Item 3)
  const handleExecuteCleanup = async () => {
    setIsCleaning(true);
    setActionError(null);
    try {
      const res = await fetch("/api/tasks/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olderThanDays: cleanupOlderDays }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(data.message || `Cleaned up ${data.deletedCount} tasks`);
        setShowCleanupModal(false);
        fetchTasks();
      } else {
        setActionError(data.error || "Failed to cleanup tasks");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsCleaning(false);
    }
  };

  const handleOpenEdit = (task: Task) => {
    setSelectedTask(task);
    const existingAssigneeIds =
      task.assignees && task.assignees.length > 0
        ? task.assignees.map((u) => u.id)
        : task.assignedToId
        ? [task.assignedToId]
        : [];

    setFormData({
      title: task.title,
      description: task.description || "",
      projectId: task.projectId,
      assignedToId: existingAssigneeIds[0] || "",
      assigneeIds: existingAssigneeIds,
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
        body: JSON.stringify({
          ...formData,
          assignedToId: formData.assigneeIds[0] || formData.assignedToId || null,
          assigneeIds: formData.assigneeIds,
        }),
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

  const handleDeleteTask = (task: Task) => {
    setDeletingTask(task);
  };

  const handleConfirmDeleteTask = async () => {
    if (!deletingTask) return;
    setIsDeletingTask(true);
    try {
      const res = await fetch(`/api/tasks/${deletingTask.id}`, { method: "DELETE" });
      if (res.ok) {
        setActionSuccess(`Task "${deletingTask.title}" deleted.`);
        setDeletingTask(null);
        fetchTasks();
      } else {
        const data = await res.json();
        setActionError(data.error || "Failed to delete task");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsDeletingTask(false);
    }
  };

  const kanbanColumns: Array<{ id: Task["status"]; title: string; color: string }> = [
    { id: "TODO", title: "To Do", color: "border-slate-300" },
    { id: "IN_PROGRESS", title: "In Progress", color: "border-blue-400" },
    { id: "REVIEW", title: "In Review", color: "border-amber-400" },
    { id: "DONE", title: "Completed", color: "border-emerald-400" },
  ];

  const myDirectTasks = tasks
    .filter(
      (t) =>
        (t.assignedToId === user?.id ||
          t.assignees?.some((a) => a.id === user?.id)) &&
        t.status !== "DONE"
    )
    .slice(0, 4);

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

          {/* Assignee Filter (Admin & Manager) */}
          {!isEmployee && (
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">All Assignees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          )}

          {/* Date Picker for Daily Planner (DD-MM-YYYY) */}
          {viewMode === "PLANNER" && (
            <div className="w-36">
              <DateInput
                value={plannerDate}
                onChange={(val) => setPlannerDate(val)}
                placeholder="DD-MM-YYYY"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isAdmin && (
            <button
              onClick={() => setShowCleanupModal(true)}
              className="px-3 py-2 sm:py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              title="Clean up old completed tasks to optimize performance"
            >
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              <span>Clean Up Tasks</span>
            </button>
          )}

          {canAssignTasks && (
            <button
              onClick={() => {
                setFormData({
                  title: "",
                  description: "",
                  projectId: projects[0]?.id || "",
                  assignedToId: employees[0]?.id || "",
                  assigneeIds: employees[0]?.id ? [employees[0].id] : [],
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
      </div>

      {/* My Direct Action Items / Assigned Tasks Queue (3-4 Cards) */}
      {!loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                  <span>My Assigned Tasks & Action Items</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                    {myDirectTasks.length} Pending
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isAdmin
                    ? "Executive focus queue: action items and deliverables assigned directly to you"
                    : "Your assigned sprint deliverables and priorities"}
                </p>
              </div>
            </div>
            {myDirectTasks.length > 0 && (
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Top Priority Focus
              </span>
            )}
          </div>

          {myDirectTasks.length === 0 ? (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>No pending tasks directly assigned to your account right now. You are all caught up!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {myDirectTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleOpenEdit(t)}
                  className="bg-slate-50/80 hover:bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-3.5 cursor-pointer transition-all flex flex-col justify-between group shadow-xs hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] font-bold text-indigo-600 truncate max-w-[120px] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        {t.project?.name || "General"}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          t.priority === "URGENT"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : t.priority === "HIGH"
                            ? "bg-orange-50 text-orange-700 border border-orange-200"
                            : t.priority === "MEDIUM"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {t.title}
                    </h4>
                  </div>

                  <div className="pt-2.5 mt-3 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {t.dueDate ? formatDate(t.dueDate) : "No due date"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        t.status === "TODO"
                          ? "bg-slate-100 text-slate-700 border-slate-200"
                          : t.status === "IN_PROGRESS"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverColumn !== col.id) setDragOverColumn(col.id);
                }}
                onDragLeave={(e) => {
                  // Only clear if leaving the column itself
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (dragOverColumn === col.id) setDragOverColumn(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
                  setDragOverColumn(null);
                  setDraggedTaskId(null);
                  if (taskId) {
                    handleDropTask(taskId, col.id);
                  }
                }}
                className={`rounded-xl p-3 border transition-all flex flex-col min-h-[500px] ${
                  dragOverColumn === col.id
                    ? "bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20 shadow-md"
                    : "bg-slate-100/70 border-slate-200/80"
                }`}
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
                <div className="space-y-3 flex-1 overflow-y-auto min-h-[80px]">
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
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", task.id);
                            e.dataTransfer.effectAllowed = "move";
                            setDraggedTaskId(task.id);
                          }}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverColumn(null);
                          }}
                          className={`bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between cursor-grab active:cursor-grabbing select-none ${
                            draggedTaskId === task.id
                              ? "opacity-40 scale-95 border-dashed border-indigo-400"
                              : ""
                          }`}
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
                              <AssigneeAvatarCluster
                                assignees={task.assignees}
                                fallbackUser={task.assignedTo}
                                size="xs"
                                showName={true}
                              />
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
                                  className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                                  title="Edit Task"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                              {canAssignTasks && (
                                <button
                                  onClick={() => handleDeleteTask(task)}
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
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
                          <AssigneeAvatarCluster
                            assignees={task.assignees}
                            fallbackUser={task.assignedTo}
                            size="xs"
                            showName={true}
                          />
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Assignees (Collaborative Team Assignment)
                </label>
                <MultiAssigneeSelect
                  employees={employees}
                  selectedIds={formData.assigneeIds}
                  onChange={(ids) =>
                    setFormData({
                      ...formData,
                      assigneeIds: ids,
                      assignedToId: ids[0] || "",
                    })
                  }
                  placeholder="Select one or more team members..."
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Assign multiple team members. The first member is designated as the Lead ⭐.
                </span>
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
                  <DateInput
                    value={formData.dueDate}
                    onChange={(val) => setFormData({ ...formData, dueDate: val })}
                    placeholder="DD-MM-YYYY"
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

      {/* Modal: Task Cleanup & Archiving (Item 3) */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Task Storage Optimization</h3>
                  <p className="text-[11px] text-slate-500">Archive & clean completed tasks</p>
                </div>
              </div>
              <button
                onClick={() => setShowCleanupModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed text-xs">
                As your team completes tasks, storing past items forever consumes database capacity.
                You can clean up completed tasks older than a specific age. We recommend downloading a backup first.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Select Age Threshold
                </label>
                <select
                  value={cleanupOlderDays}
                  onChange={(e) => setCleanupOlderDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value={15}>Completed older than 15 days</option>
                  <option value={30}>Completed older than 30 days (Recommended)</option>
                  <option value={60}>Completed older than 60 days</option>
                  <option value={90}>Completed older than 90 days</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Exporting creates a comprehensive JSON file backup with full task metadata and assignees for your company records.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCompletedTasks}
                  className="w-full sm:flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download Backup (.JSON)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCleanup}
                  disabled={isCleaning}
                  className="w-full sm:flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isCleaning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isCleaning ? "Cleaning..." : "Permanently Clean Up"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Custom Delete Task Modal (Item 5) */}
      <DeleteConfirmModal
        isOpen={!!deletingTask}
        title="Delete Work Task"
        itemName={deletingTask?.title}
        description="Are you sure you want to permanently delete this task? All sub-checklists, sprint references, and assignee assignments will be removed."
        confirmText="Delete Task"
        isDeleting={isDeletingTask}
        onConfirm={handleConfirmDeleteTask}
        onCancel={() => setDeletingTask(null)}
      />
    </AppLayout>
  );
}
