"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/lib/formatCurrency";
import { formatDate, toInputDateFormat } from "@/lib/formatDate";
import {
  Box,
  Plus,
  Search,
  Calendar,
  CheckSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Trash2,
  X,
  Eye,
  Key,
  Layers,
  RefreshCw,
  LayoutGrid,
  LayoutList,
  GitBranch,
  Shield,
  TrendingUp,
  Activity,
  User,
  ArrowRight,
  ExternalLink,
  Flame,
  Check,
  Copy,
} from "lucide-react";

interface ProductTask {
  id: string;
  title: string;
  description?: string | null;
  status: string; // TODO, IN_PROGRESS, REVIEW, DONE
  priority: string; // LOW, MEDIUM, HIGH, URGENT
  dueDate?: string | null;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  } | null;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  requirements?: string | null;
  type: string;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "ON_HOLD";
  budget: number;
  billingType: string;
  startDate?: string | null;
  endDate?: string | null;
  tasks: ProductTask[];
  _count?: {
    tasks: number;
    calendarEvents: number;
  };
}

interface Metrics {
  totalProducts: number;
  activeProducts: number;
  planningProducts: number;
  completedProducts: number;
  onHoldProducts: number;
  totalTasks: number;
  completedTasks: number;
  activeSprintTasks: number;
  overallCompletionRate: number;
  totalBudget: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  department?: string;
  role?: string;
}

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalProducts: 0,
    activeProducts: 0,
    planningProducts: 0,
    completedProducts: 0,
    onHoldProducts: 0,
    totalTasks: 0,
    completedTasks: 0,
    activeSprintTasks: 0,
    overallCompletionRate: 0,
    totalBudget: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewingRoadmapProduct, setViewingRoadmapProduct] = useState<Product | null>(null);
  const [vaultProduct, setVaultProduct] = useState<Product | null>(null);
  const [vaultText, setVaultText] = useState("");
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedVault, setCopiedVault] = useState(false);

  // Quick Sprint Task form state (inside Roadmap modal)
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
    assignedToId: "",
  });

  // Create / Edit Product Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    requirements: "",
    status: "PLANNING",
    budget: "",
    billingType: "FIXED",
    startDate: "",
    endDate: "",
  });

  // Toast feedback state
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 3-second auto dismiss for success notification
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
  const canManageProducts = isAdmin || isManager;

  const fetchProducts = async () => {
    if (isHR) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        if (data.metrics) setMetrics(data.metrics);
        if (data.teamMembers) setTeamMembers(data.teamMembers);

        // Keep viewingRoadmapProduct synced if open
        if (viewingRoadmapProduct) {
          const updated = (data.products || []).find((p: Product) => p.id === viewingRoadmapProduct.id);
          if (updated) setViewingRoadmapProduct(updated);
        }
      } else {
        const data = await res.json();
        setActionError(data.error || "Failed to load products");
      }
    } catch (err: any) {
      console.error("Fetch products error:", err);
      setActionError(err.message || "Network error loading products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, statusFilter]);

  // Form reset helpers
  const handleOpenAddModal = () => {
    setFormData({
      name: "",
      description: "",
      requirements: "",
      status: "PLANNING",
      budget: "",
      billingType: "FIXED",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      requirements: product.requirements || "",
      status: product.status,
      budget: product.budget > 0 ? String(product.budget) : "",
      billingType: product.billingType || "FIXED",
      startDate: toInputDateFormat(product.startDate),
      endDate: toInputDateFormat(product.endDate),
    });
    setIsEditModalOpen(true);
  };

  const handleOpenVault = (product: Product) => {
    setVaultProduct(product);
    setVaultText(product.requirements || "");
    setCopiedVault(false);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setActionSuccess(`In-house product "${data.product.name}" created successfully.`);
        setIsAddModalOpen(false);
        fetchProducts();
      } else {
        setActionError(data.error || "Failed to create product");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !formData.name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/projects/${selectedProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          type: "PRODUCT",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionSuccess(`Product "${data.project.name}" updated successfully.`);
        setIsEditModalOpen(false);
        setSelectedProduct(null);
        fetchProducts();
      } else {
        setActionError(data.error || "Failed to update product");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveVault = async () => {
    if (!vaultProduct || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/projects/${vaultProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements: vaultText }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionSuccess(`Product vault specifications saved for "${vaultProduct.name}".`);
        setVaultProduct(null);
        fetchProducts();
      } else {
        setActionError(data.error || "Failed to save vault specifications");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirmDeleteProduct || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/projects/${confirmDeleteProduct.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        setActionSuccess(`Product "${confirmDeleteProduct.name}" removed.`);
        setConfirmDeleteProduct(null);
        fetchProducts();
      } else {
        setActionError(data.error || "Delete failed");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Add Sprint Task within Roadmap modal
  const handleAddSprintTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingRoadmapProduct || !newTaskData.title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskData.title.trim(),
          description: newTaskData.description ? newTaskData.description.trim() : null,
          priority: newTaskData.priority,
          dueDate: newTaskData.dueDate || null,
          assignedToId: newTaskData.assignedToId || null,
          projectId: viewingRoadmapProduct.id,
          status: "TODO",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionSuccess(`Sprint task "${data.task.title}" added to roadmap.`);
        setNewTaskData({
          title: "",
          description: "",
          priority: "MEDIUM",
          dueDate: "",
          assignedToId: "",
        });
        setShowAddTaskForm(false);
        fetchProducts();
      } else {
        setActionError(data.error || "Failed to create sprint task");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Task status toggle
  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatusMap: Record<string, string> = {
      TODO: "IN_PROGRESS",
      IN_PROGRESS: "REVIEW",
      REVIEW: "DONE",
      DONE: "TODO",
    };
    const nextStatus = nextStatusMap[currentStatus] || "DONE";

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        setActionSuccess(`Task transitioned to ${nextStatus.replace("_", " ")}.`);
        fetchProducts();
      } else {
        const data = await res.json();
        setActionError(data.error || "Failed to update task status");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Development
          </span>
        );
      case "PLANNING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Architecture & Planning
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
            Shipped & Live
          </span>
        );
      case "ON_HOLD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            On Hold
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">URGENT</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">LOW</span>;
    }
  };

  const getTaskStatusPill = (status: string) => {
    switch (status) {
      case "DONE":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Done</span>;
      case "REVIEW":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Review</span>;
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">In Progress</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">Backlog</span>;
    }
  };

  if (isHR) {
    return (
      <AppLayout title="In-House Products Hub" subtitle="Proprietary software and platform engineering">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto mt-12 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">Access Restricted</h3>
          <p className="text-sm text-slate-500">
            Internal product development, roadmaps, and engineering vaults are reserved for Engineering, Management, and Leadership personnel.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="In-House Products Hub"
      subtitle="Proprietary software platforms, feature roadmaps, sprint execution, and technical vaults"
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
            className="ml-auto text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Error Alert */}
      {actionError && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-auto animate-in fade-in slide-in-from-top-4 duration-200 shadow-2xl rounded-2xl bg-white border border-rose-200 p-3.5 flex items-center gap-3 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-800 pr-2">{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="ml-auto text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="space-y-6 pb-12">
        {/* Top Header Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Engineering & Product Portfolio</h2>
              <p className="text-xs text-slate-500">Connected with Project Vaults and Agile Sprint Schedulers</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={fetchProducts}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
              title="Refresh Products"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            {canManageProducts && (
              <button
                onClick={handleOpenAddModal}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-sm hover:shadow-indigo-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New In-House Product</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total In-House Products */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In-House Products</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Box className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{metrics.totalProducts}</span>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {metrics.activeProducts} Active
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {metrics.planningProducts} in planning &bull; {metrics.completedProducts} shipped
            </p>
          </div>

          {/* Development Completion Rate */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sprint Velocity</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{metrics.overallCompletionRate}%</span>
              <span className="text-xs font-medium text-slate-500">Overall Deliverables</span>
            </div>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${metrics.overallCompletionRate}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {metrics.completedTasks} of {metrics.totalTasks} sprint tasks done
            </p>
          </div>

          {/* Active Sprint Deliverables */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Sprints</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{metrics.activeSprintTasks}</span>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Tasks Pending
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">In Progress, Review or Backlog</p>
          </div>

          {/* R&D Capital Allocation */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">R&D Capital Allocated</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{formatINR(metrics.totalBudget)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Internal engineering investment</p>
          </div>
        </div>

        {/* Filter, Search & View Toggle Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search product, stack, or specs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
            {[
              { id: "ALL", label: "All Products" },
              { id: "PLANNING", label: "Planning" },
              { id: "ACTIVE", label: "Active" },
              { id: "ON_HOLD", label: "On Hold" },
              { id: "COMPLETED", label: "Shipped" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-end md:self-auto border border-slate-200">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Roadmap Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Engineering Matrix Table"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-500">Loading in-house products & sprint telemetry...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <Box className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No In-House Products Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              {search || statusFilter !== "ALL"
                ? "No products match the selected filters. Clear filters or modify your search."
                : "Begin tracking proprietary software, internal SaaS tools, or platform architecture by registering your first product."}
            </p>
            {canManageProducts && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create In-House Product</span>
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Roadmap Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product) => {
              const totalTasks = product.tasks?.length || 0;
              const doneTasks = product.tasks?.filter((t) => t.status === "DONE").length || 0;
              const inProgressTasks = product.tasks?.filter((t) => t.status === "IN_PROGRESS").length || 0;
              const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 mb-1.5">
                          <GitBranch className="w-3 h-3 text-indigo-500" />
                          Proprietary Platform
                        </div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                      </div>
                      <div className="shrink-0">{getStatusBadge(product.status)}</div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 line-clamp-2 min-h-[2rem] mb-4">
                      {product.description || "Internal engineering initiative & architecture."}
                    </p>

                    {/* Dynamic Progress Bar */}
                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                          Sprint Completion
                        </span>
                        <span className="font-bold text-indigo-600">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-2">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          {doneTasks} of {totalTasks} tasks completed
                        </span>
                        {inProgressTasks > 0 && (
                          <span className="text-amber-600 font-medium">{inProgressTasks} active sprint</span>
                        )}
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Target Launch</span>
                        <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(product.endDate)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">R&D Allocation</span>
                        <span className="font-semibold text-slate-700 mt-0.5 block">
                          {formatINR(product.budget)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="bg-slate-50/60 border-t border-slate-100 px-5 py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* View Roadmap & Sprint Tasks */}
                      <button
                        onClick={() => setViewingRoadmapProduct(product)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors"
                        title="View Roadmap & Sprints"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Roadmap ({totalTasks})</span>
                      </button>

                      {/* Technical Vault */}
                      <button
                        onClick={() => handleOpenVault(product)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 transition-colors"
                        title="Architecture & Secret Vault"
                      >
                        <Key className="w-3.5 h-3.5 text-amber-500" />
                        <span>Vault</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {canManageProducts && (
                        <button
                          onClick={() => handleOpenEditModal(product)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => setConfirmDeleteProduct(product)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Product"
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
        ) : (
          /* Engineering Matrix Table View */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Product Name & Initiative</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Target Launch</th>
                    <th className="py-3.5 px-4">Sprint Velocity & Progress</th>
                    <th className="py-3.5 px-4">R&D Budget</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {products.map((product) => {
                    const totalTasks = product.tasks?.length || 0;
                    const doneTasks = product.tasks?.filter((t) => t.status === "DONE").length || 0;
                    const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

                    return (
                      <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-bold text-slate-900 block text-sm">{product.name}</span>
                            <span className="text-[11px] text-slate-400 line-clamp-1">
                              {product.description || "Proprietary development"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(product.status)}</td>
                        <td className="py-3.5 px-4 text-slate-700">{formatDate(product.endDate)}</td>
                        <td className="py-3.5 px-4">
                          <div className="w-48">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-slate-600">
                                {doneTasks}/{totalTasks} tasks
                              </span>
                              <span className="font-bold text-indigo-600">{progressPct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-1.5 rounded-full"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{formatINR(product.budget)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingRoadmapProduct(product)}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                              title="View Roadmap & Tasks"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenVault(product)}
                              className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                              title="Product Vault"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            {canManageProducts && (
                              <button
                                onClick={() => handleOpenEditModal(product)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                title="Edit Product"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => setConfirmDeleteProduct(product)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 className="w-4 h-4" />
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
        )}
      </div>

      {/* MODAL 1: Product Roadmap & Sprint Deliverables Modal */}
      {viewingRoadmapProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{viewingRoadmapProduct.name}</h3>
                    {getStatusBadge(viewingRoadmapProduct.status)}
                  </div>
                  <p className="text-xs text-slate-500">
                    Product Roadmap, Sprint Milestones & Task Progress
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setViewingRoadmapProduct(null);
                  setShowAddTaskForm(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Product Progress Banner */}
              <div className="bg-gradient-to-br from-indigo-50/80 to-slate-50 p-4 rounded-xl border border-indigo-100/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div>
                    <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                      Agile Progress Velocity
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {viewingRoadmapProduct.description || "Proprietary engineering and software delivery"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-indigo-700">
                      {viewingRoadmapProduct.tasks?.length
                        ? Math.round(
                            ((viewingRoadmapProduct.tasks.filter((t) => t.status === "DONE").length) /
                              viewingRoadmapProduct.tasks.length) *
                              100
                          )
                        : 0}
                      %
                    </span>
                    <span className="text-[11px] text-slate-500 block">Completion</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        viewingRoadmapProduct.tasks?.length
                          ? Math.round(
                              ((viewingRoadmapProduct.tasks.filter((t) => t.status === "DONE").length) /
                                viewingRoadmapProduct.tasks.length) *
                                100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Sprint Tasks Section Header & Add Task Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span>Sprint Tasks & Deliverables ({viewingRoadmapProduct.tasks?.length || 0})</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Click status badges to cycle task state (Todo &rarr; In Progress &rarr; Review &rarr; Done)
                  </p>
                </div>

                {canManageProducts && (
                  <button
                    onClick={() => setShowAddTaskForm(!showAddTaskForm)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddTaskForm ? "Cancel" : "Add Sprint Task"}</span>
                  </button>
                )}
              </div>

              {/* Quick Add Task Form */}
              {showAddTaskForm && (
                <form
                  onSubmit={handleAddSprintTask}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-150"
                >
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    New Sprint Deliverable
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Task Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Build authentication middleware, Design landing wireframe"
                        value={newTaskData.title}
                        onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                      <select
                        value={newTaskData.priority}
                        onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={newTaskData.dueDate}
                        onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Assign Engineer / Lead</label>
                      <select
                        value={newTaskData.assignedToId}
                        onChange={(e) => setNewTaskData({ ...newTaskData, assignedToId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="">-- Unassigned --</option>
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name} ({member.department || member.role || "Team"})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddTaskForm(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !newTaskData.title.trim()}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {isSubmitting ? "Creating..." : "Save Sprint Task"}
                    </button>
                  </div>
                </form>
              )}

              {/* Tasks List */}
              <div className="space-y-2">
                {!viewingRoadmapProduct.tasks || viewingRoadmapProduct.tasks.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <CheckSquare className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-600">No sprint tasks linked yet.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Add milestones above to start tracking real-time development velocity.
                    </p>
                  </div>
                ) : (
                  viewingRoadmapProduct.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                            task.status === "DONE"
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 hover:border-indigo-500 text-transparent"
                          }`}
                          title="Click to toggle status"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold text-slate-800 truncate ${
                              task.status === "DONE" ? "line-through text-slate-400" : ""
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            {task.assignedTo ? (
                              <span className="flex items-center gap-1 text-slate-600 font-medium">
                                <User className="w-3 h-3 text-slate-400" />
                                {task.assignedTo.name}
                              </span>
                            ) : (
                              <span>Unassigned</span>
                            )}
                            {task.dueDate && (
                              <span>&bull; Due {formatDate(task.dueDate)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {getPriorityBadge(task.priority)}
                        <button
                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          title="Click to transition status"
                        >
                          {getTaskStatusPill(task.status)}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                onClick={() => {
                  setViewingRoadmapProduct(null);
                  setShowAddTaskForm(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-900 font-medium text-xs transition-colors shadow-sm"
              >
                Close Roadmap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Product Architecture & Technical Vault Modal (Light Theme!) */}
      {vaultProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Product Architecture & Technical Vault
                  </h3>
                  <p className="text-xs text-slate-500">{vaultProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => setVaultProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Store technical specs, git repository links, staging URLs, architecture decisions, and environment configuration guides for this proprietary product.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Technical Specifications & Vault Notes
                  </label>
                  {vaultText && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(vaultText);
                        setCopiedVault(true);
                        setTimeout(() => setCopiedVault(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      {copiedVault ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Content</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                {/* Clean Light-Themed Textarea - No black background */}
                <textarea
                  rows={10}
                  value={vaultText}
                  onChange={(e) => setVaultText(e.target.value)}
                  placeholder="### Architecture Overview
- Frontend: Next.js App Router, Tailwind CSS
- Backend: Next.js Server Actions, Prisma ORM, PostgreSQL
- Repo: https://github.com/exocross/product-repo
- Staging URL: https://staging.product.exocross.in
- Cloud: AWS / Vercel Enterprise"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setVaultProduct(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              {canManageProducts && (
                <button
                  type="button"
                  onClick={handleSaveVault}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSubmitting ? "Saving..." : "Save Specifications"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Create In-House Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create In-House Product</h3>
                  <p className="text-xs text-slate-500">Proprietary platform development initiative</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateProduct}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EC Hybrid Cloud, OmniCRM, Titan Engine"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Vision & Product Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe what problem this proprietary product solves and its core features..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Development Stage
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="PLANNING">Planning & Architecture</option>
                      <option value="ACTIVE">Active Development</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="COMPLETED">Completed / Shipped</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      R&D Capital Allocated (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Kickoff Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Target Release / Launch Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Initial Architecture / Vault Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Repository link, tech stack, architecture decisions..."
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSubmitting ? "Creating..." : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit In-House Product Modal */}
      {isEditModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Product</h3>
                  <p className="text-xs text-slate-500">{selectedProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedProduct(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleUpdateProduct}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Vision & Product Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Development Stage
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="PLANNING">Planning & Architecture</option>
                      <option value="ACTIVE">Active Development</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="COMPLETED">Completed / Shipped</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      R&D Capital Allocated (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Kickoff Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Target Release / Launch Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedProduct(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Delete Confirmation Modal */}
      {confirmDeleteProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete In-House Product?</h3>
            <p className="text-xs text-slate-500 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{confirmDeleteProduct.name}"</span>? Linked tasks and development records will be permanently removed.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteProduct(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-xl bg-rose-600 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
