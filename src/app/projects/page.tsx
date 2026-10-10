"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/lib/formatCurrency";
import { formatDate } from "@/lib/formatDate";
import {
  FolderGit2,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  ShieldAlert,
  Eye,
  FileText,
  LayoutList,
  LayoutGrid,
  RefreshCw,
  Key,
  Layers,
  CheckSquare,
  Box,
  Flame,
} from "lucide-react";
import { DateInput } from "@/components/DateInput";

interface Project {
  id: string;
  name: string;
  description?: string;
  requirements?: string | null;
  type: "SERVICE" | "PRODUCT";
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "ON_HOLD";
  budget: number;
  billingType: string;
  startDate?: string;
  endDate?: string;
  client?: {
    id: string;
    name: string;
    company: string;
  };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
  }>;
  _count?: {
    tasks: number;
    calendarEvents: number;
  };
}

interface ClientOption {
  id: string;
  company: string;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // View mode toggle: List style is default (Requirement 7)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [requirementsProject, setRequirementsProject] = useState<Project | null>(null);
  const [requirementsText, setRequirementsText] = useState("");
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    requirements: "",
    type: "SERVICE",
    status: "PLANNING",
    budget: "",
    billingType: "FIXED",
    startDate: "",
    endDate: "",
    clientId: "",
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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
  const canManageProjects = isAdmin || isManager;

  const fetchProjects = async () => {
    if (isHR) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Fetch projects error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (isHR) return;
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error("Fetch clients for dropdown error:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, [search, typeFilter, statusFilter, user?.role]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const payload = {
        ...formData,
        budget: formData.budget === "" ? 0 : parseFloat(formData.budget) || 0,
        startDate: formData.startDate ? formData.startDate : null,
        endDate: formData.endDate ? formData.endDate : null,
        clientId: formData.type === "PRODUCT" ? null : (formData.clientId || null),
      };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccess(`Project "${formData.name}" created successfully.`);
        setIsAddModalOpen(false);
        setFormData({
          name: "",
          description: "",
          requirements: "",
          type: "SERVICE",
          status: "PLANNING",
          budget: "",
          billingType: "FIXED",
          startDate: "",
          endDate: "",
          clientId: "",
        });
        fetchProjects();
      } else {
        setActionError(data.error || "Failed to create project");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (proj: Project) => {
    setSelectedProject(proj);
    setFormData({
      name: proj.name,
      description: proj.description || "",
      requirements: proj.requirements || "",
      type: proj.type,
      status: proj.status,
      budget: proj.budget.toString(),
      billingType: proj.billingType === "HOURLY" ? "FIXED" : proj.billingType,
      startDate: proj.startDate ? proj.startDate.slice(0, 10) : "",
      endDate: proj.endDate ? proj.endDate.slice(0, 10) : "",
      clientId: proj.client?.id || "",
    });
    setActionError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const payload = {
        ...formData,
        budget: formData.budget === "" ? 0 : parseFloat(formData.budget) || 0,
        startDate: formData.startDate ? formData.startDate : null,
        endDate: formData.endDate ? formData.endDate : null,
        clientId: formData.type === "PRODUCT" ? null : (formData.clientId || null),
      };

      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccess(`Project "${formData.name}" updated successfully.`);
        setIsEditModalOpen(false);
        fetchProjects();
      } else {
        setActionError(data.error || "Failed to update project");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRequirements = (proj: Project) => {
    setRequirementsProject(proj);
    setRequirementsText(proj.requirements || "");
    setActionError(null);
  };

  const handleSaveRequirements = async () => {
    if (!requirementsProject || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/projects/${requirementsProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements: requirementsText }),
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccess(`Requirements & credentials saved for "${requirementsProject.name}".`);
        setRequirementsProject(null);
        fetchProjects();
      } else {
        setActionError(data.error || "Failed to save requirements");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirmDeleteProject || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/projects/${confirmDeleteProject.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(`Project "${confirmDeleteProject.name}" deleted.`);
        setConfirmDeleteProject(null);
        fetchProjects();
      } else {
        setActionError(data.error || "Delete failed");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Project Engagements & Initiatives"
      subtitle="Client contracted delivery, project vaults, and deliverable pipelines"
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
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <div className="relative w-full sm:flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by project name or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">All Project Types</option>
            <option value="SERVICE">IT Services (Contracted)</option>
            <option value="PRODUCT">Internal Product Work</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">All Statuses</option>
            <option value="PLANNING">Planning</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* View Toggle (Requirement 7) & Create Button */}
        <div className="flex items-center gap-2 justify-end">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Tabular List View (Default)"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden md:inline">List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Grid</span>
            </button>
          </div>

          {canManageProjects && (
            <button
              onClick={() => {
                setFormData({
                  name: "",
                  description: "",
                  requirements: "",
                  type: "SERVICE",
                  status: "PLANNING",
                  budget: "",
                  billingType: "FIXED",
                  startDate: "",
                  endDate: "",
                  clientId: "",
                });
                setIsAddModalOpen(true);
              }}
              className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 gradient-brand text-white font-medium text-xs rounded-lg hover:opacity-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Projects Rendering */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading project engagements...
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
          No projects found matching your criteria.
        </div>
      ) : viewMode === "list" ? (
        /* =========================================================================
           TABULAR LIST VIEW (DEFAULT - Requirement 7)
           ========================================================================= */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[850px]">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Project Name & Type</th>
                  <th className="py-3 px-4">Client Affiliation</th>
                  <th className="py-3 px-4">Financial Valuation & Allocation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Task Completion</th>
                  <th className="py-3 px-4">Timeline</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((proj) => {
                  const completedTasks = proj.tasks.filter((t) => t.status === "DONE").length;
                  const totalTasks = proj.tasks.length;
                  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                  const statusBadge =
                    proj.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : proj.status === "PLANNING"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : proj.status === "ON_HOLD"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <tr key={proj.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Project Name & Type */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-semibold text-slate-900 leading-snug">{proj.name}</p>
                          <span className="inline-block mt-0.5 text-[10px] font-medium text-slate-500">
                            {proj.type === "SERVICE" ? "IT Services (Contracted)" : "Internal Product"}
                          </span>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        {proj.client ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium">{proj.client.company}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                            <Box className="w-3 h-3 text-indigo-500" />
                            In-House Platform
                          </span>
                        )}
                      </td>

                      {/* Financial Valuation & Allocation */}
                      <td className="py-3.5 px-4">
                        {proj.budget <= 0 ? (
                          <div>
                            <p className="font-semibold text-slate-500">{formatINR(0)}</p>
                          </div>
                        ) : proj.type === "PRODUCT" ? (
                          <div>
                            <p className="font-bold text-amber-700 flex items-center gap-1">
                              {formatINR(proj.budget)}
                              <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                Expense
                              </span>
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-indigo-700">{formatINR(proj.budget)}</p>
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-0.5">
                              <Building2 className="w-3 h-3 text-indigo-400" />
                              {proj.billingType === "SUBSCRIPTION" ? "Subscription Contract" : "Fixed Milestone (Revenue)"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge}`}>
                          {proj.status}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="py-3.5 px-4 min-w-[130px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                            <span>{progress}%</span>
                            <span>{completedTasks}/{totalTasks}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Timeline (DD-MM-YYYY) */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {proj.startDate || proj.endDate ? (
                          <span>{proj.startDate ? formatDate(proj.startDate) : "—"} to {proj.endDate ? formatDate(proj.endDate) : "—"}</span>
                        ) : (
                          <span className="text-slate-400 italic">No dates set</span>
                        )}
                      </td>

                      {/* Actions (Requirements 8 & 9) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1. View Details Icon (Eye) */}
                          <button
                            onClick={() => setViewingProject(proj)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="View Project Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Requirement & Vault Icon (FileText) */}
                          <button
                            onClick={() => handleOpenRequirements(proj)}
                            className="p-1.5 rounded-md hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 transition-colors cursor-pointer"
                            title="Requirements & Credentials Vault"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. Edit Icon */}
                          {canManageProjects && (
                            <button
                              onClick={() => handleOpenEdit(proj)}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                              title="Edit Project"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 4. Delete Icon */}
                          {isAdmin && (
                            <button
                              onClick={() => setConfirmDeleteProject(proj)}
                              className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* =========================================================================
           CARD GRID VIEW
           ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => {
            const completedTasks = proj.tasks.filter((t) => t.status === "DONE").length;
            const totalTasks = proj.tasks.length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            const statusBadge =
              proj.status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : proj.status === "PLANNING"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : proj.status === "ON_HOLD"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-slate-100 text-slate-700 border-slate-200";

            return (
              <div
                key={proj.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge}`}>
                      {proj.status}
                    </span>
                    {proj.type === "PRODUCT" ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5 text-amber-500" />
                        Proprietary R&D Platform
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        IT Services (Contracted)
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug">{proj.name}</h3>
                  {proj.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{proj.description}</p>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    {proj.client ? (
                      <>
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Client: <strong>{proj.client.company}</strong></span>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        <Box className="w-3 h-3 text-indigo-500" />
                        In-House Platform
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-600">Task Completion</span>
                      <span className="font-bold text-slate-900">{progress}% ({completedTasks}/{totalTasks})</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    {proj.type === "PRODUCT" ? (
                      <>
                        <span className="text-[10px] font-medium text-amber-600 block uppercase">
                          R&D Capital Allocated (Internal)
                        </span>
                        <span className="font-bold text-amber-700 text-sm">{formatINR(proj.budget)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] text-slate-400 block">
                          Contracted Value ({proj.billingType === "SUBSCRIPTION" ? "Subscription" : "Fixed"})
                        </span>
                        <span className="font-bold text-indigo-700 text-sm">{formatINR(proj.budget)}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingProject(proj)}
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenRequirements(proj)}
                      className="p-1.5 rounded-md hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 transition-colors cursor-pointer"
                      title="Requirements & Credentials Vault"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    {canManageProjects && (
                      <button
                        onClick={() => handleOpenEdit(proj)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Edit Project"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => setConfirmDeleteProject(proj)}
                        className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: View Project Details (Requirement 8) */}
      {viewingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[85dvh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-600/30 border border-indigo-400/30 text-indigo-300">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">{viewingProject.name}</h3>
                  <p className="text-xs text-indigo-300">
                    {viewingProject.client ? viewingProject.client.company : "Proprietary In-House Platform"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingProject(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">
                    {viewingProject.type === "PRODUCT" ? "R&D Capital Allocated" : "Budget"}
                  </span>
                  <p className={`font-bold text-sm mt-0.5 ${viewingProject.type === "PRODUCT" ? "text-amber-700" : "text-slate-900"}`}>
                    {formatINR(viewingProject.budget)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">
                    {viewingProject.type === "PRODUCT" ? "Financial Nature" : "Billing Type"}
                  </span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {viewingProject.type === "PRODUCT"
                      ? "Internal R&D Outlay (Non-Billable)"
                      : viewingProject.billingType === "SUBSCRIPTION"
                      ? "Subscription Contract"
                      : "Fixed Milestone (Revenue)"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Lifecycle Status</span>
                  <p className="font-medium text-emerald-700 mt-0.5">{viewingProject.status}</p>
                </div>

                {viewingProject.type === "PRODUCT" && (
                  <div className="sm:col-span-3 bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
                    <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      <strong>Proprietary Product Initiative:</strong> All funds allocated represent company self-funded engineering and infrastructure expenditure. This initiative does not produce client accounts receivable or billable invoices.
                    </p>
                  </div>
                )}
                <div className="sm:col-span-3 border-t border-slate-200/60 pt-2">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Delivery Timeline</span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {viewingProject.startDate ? formatDate(viewingProject.startDate) : "Not started"} &mdash; {viewingProject.endDate ? formatDate(viewingProject.endDate) : "Ongoing"}
                  </p>
                </div>
              </div>

              {viewingProject.description && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Project Description & Scope</span>
                  <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {viewingProject.description}
                  </p>
                </div>
              )}

              {/* Tasks Summary */}
              <div>
                <span className="font-semibold text-slate-700 block mb-1.5">
                  Tasks ({viewingProject.tasks.length})
                </span>
                {viewingProject.tasks.length === 0 ? (
                  <p className="text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                    No tasks assigned to this project yet.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {viewingProject.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700"
                      >
                        <span className="font-medium">{task.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 font-medium">
                            {task.priority}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setViewingProject(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Requirements, Credentials & Vault (Requirement 9) */}
      {requirementsProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-600/10 border border-indigo-200 text-indigo-600">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">Requirements & Project Vault</h3>
                  <p className="text-xs text-indigo-600 font-medium">{requirementsProject.name}</p>
                </div>
              </div>
              <button
                onClick={() => setRequirementsProject(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-[11px] leading-relaxed">
                Store project requirements, credential keys, server IPs, test accounts, repository links, or delivery specs. This information is saved securely for this project.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Project Notes, Requirements & Credentials Data
                </label>
                <textarea
                  rows={14}
                  value={requirementsText}
                  onChange={(e) => setRequirementsText(e.target.value)}
                  placeholder={`### Requirements & Deliverables:
- Milestone 1: User auth and database setup
- Milestone 2: Payment gateway integration

### Credentials & Keys:
- Staging URL: https://staging.example.com
- API Key: sk_test_...
- Database Host: db.example.internal

### Technical Notes:
- Client requested weekly progress updates on Fridays`}
                  className="w-full p-4 font-mono text-xs bg-slate-50 text-slate-800 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 resize-none leading-relaxed transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setRequirementsProject(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveRequirements}
                className="px-4 py-1.5 gradient-brand text-white font-medium rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Vault...</span>
                  </>
                ) : (
                  <span>Save Requirements Vault</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {confirmDeleteProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-200 shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Delete Project?</h3>
                <p className="text-xs text-slate-500">{confirmDeleteProject.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete this project engagement? This will delete all project tasks and calendar milestones permanently.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmDeleteProject(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteProject}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Permanently Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Project (Requirement 14: HOURLY option removed) */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-indigo-600" />
                {isEditModalOpen ? `Edit Project: ${selectedProject?.name}` : "Create New Project Engagement"}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={isEditModalOpen ? handleUpdateProject : handleCreateProject}
              className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apex FinTech Migration & Zero-Trust Audit"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Scope of work, deliverables, and architecture goals..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="SERVICE">IT Services (Contracted)</option>
                    <option value="PRODUCT">Internal Product Work</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lifecycle Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="PLANNING">PLANNING</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {formData.type === "PRODUCT"
                      ? "R&D Capital Allocated (Internal Expense ₹)"
                      : "Contracted Budget (INR ₹)"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  {formData.type === "PRODUCT" && (
                    <span className="text-[10px] text-amber-600 mt-0.5 block">
                      Internal expenditure allocated from company reserves. Non-billable.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {formData.type === "PRODUCT" ? "Billing Structure" : "Billing Type"}
                  </label>
                  {formData.type === "PRODUCT" ? (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-600" />
                      <span>Non-Billable Internal R&D Outlay</span>
                    </div>
                  ) : (
                    <select
                      value={formData.billingType}
                      onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="FIXED">Fixed Milestone</option>
                      <option value="SUBSCRIPTION">Subscription / Retainer</option>
                    </select>
                  )}
                </div>
              </div>

              {formData.type === "SERVICE" ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Client Affiliation</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">No Client (Select Contracted Client)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.company}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs text-slate-600">
                  <Box className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Client Affiliation: <strong>No Client (In-House Proprietary Platform)</strong></span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Start Date</label>
                  <DateInput
                    value={formData.startDate}
                    onChange={(val) => setFormData({ ...formData, startDate: val })}
                    placeholder="DD-MM-YYYY"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target End Date</label>
                  <DateInput
                    value={formData.endDate}
                    onChange={(val) => setFormData({ ...formData, endDate: val })}
                    placeholder="DD-MM-YYYY"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isSubmitting}
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
                  className="px-4 py-1.5 gradient-brand text-white font-medium rounded-lg hover:opacity-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isEditModalOpen ? "Updating..." : "Creating..."}</span>
                    </>
                  ) : (
                    <span>{isEditModalOpen ? "Update Project" : "Create Project"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
