"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/lib/formatCurrency";
import { formatDate } from "@/lib/formatDate";
import { CreatableCombobox } from "@/components/CreatableCombobox";
import {
  Building2,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  FolderGit2,
  ShoppingBag,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  LayoutList,
  LayoutGrid,
  Archive,
  RefreshCw,
  ExternalLink,
  FileText,
  Calendar,
  Layers,
  Eye,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  company: string;
  email?: string | null;
  phone?: string;
  address?: string;
  notes?: string;
  clientType: "PRODUCT" | "SERVICE" | "BOTH";
  leadSource?: string;
  status: "LEAD" | "ACTIVE" | "INACTIVE";
  projects: Array<{
    id: string;
    name: string;
    status: string;
    budget: number;
    type: string;
    billingType?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  orders: Array<{
    id: string;
    amount: number;
    status: string;
    orderDate: string;
    product: { name: string; price: number };
  }>;
}

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // View mode toggle: List style is default (Requirement 5)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [projectsModalClient, setProjectsModalClient] = useState<Client | null>(null);
  const [confirmDeleteClient, setConfirmDeleteClient] = useState<Client | null>(null);
  const [confirmSoftDeleteClient, setConfirmSoftDeleteClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    clientType: "SERVICE",
    leadSource: "Direct Outreach",
    status: "ACTIVE",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    clientType: "SERVICE",
    leadSource: "",
    status: "ACTIVE",
  });

  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER";
  const isHR = user?.role === "HR";
  const canManageClients = isAdmin || isManager;

  const defaultLeadSources = [
    "Referral",
    "Website",
    "LinkedIn",
    "Direct Outreach",
    "Cold Call",
    "Instagram",
    "Google Search",
    "Partner",
    "Event / Conference",
    "Word of Mouth",
  ];
  const existingLeadSources = Array.from(
    new Set(
      clients
        .map((c) => c.leadSource?.trim())
        .filter((s): s is string => Boolean(s && s.length > 0))
    )
  );
  const availableLeadSources = Array.from(
    new Set([...defaultLeadSources, ...existingLeadSources])
  );

  const fetchClients = async () => {
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

      const res = await fetch(`/api/clients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error("Fetch clients error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, typeFilter, statusFilter, user?.role]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccess(`Client ${formData.company} created successfully.`);
        setIsAddModalOpen(false);
        setFormData({
          name: "",
          company: "",
          email: "",
          phone: "",
          address: "",
          notes: "",
          clientType: "SERVICE",
          leadSource: "Direct Outreach",
          status: "ACTIVE",
        });
        fetchClients();
      } else {
        setActionError(data.error || "Failed to create client");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (client: Client) => {
    setSelectedClient(client);
    setEditFormData({
      name: client.name,
      company: client.company,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      notes: client.notes || "",
      clientType: client.clientType,
      leadSource: client.leadSource || "",
      status: client.status,
    });
    setActionError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccess(`Client ${selectedClient.company} updated successfully.`);
        setIsEditModalOpen(false);
        fetchClients();
      } else {
        setActionError(data.error || "Failed to update client");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSoftDeleteClient = async () => {
    if (!confirmSoftDeleteClient || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/clients/${confirmSoftDeleteClient.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(data.message || `Client ${confirmSoftDeleteClient.company} soft-deleted. Records preserved.`);
        setConfirmSoftDeleteClient(null);
        fetchClients();
      } else {
        setActionError(data.error || "Soft delete failed");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermanentDeleteClient = async () => {
    if (!confirmDeleteClient || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/clients/${confirmDeleteClient.id}?permanent=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(data.message || `Client ${confirmDeleteClient.company} permanently deleted.`);
        setConfirmDeleteClient(null);
        fetchClients();
      } else {
        setActionError(data.error || "Permanent deletion failed");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Client Engagements & CRM"
      subtitle="B2B client directory, connected project pipelines, and account records"
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
          {/* Search */}
          <div className="relative w-full sm:flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client, company, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Business Line Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">All Business Lines</option>
            <option value="SERVICE">IT Services</option>
            <option value="PRODUCT">Product Sales</option>
            <option value="BOTH">Hybrid (Both)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Clients</option>
            <option value="LEAD">Leads</option>
            <option value="INACTIVE">Inactive / Archived</option>
          </select>
        </div>

        {/* Action Controls & View Switcher (Requirement 5) */}
        <div className="flex items-center gap-2 justify-end">
          {/* List vs Grid Toggle */}
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

          {/* Add Client Button */}
          {canManageClients && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 gradient-brand text-white font-medium text-xs rounded-lg hover:opacity-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Client</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Rendering: List vs Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading client CRM records...
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
          No clients found matching your criteria.
        </div>
      ) : viewMode === "list" ? (
        /* =========================================================================
           TABULAR LIST VIEW (DEFAULT - Requirement 5)
           ========================================================================= */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[800px]">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Client & Company</th>
                  <th className="py-3 px-4">Business Line</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Address / Headquarters</th>
                  <th className="py-3 px-4 text-center">Connected Projects</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => {
                  const clientTypeBadge =
                    client.clientType === "SERVICE"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : client.clientType === "PRODUCT"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-purple-50 text-purple-700 border-purple-200";

                  const statusBadge =
                    client.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : client.status === "LEAD"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-100 text-slate-600 border-slate-200";

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Client & Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-800 to-indigo-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {client.company.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{client.company}</p>
                            <p className="text-[11px] text-slate-500">{client.name}</p>
                          </div>
                        </div>
                      </td>

                      {/* Business Line */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${clientTypeBadge}`}>
                          {client.clientType === "SERVICE"
                            ? "IT Services"
                            : client.clientType === "PRODUCT"
                            ? "Product Sales"
                            : "Hybrid"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge}`}>
                          {client.status}
                        </span>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="text-slate-600 flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px]">{client.email || <span className="text-slate-400 italic">No email</span>}</span>
                          </p>
                          {client.phone && (
                            <p className="text-slate-500 flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{client.phone}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Address / Headquarters */}
                      <td className="py-3.5 px-4 max-w-[180px]">
                        {client.address ? (
                          <div className="flex items-start gap-1.5 text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 text-[11px]">{client.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No address</span>
                        )}
                      </td>

                      {/* Connected Projects (Requirement 6 - Clickable Modal Trigger) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setProjectsModalClient(client)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-all cursor-pointer shadow-xs hover:border-indigo-400"
                          title="Click to view connected projects"
                        >
                          <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{client.projects.length} {client.projects.length === 1 ? "Project" : "Projects"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Complete Profile (Requirement 1) */}
                          <button
                            onClick={() => setViewingClient(client)}
                            className="p-1.5 rounded-md hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="View Complete Client Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canManageClients && (
                            <button
                              onClick={() => handleOpenEdit(client)}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                              title="Edit Client"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Soft-delete (Archive) */}
                          {isAdmin && client.status !== "INACTIVE" && (
                            <button
                              onClick={() => setConfirmSoftDeleteClient(client)}
                              className="p-1.5 rounded-md hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                              title="Soft-Delete (Archive in DB)"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Permanent Cascading Delete */}
                          {isAdmin && (
                            <button
                              onClick={() => setConfirmDeleteClient(client)}
                              className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Permanent Delete"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => {
            const clientTypeBadge =
              client.clientType === "SERVICE"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : client.clientType === "PRODUCT"
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-purple-50 text-purple-700 border-purple-200";

            const statusBadge =
              client.status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : client.status === "LEAD"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-slate-100 text-slate-600 border-slate-200";

            return (
              <div
                key={client.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${clientTypeBadge}`}>
                      {client.clientType === "SERVICE"
                        ? "IT Services"
                        : client.clientType === "PRODUCT"
                        ? "Product Sales"
                        : "Hybrid Service & Product"}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge}`}>
                      {client.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug">{client.company}</h3>
                  <p className="text-xs font-medium text-slate-600 mt-0.5">{client.name}</p>

                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{client.email || <span className="text-slate-400 italic">No email</span>}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 text-[11px]">{client.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Connected Projects & Orders Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setProjectsModalClient(client)}
                      className="p-2 rounded-lg bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200 text-left transition-all cursor-pointer"
                      title="Click to view connected projects"
                    >
                      <div className="flex items-center justify-between text-indigo-700 text-[11px] font-semibold">
                        <span className="flex items-center gap-1">
                          <FolderGit2 className="w-3.5 h-3.5" />
                          <span>Projects</span>
                        </span>
                        <ExternalLink className="w-3 h-3 text-indigo-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-1">{client.projects.length}</p>
                    </button>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Orders</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-1">{client.orders.length}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
                    Source: {client.leadSource || "Direct"}
                  </span>
                  <div className="flex items-center gap-1">
                    {/* View Complete Profile (Requirement 1) */}
                    <button
                      onClick={() => setViewingClient(client)}
                      className="p-1.5 rounded-md hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                      title="View Complete Client Profile"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {canManageClients && (
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Edit Client"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isAdmin && client.status !== "INACTIVE" && (
                      <button
                        onClick={() => setConfirmSoftDeleteClient(client)}
                        className="p-1.5 rounded-md hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                        title="Soft-Delete (Archive in DB)"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => setConfirmDeleteClient(client)}
                        className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Permanent Delete"
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

      {/* Modal: Connected Projects Details (Requirement 6) */}
      {projectsModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[85dvh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-600/30 border border-indigo-400/30 text-indigo-300">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">{projectsModalClient.company}</h3>
                  <p className="text-xs text-indigo-300">Connected Project Engagements ({projectsModalClient.projects.length})</p>
                </div>
              </div>
              <button
                onClick={() => setProjectsModalClient(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {projectsModalClient.projects.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FolderGit2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-600">No projects linked to this client yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Projects created in the Projects tab can be attached to this client account.</p>
                </div>
              ) : (
                projectsModalClient.projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{proj.name}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {proj.status}
                      </span>
                    </div>

                    {proj.description && (
                      <p className="text-slate-600 text-[11px] line-clamp-2">{proj.description}</p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Budget</span>
                        <span className="font-bold text-indigo-700">{formatINR(proj.budget)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Billing Type</span>
                        <span className="font-medium text-slate-800">{proj.billingType || "Fixed"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Timeline</span>
                        <span className="font-medium text-slate-800">
                          {proj.startDate ? formatDate(proj.startDate) : "—"} to {proj.endDate ? formatDate(proj.endDate) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setProjectsModalClient(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Client Complete Profile (Requirement 1) */}
      {viewingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold text-base shrink-0 border border-indigo-200/50">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{viewingClient.company}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        viewingClient.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : viewingClient.status === "INACTIVE"
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {viewingClient.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Contact Person: {viewingClient.name}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingClient(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Key Contact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Direct Contact</span>
                  <div className="flex items-center gap-2 text-slate-800 font-medium">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    {viewingClient.email ? (
                      <a href={`mailto:${viewingClient.email}`} className="hover:underline hover:text-indigo-600 truncate">
                        {viewingClient.email}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">No email registered</span>
                    )}
                  </div>
                  {viewingClient.phone && (
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <Phone className="w-3.5 h-3.5 text-indigo-500" />
                      <a href={`tel:${viewingClient.phone}`} className="hover:underline hover:text-indigo-600">
                        {viewingClient.phone}
                      </a>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Classification & Source</span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Client Type:</span>
                    <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                      {viewingClient.clientType}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Lead Source:</span>
                    <span className="font-medium text-slate-700">{viewingClient.leadSource || "Direct"}</span>
                  </div>
                </div>
              </div>

              {/* Headquarters / Address Card (fully visible, dynamic wrap) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>Headquarters & Complete Address</span>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed pl-5 font-normal">
                  {viewingClient.address || "No address specified on record."}
                </p>
              </div>

              {/* Administrative Notes Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Client Notes & Records</span>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed pl-5 font-normal">
                  {viewingClient.notes || "No notes entered for this client."}
                </p>
              </div>

              {/* Connected Projects Matrix */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4 text-indigo-600" />
                    <span>Connected Projects ({viewingClient.projects.length})</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Total Pipeline: {formatINR(viewingClient.projects.reduce((acc, p) => acc + (p.budget || 0), 0))}
                  </span>
                </div>

                {viewingClient.projects.length === 0 ? (
                  <p className="text-center py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-400">
                    No active projects associated with this client.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {viewingClient.projects.map((proj) => (
                      <div key={proj.id} className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">{proj.name}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              proj.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {proj.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] pt-1.5 border-t border-slate-100 text-slate-600">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Budget</span>
                            <span className="font-bold text-indigo-700">{formatINR(proj.budget)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Billing Type</span>
                            <span className="font-medium text-slate-800">{proj.billingType || "Fixed"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Timeline</span>
                            <span className="font-medium text-slate-800">
                              {proj.startDate ? formatDate(proj.startDate) : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setViewingClient(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-xs cursor-pointer shadow-xs"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Soft Delete Confirmation (Requirement 10) */}
      {confirmSoftDeleteClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 rounded-full bg-amber-50 border border-amber-200 shrink-0">
                <Archive className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Archive Client (Soft-Delete)?</h3>
                <p className="text-xs text-slate-500">{confirmSoftDeleteClient.company}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Archiving sets this client to Inactive. All historical database records, contracts, orders, and projects are <strong>safely preserved</strong> in your database and can be reviewed anytime.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmSoftDeleteClient(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSoftDeleteClient}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive Client</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Permanent Cascading Delete Confirmation (Requirement 10) */}
      {confirmDeleteClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-200 shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Permanently Delete Client?</h3>
                <p className="text-xs text-slate-500">{confirmDeleteClient.company}</p>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1.5">
              <p className="font-semibold">Irreversible cascading delete:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-700">
                <li>Permanently deletes this client&apos;s direct invoices and orders.</li>
                <li><strong>Shared projects are preserved</strong>: projects and team tasks will remain intact with client link safely unassigned.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmDeleteClient(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePermanentDeleteClient}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging Client...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Client (Requirements 3 & 4 - Notes field & dynamic auto-resizing address) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Add New Client Organization
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Entity Name</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Acme Robotics Ltd"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Primary Contact Person</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@acme.com"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Requirement 4: Address / Headquarters Dynamic Auto-Resizing Textarea */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Headquarters</label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => {
                    setFormData({ ...formData, address: e.target.value });
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  placeholder="Street Address, Suite / Floor, City, State, Country, Postal Code..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 min-h-[72px] resize-none"
                />
              </div>

              {/* Requirement 3: Client Notes Field */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Notes</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Key account background, billing cycles, specific preferences, or delivery instructions..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 min-h-[64px] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Business Line</label>
                  <select
                    value={formData.clientType}
                    onChange={(e) => setFormData({ ...formData, clientType: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="SERVICE">IT Services</option>
                    <option value="PRODUCT">Product Sales</option>
                    <option value="BOTH">Both (Hybrid)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Source</label>
                  <CreatableCombobox
                    value={formData.leadSource}
                    onChange={(val) => setFormData({ ...formData, leadSource: val })}
                    options={availableLeadSources}
                    placeholder="Select or type lead source..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="LEAD">LEAD</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
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
                      <span>Saving Client...</span>
                    </>
                  ) : (
                    <span>Save Client</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Client (Requirements 3 & 4 included) */}
      {isEditModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                Edit Client: {selectedClient.company}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Entity Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.company}
                    onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Primary Contact Person</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Requirement 4: Address Auto-Resizing Textarea */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Headquarters</label>
                <textarea
                  rows={3}
                  value={editFormData.address}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, address: e.target.value });
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  placeholder="Street Address, Suite / Floor, City, State, Country..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 min-h-[72px] resize-none"
                />
              </div>

              {/* Requirement 3: Client Notes Field */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Notes</label>
                <textarea
                  rows={3}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Account background, communication notes, or project preferences..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 min-h-[64px] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Business Line</label>
                  <select
                    value={editFormData.clientType}
                    onChange={(e) => setEditFormData({ ...editFormData, clientType: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="SERVICE">IT Services</option>
                    <option value="PRODUCT">Product Sales</option>
                    <option value="BOTH">Both (Hybrid)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Source</label>
                  <CreatableCombobox
                    value={editFormData.leadSource}
                    onChange={(val) => setEditFormData({ ...editFormData, leadSource: val })}
                    options={availableLeadSources}
                    placeholder="Select or type lead source..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="LEAD">LEAD</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsEditModalOpen(false)}
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
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
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
