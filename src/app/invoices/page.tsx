"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  CreditCard,
  Plus,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Building,
  Eye,
  X,
  Trash2,
  Calendar,
  DollarSign,
  IndianRupee,
  ShieldAlert,
  FileText,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/lib/formatCurrency";
import { downloadInvoicePDF, InvoicePDFData, InvoicePDFTemplate } from "@/lib/pdfGenerator";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  projectId: string | null;
  description: string | null;
  amount: number;
  tax: number;
  totalAmount: number;
  dueDate: string;
  issueDate: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
  items: string | null;
  paymentDate: string | null;
  client: {
    id: string;
    name: string;
    company: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    clientType: string;
  };
  project: {
    id: string;
    name: string;
    type: string;
    budget: number;
  } | null;
}

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const isHR = user?.role === "HR";
  const isAdmin = user?.role === "ADMIN";
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [templateModalInvoice, setTemplateModalInvoice] = useState<Invoice | null>(null);
  const [creating, setCreating] = useState(false);
  const [applyGST, setApplyGST] = useState(true);

  // Create Invoice Form State
  const [formData, setFormData] = useState({
    clientId: "",
    projectId: "",
    description: "",
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    items: [{ description: "Enterprise IT Consulting & Development", quantity: 1, unitPrice: 100000, amount: 100000 }],
  });

  // Fetch Invoices
  const fetchInvoices = async () => {
    if (isHR) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to load invoices");
      }
    } catch {
      setErrorMsg("Network error loading invoices");
    } finally {
      setLoading(false);
    }
  };

  // Fetch dropdown options for Client and Projects, plus Org Profile
  const fetchOptions = async () => {
    if (isHR) return;
    try {
      const [cRes, pRes, orgRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/projects"),
        fetch("/api/organization"),
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        setClients(cData.clients || []);
        if (cData.clients?.length > 0 && !formData.clientId) {
          setFormData((prev) => ({ ...prev, clientId: cData.clients[0].id }));
        }
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        setProjects(pData.projects || []);
      }
      if (orgRes.ok) {
        const oData = await orgRes.json();
        setOrg(oData.organization);
      }
    } catch {
      // Non-critical options fetch
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchOptions();
  }, [user]);

  // Real-time synchronization: auto-refreshes invoices when updates occur across any active session
  useRealtimeSync((event) => {
    if (event.type === "INVOICE_PAID" || event.type === "INVOICE_CREATED" || event.type === "DATA_MUTATED") {
      fetchInvoices();
    }
  });

  // Handle Item Changes
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      const q = field === "quantity" ? parseFloat(value) || 0 : updated[index].quantity;
      const p = field === "unitPrice" ? parseFloat(value) || 0 : updated[index].unitPrice;
      updated[index].amount = q * p;
    }
    setFormData({ ...formData, items: updated });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, unitPrice: 0, amount: 0 }],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter((_, idx) => idx !== index),
    });
  };

  // Compute Subtotal, Tax (Conditional GST) & Total
  const subtotal = formData.items.reduce((sum, itm) => sum + (itm.amount || 0), 0);
  const tax = applyGST ? Math.round(subtotal * 0.18) : 0;
  const grandTotal = subtotal + tax;

  // Create Invoice Submission
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      setErrorMsg("Please select a client");
      return;
    }
    setCreating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formData.clientId,
          projectId: formData.projectId || null,
          description: formData.description || formData.items[0]?.description || "Enterprise Services",
          items: formData.items,
          amount: subtotal,
          tax: tax,
          totalAmount: grandTotal,
          dueDate: formData.dueDate,
        }),
      });

      if (res.ok) {
        setSuccessMsg("Tax invoice created successfully!");
        setShowCreateModal(false);
        fetchInvoices();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to create invoice");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error");
    } finally {
      setCreating(false);
    }
  };

  // Mark invoice as PAID
  const handleMarkAsPaid = async (inv: Invoice) => {
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      if (res.ok) {
        setSuccessMsg(`Invoice ${inv.invoiceNumber} marked as PAID`);
        fetchInvoices();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch {
      setErrorMsg("Failed to update invoice status");
    }
  };

  // Open Template Selector Modal
  const handleDownloadPDF = (inv: Invoice) => {
    setTemplateModalInvoice(inv);
  };

  // Execute PDF Download with chosen template
  const executeDownloadPDF = (inv: Invoice, template: InvoicePDFTemplate = "modern_tech") => {
    let parsedItems: InvoiceItem[] = [];
    try {
      if (inv.items) {
        parsedItems = JSON.parse(inv.items);
      }
    } catch {
      parsedItems = [];
    }

    const pdfData: InvoicePDFData = {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      status: inv.status,
      description: inv.description,
      amount: inv.amount,
      tax: inv.tax,
      totalAmount: inv.totalAmount,
      client: {
        name: inv.client.name,
        company: inv.client.company,
        email: inv.client.email,
        phone: inv.client.phone,
        address: inv.client.address,
      },
      project: inv.project ? { name: inv.project.name } : null,
      items: parsedItems.length > 0 ? parsedItems : [
        { description: inv.description || "Enterprise Technical Architecture & Delivery", quantity: 1, unitPrice: inv.amount, amount: inv.amount }
      ],
    };

    downloadInvoicePDF(pdfData, org, template);
    setTemplateModalInvoice(null);
  };

  // Filtered invoices
  const filtered = invoices.filter((inv) => {
    if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
      const matchClient = inv.client?.name?.toLowerCase().includes(q) || inv.client?.company?.toLowerCase().includes(q);
      const matchDesc = inv.description?.toLowerCase().includes(q);
      if (!matchNum && !matchClient && !matchDesc) return false;
    }
    return true;
  });

  // Calculate totals
  const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalCollected = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.totalAmount, 0);
  const totalOutstanding = invoices.filter((i) => i.status !== "PAID").reduce((sum, i) => sum + i.totalAmount, 0);
  const overdueCount = invoices.filter((i) => i.status === "OVERDUE" || (i.status === "SENT" && new Date(i.dueDate) < new Date())).length;

  // HR Restriction Guard
  if (isHR) {
    return (
      <AppLayout title="Invoices & Billing" subtitle="Corporate invoicing and revenue tracking">
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto mt-12 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-2">Access Restricted (HR Role)</h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Per company security specification Section 2, <strong>HR personnel have no access to client CRM or sales invoicing data</strong>.
            This module is restricted to Admin, Managers, and assigned sales engineers.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Invoices & Client Billing"
      subtitle="GST-compliant tax invoices, client billing statements, and payment tracking in Indian Rupees (₹)"
    >
      {/* Messages */}
      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Invoiced</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatINR(totalBilled)}</p>
          <p className="text-[11px] text-indigo-600 mt-1 font-medium">{invoices.length} invoices generated</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Collected Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{formatINR(totalCollected)}</p>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">Settled & cleared</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Outstanding Receivables</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">{formatINR(totalOutstanding)}</p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Pending remittance</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Overdue Invoices</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">{overdueCount}</p>
          <p className="text-[11px] text-rose-600 mt-1 font-medium">Exceeded payment terms</p>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search invoice number, client, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            {["ALL", "PAID", "SENT", "OVERDUE"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md font-semibold text-[11px] transition-all ${
                  statusFilter === st ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {isAdminOrManager && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Invoice</span>
            </button>
          )}

          <button
            onClick={fetchInvoices}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Client & Company</th>
                <th className="py-3 px-4">Project / Engagement</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Taxable (₹)</th>
                <th className="py-3 px-4 text-right">GST 18%</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading invoices...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No invoices found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isAdminOrManager ? "Click 'Create Invoice' to issue your first client billing statement." : "No invoices currently assigned to your clients."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{inv.invoiceNumber}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{inv.client.company || inv.client.name}</div>
                      <div className="text-[11px] text-slate-400">{inv.client.name}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {inv.project ? (
                        <span className="font-medium text-slate-800">{inv.project.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Product / Direct License</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                      {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                      {formatINR(inv.amount)}
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-slate-500 whitespace-nowrap">
                      +{formatINR(inv.tax)}
                    </td>

                    <td className="py-3 px-4 text-right font-black text-indigo-950 whitespace-nowrap">
                      {formatINR(inv.totalAmount)}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : inv.status === "OVERDUE"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {inv.status === "PAID" ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                        {inv.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdminOrManager && inv.status !== "PAID" && (
                          <button
                            onClick={() => handleMarkAsPaid(inv)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors"
                            title="Mark as Paid"
                          >
                            Mark Paid
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Invoice Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors"
                          title="Download Tax Invoice PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">Create New Tax Invoice</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Generates GST-compliant invoice denominated in Indian Rupees (₹)
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateInvoice} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Select Client *</label>
                  <select
                    required
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company ? `${c.company} (${c.name})` : c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Associated Project (Optional)</label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                  >
                    <option value="">-- None (Direct Product / Support) --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Due Date *</label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                />
              </div>

              {/* Line Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-900 font-bold">Line Items & Services</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((itm, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Description (e.g. Cloud Infrastructure Milestone)"
                        required
                        value={itm.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={itm.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        className="w-16 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center"
                      />
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="Price (₹)"
                        value={itm.unitPrice}
                        onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                        className="w-28 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-right"
                      />
                      <div className="w-24 text-right font-bold text-slate-800 text-xs">
                        {formatINR(itm.amount)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={formData.items.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Automatic GST Toggle Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 text-xs">Apply Automatic GST (18%)</span>
                  <p className="text-[11px] text-slate-500">
                    {applyGST
                      ? "Standard 18% GST (9% CGST + 9% SGST) applied."
                      : "GST calculation disabled (Exempt, SEZ export, or zero-rated)."}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyGST}
                    onChange={(e) => setApplyGST(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Total Calculation Card */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span>Subtotal (Taxable):</span>
                  <span className="font-semibold text-slate-900">{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({applyGST ? "18% - 9% CGST + 9% SGST" : "0% Non-Taxable / Exempt"}):</span>
                  <span className={`font-semibold ${applyGST ? "text-slate-900" : "text-slate-400"}`}>
                    {applyGST ? `+${formatINR(tax)}` : "₹0"}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-indigo-200 font-bold text-sm text-indigo-950">
                  <span>Total Amount Due (INR):</span>
                  <span className="text-indigo-700 font-black">{formatINR(grandTotal)}</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Invoice...</span>
                    </>
                  ) : (
                    <span>Create & Issue Invoice</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW INVOICE MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold">Tax Invoice</span>
                <h3 className="text-lg font-bold mt-0.5">{selectedInvoice.invoiceNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Client Name</span>
                  <p className="font-bold text-slate-900">{selectedInvoice.client.name}</p>
                  <p className="text-[11px] text-slate-500">{selectedInvoice.client.company}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Project</span>
                  <p className="font-bold text-slate-900">{selectedInvoice.project?.name || "Direct Engagement"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Issue Date</span>
                  <p className="font-medium text-slate-800">{new Date(selectedInvoice.issueDate).toLocaleDateString("en-IN")}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Due Date</span>
                  <p className="font-medium text-slate-800">{new Date(selectedInvoice.dueDate).toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-200 font-bold text-slate-900">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600">
                  <span>{selectedInvoice.description || "Enterprise Technical Services"}</span>
                  <span className="font-semibold text-slate-900">{formatINR(selectedInvoice.amount)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Goods & Services Tax (GST 18%)</span>
                  <span className="font-semibold text-slate-900">+{formatINR(selectedInvoice.tax)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-black text-slate-950 text-sm">
                  <span>Total Amount</span>
                  <span className="text-indigo-700">{formatINR(selectedInvoice.totalAmount)}</span>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Status</span>
                  <p className="font-bold text-indigo-950 mt-0.5">{selectedInvoice.status}</p>
                </div>
                <button
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Tax PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE CHOOSER MODAL */}
      {templateModalInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Choose Invoice PDF Template</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Select a layout format to download for {templateModalInvoice.invoiceNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTemplateModalInvoice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Selection Cards */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Modern Exocross Tech */}
              <div className="relative border-2 border-indigo-500/60 hover:border-indigo-600 rounded-xl p-4 bg-gradient-to-b from-indigo-50/50 to-white flex flex-col justify-between transition-all hover:shadow-md group">
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
                    <Sparkles className="w-3 h-3" /> Recommended
                  </span>
                </div>

                <div>
                  <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm mb-3 shadow-xs">
                    EXO
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Modern Exocross Tech</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    Contemporary IT quotation format with colorful section badges, phase deliverables, and dual acceptance stamps.
                  </p>

                  <div className="mt-3.5 space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>Section Badges: PROJECT, TERMS, ACCEPTANCE</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>Phase deliverables numbering (# 01, # 02)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>Highlighted Total Box with INR ₹ support</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>Boxed dual authentication & signoff stamps</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => executeDownloadPDF(templateModalInvoice, "modern_tech")}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Modern Tech</span>
                </button>
              </div>

              {/* Option 2: Formal Corporate Standard */}
              <div className="relative border border-slate-200 hover:border-slate-400 rounded-xl p-4 bg-white flex flex-col justify-between transition-all hover:shadow-md group">
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Corporate Classic
                  </span>
                </div>

                <div>
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs mb-3 shadow-xs">
                    EC
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Formal Corporate Standard</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    Minimalist monochrome corporate standard with Exocross square logo, 4-column itemized breakdown, and legal clauses.
                  </p>

                  <div className="mt-3.5 space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>Exocross official square logo block</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>4-Column Grid: Description | Qty | Rate | Amount</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>4-Point Commercial Agreement Terms</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>Dual formal signatory & client acceptance lines</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => executeDownloadPDF(templateModalInvoice, "classic_corporate")}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Corporate PDF</span>
                </button>
              </div>
            </div>

            {/* Modal Footer note */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Both templates respect GST settings and format all values in Indian Rupees (INR).</span>
              <button
                onClick={() => setTemplateModalInvoice(null)}
                className="font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
