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
  Edit,
  X,
  Trash2,
  Calendar,
  IndianRupee,
  ShieldAlert,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  User,
  MapPin
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/lib/formatCurrency";
import {
  downloadInvoicePDF,
  InvoicePDFData,
  InvoicePDFTemplate,
  InvoiceItem,
  InvoiceCustomData,
} from "@/lib/pdfGenerator";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

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
  email: string;
  phone: string | null;
  address: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface InvoiceFromDetails {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
}

interface InvoiceToDetails {
  company: string;
  contactPerson: string;
  address: string;
  email: string;
  phone: string;
}

interface InvoiceFormState {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  clientId: string;
  projectId: string;
  projectHeadline: string;
  fromDetails: InvoiceFromDetails;
  toDetails: InvoiceToDetails;
  items: InvoiceItem[];
  applyGST: boolean;
  taxRate: number;
  termsText: string;
}

const DEFAULT_TERMS_TEXT = `1. Valid for 30 days from the date of issue.
2. Payment: 50% advance, balance on delivery; invoices payable within 15 days.
3. Prices exclude third-party licences and hosting unless stated.
4. Changes in scope will be quoted separately.`;

function parseStoredInvoiceItems(itemsJson: string | null): {
  lineItems: InvoiceItem[];
  customData: InvoiceCustomData;
} {
  if (!itemsJson) {
    return {
      lineItems: [{ description: "Enterprise Technical Architecture & Delivery", quantity: 1, unitPrice: 0, amount: 0 }],
      customData: {},
    };
  }

  try {
    const parsed = JSON.parse(itemsJson);
    if (Array.isArray(parsed)) {
      return {
        lineItems: parsed.length > 0 ? parsed : [{ description: "Enterprise Technical Architecture & Delivery", quantity: 1, unitPrice: 0, amount: 0 }],
        customData: {},
      };
    }

    if (parsed && typeof parsed === "object") {
      const lineItems = Array.isArray(parsed.lineItems) ? parsed.lineItems : [];
      return {
        lineItems: lineItems.length > 0 ? lineItems : [{ description: "Enterprise Technical Architecture & Delivery", quantity: 1, unitPrice: 0, amount: 0 }],
        customData: {
          fromDetails: parsed.fromDetails,
          toDetails: parsed.toDetails,
          projectHeadline: parsed.projectHeadline,
          terms: parsed.terms,
          notes: parsed.notes,
          taxRate: parsed.taxRate,
          subtitle: parsed.subtitle,
        },
      };
    }
  } catch {}

  return {
    lineItems: [{ description: "Enterprise Technical Architecture & Delivery", quantity: 1, unitPrice: 0, amount: 0 }],
    customData: {},
  };
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const isHR = user?.role === "HR";
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
  const [templateModalInvoice, setTemplateModalInvoice] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit Invoice State
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editFormData, setEditFormData] = useState<InvoiceFormState | null>(null);
  const [editStatus, setEditStatus] = useState<"DRAFT" | "SENT" | "PAID" | "OVERDUE">("SENT");
  const [savingEdit, setSavingEdit] = useState(false);

  // Collapsible sections state in Create Modal
  const [showFromSection, setShowFromSection] = useState(false);
  const [showToSection, setShowToSection] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState<InvoiceFormState>({
    invoiceNumber: "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    clientId: "",
    projectId: "",
    projectHeadline: "Billing Software – Full Stack Web Application",
    fromDetails: {
      companyName: "Exocross",
      address: "Chennai, Tamil Nadu",
      phone: "7604830742, 8124473373",
      email: "exocross.tech@gmail.com",
      website: "exocross.com",
      gstin: "",
    },
    toDetails: {
      company: "",
      contactPerson: "",
      address: "",
      email: "",
      phone: "",
    },
    items: [
      { description: "UI/UX Design & Architecture", quantity: 1, unitPrice: 2000, amount: 2000 },
      { description: "Dashboard & Analytics Section", quantity: 1, unitPrice: 3000, amount: 3000 },
      { description: "Backend & Database Integration", quantity: 1, unitPrice: 7000, amount: 7000 },
    ],
    applyGST: false,
    taxRate: 18,
    termsText: DEFAULT_TERMS_TEXT,
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

  // Fetch Clients, Projects & Org Settings
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
        const clientList: ClientOption[] = cData.clients || [];
        setClients(clientList);

        if (clientList.length > 0 && !createForm.clientId) {
          const first = clientList[0];
          setCreateForm((prev) => ({
            ...prev,
            clientId: first.id,
            toDetails: {
              company: first.company || first.name,
              contactPerson: first.name,
              address: first.address || "Chennai, Tamil Nadu",
              email: first.email || "",
              phone: first.phone || "",
            },
          }));
        }
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        setProjects(pData.projects || []);
      }
      if (orgRes.ok) {
        const oData = await orgRes.json();
        const orgInfo = oData.organization;
        setOrg(orgInfo);
        if (orgInfo) {
          setCreateForm((prev) => ({
            ...prev,
            fromDetails: {
              companyName: orgInfo.companyName || "Exocross",
              address: orgInfo.addressLine1
                ? `${orgInfo.addressLine1}, ${orgInfo.city || "Chennai"}, ${orgInfo.state || "Tamil Nadu"}`
                : "Chennai, Tamil Nadu",
              phone: orgInfo.phone || "7604830742, 8124473373",
              email: orgInfo.officialEmail || "exocross.tech@gmail.com",
              website: orgInfo.website || "exocross.com",
              gstin: orgInfo.gstin || "",
            },
          }));
        }
      }
    } catch {
      // Non-critical options fetch
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchOptions();
  }, [user]);

  // Real-time synchronization
  useRealtimeSync((event) => {
    if (event.type === "INVOICE_PAID" || event.type === "INVOICE_CREATED" || event.type === "DATA_MUTATED") {
      fetchInvoices();
    }
  });

  // Client dropdown selection helper for Create Modal
  const handleClientSelect = (clientId: string) => {
    const selected = clients.find((c) => c.id === clientId);
    if (selected) {
      setCreateForm((prev) => ({
        ...prev,
        clientId,
        toDetails: {
          company: selected.company || selected.name,
          contactPerson: selected.name,
          address: selected.address || "Chennai, Tamil Nadu",
          email: selected.email || "",
          phone: selected.phone || "",
        },
      }));
    } else {
      setCreateForm((prev) => ({ ...prev, clientId }));
    }
  };

  // Line Items Helper for Create Modal
  const handleCreateItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...createForm.items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      const q = field === "quantity" ? parseFloat(value) || 0 : updated[index].quantity;
      const p = field === "unitPrice" ? parseFloat(value) || 0 : updated[index].unitPrice;
      updated[index].amount = q * p;
    }
    setCreateForm({ ...createForm, items: updated });
  };

  const handleAddCreateItem = () => {
    setCreateForm({
      ...createForm,
      items: [...createForm.items, { description: "", quantity: 1, unitPrice: 0, amount: 0 }],
    });
  };

  const handleRemoveCreateItem = (index: number) => {
    if (createForm.items.length <= 1) return;
    setCreateForm({
      ...createForm,
      items: createForm.items.filter((_, idx) => idx !== index),
    });
  };

  // Create Calculations
  const createSubtotal = createForm.items.reduce((sum, itm) => sum + (itm.amount || 0), 0);
  const createTax = createForm.applyGST ? Math.round(createSubtotal * ((createForm.taxRate || 18) / 100)) : 0;
  const createGrandTotal = createSubtotal + createTax;

  // Create Invoice Submission
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.clientId) {
      setErrorMsg("Please select a client");
      return;
    }
    setCreating(true);
    setErrorMsg(null);

    try {
      const termsArray = createForm.termsText
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);

      const extendedPayload = {
        lineItems: createForm.items,
        fromDetails: createForm.fromDetails,
        toDetails: createForm.toDetails,
        projectHeadline: createForm.projectHeadline,
        terms: termsArray,
        taxRate: createForm.applyGST ? createForm.taxRate : 0,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: createForm.invoiceNumber.trim() || undefined,
          issueDate: createForm.issueDate,
          dueDate: createForm.dueDate,
          clientId: createForm.clientId,
          projectId: createForm.projectId || null,
          description: createForm.projectHeadline || createForm.items[0]?.description || "Professional Services",
          items: extendedPayload,
          amount: createSubtotal,
          tax: createTax,
          totalAmount: createGrandTotal,
        }),
      });

      if (res.ok) {
        setSuccessMsg("Invoice created successfully!");
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

  // Open Edit Modal
  const handleOpenEdit = (inv: Invoice) => {
    const { lineItems, customData } = parseStoredInvoiceItems(inv.items);
    setEditingInvoice(inv);
    setEditStatus(inv.status);

    const fromDetails: InvoiceFromDetails = {
      companyName: customData.fromDetails?.companyName || org?.companyName || "Exocross",
      address: customData.fromDetails?.address || (org?.addressLine1
        ? `${org.addressLine1}, ${org.city || "Chennai"}, ${org.state || "Tamil Nadu"}`
        : "Chennai, Tamil Nadu"),
      phone: customData.fromDetails?.phone || org?.phone || "7604830742, 8124473373",
      email: customData.fromDetails?.email || org?.officialEmail || "exocross.tech@gmail.com",
      website: customData.fromDetails?.website || org?.website || "exocross.com",
      gstin: customData.fromDetails?.gstin || org?.gstin || "",
    };

    const toDetails: InvoiceToDetails = {
      company: customData.toDetails?.company || inv.client.company || inv.client.name,
      contactPerson: customData.toDetails?.contactPerson || inv.client.name,
      address: customData.toDetails?.address || inv.client.address || "Chennai, Tamil Nadu",
      email: customData.toDetails?.email || inv.client.email || "",
      phone: customData.toDetails?.phone || inv.client.phone || "",
    };

    const termsText =
      customData.terms && customData.terms.length > 0
        ? customData.terms.join("\n")
        : DEFAULT_TERMS_TEXT;

    setEditFormData({
      invoiceNumber: inv.invoiceNumber,
      issueDate: new Date(inv.issueDate).toISOString().slice(0, 10),
      dueDate: new Date(inv.dueDate).toISOString().slice(0, 10),
      clientId: inv.clientId,
      projectId: inv.projectId || "",
      projectHeadline: customData.projectHeadline || inv.project?.name || inv.description || "Software Engineering & Architecture Deliverables",
      fromDetails,
      toDetails,
      items: lineItems.length > 0 ? lineItems : [{ description: inv.description || "Services", quantity: 1, unitPrice: inv.amount, amount: inv.amount }],
      applyGST: inv.tax > 0,
      taxRate: customData.taxRate !== undefined ? customData.taxRate : (inv.tax > 0 ? 18 : 0),
      termsText,
    });
  };

  // Line Items Helper for Edit Modal
  const handleEditItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    if (!editFormData) return;
    const updated = [...editFormData.items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      const q = field === "quantity" ? parseFloat(value) || 0 : updated[index].quantity;
      const p = field === "unitPrice" ? parseFloat(value) || 0 : updated[index].unitPrice;
      updated[index].amount = q * p;
    }
    setEditFormData({ ...editFormData, items: updated });
  };

  const handleAddEditItem = () => {
    if (!editFormData) return;
    setEditFormData({
      ...editFormData,
      items: [...editFormData.items, { description: "", quantity: 1, unitPrice: 0, amount: 0 }],
    });
  };

  const handleRemoveEditItem = (index: number) => {
    if (!editFormData || editFormData.items.length <= 1) return;
    setEditFormData({
      ...editFormData,
      items: editFormData.items.filter((_, idx) => idx !== index),
    });
  };

  // Edit Calculations
  const editSubtotal = editFormData ? editFormData.items.reduce((sum, itm) => sum + (itm.amount || 0), 0) : 0;
  const editTax = editFormData && editFormData.applyGST ? Math.round(editSubtotal * ((editFormData.taxRate || 18) / 100)) : 0;
  const editGrandTotal = editSubtotal + editTax;

  // Save Edit Submission
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice || !editFormData) return;
    setSavingEdit(true);
    setErrorMsg(null);

    try {
      const termsArray = editFormData.termsText
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);

      const extendedPayload = {
        lineItems: editFormData.items,
        fromDetails: editFormData.fromDetails,
        toDetails: editFormData.toDetails,
        projectHeadline: editFormData.projectHeadline,
        terms: termsArray,
        taxRate: editFormData.applyGST ? editFormData.taxRate : 0,
      };

      const res = await fetch(`/api/invoices/${editingInvoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: editFormData.invoiceNumber.trim(),
          issueDate: editFormData.issueDate,
          dueDate: editFormData.dueDate,
          clientId: editFormData.clientId,
          projectId: editFormData.projectId || null,
          description: editFormData.projectHeadline || editFormData.items[0]?.description || "Professional Services",
          status: editStatus,
          amount: editSubtotal,
          tax: editTax,
          totalAmount: editGrandTotal,
          items: extendedPayload,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Invoice ${editFormData.invoiceNumber} updated successfully!`);
        setEditingInvoice(null);
        setEditFormData(null);
        fetchInvoices();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to update invoice");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error");
    } finally {
      setSavingEdit(false);
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
    const { lineItems, customData } = parseStoredInvoiceItems(inv.items);

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
      items: lineItems,
      customData: {
        ...customData,
        projectHeadline: customData.projectHeadline || inv.project?.name || inv.description || undefined,
      },
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
            Per company security specification, <strong>HR personnel have no access to client CRM or sales invoicing data</strong>.
            This module is restricted to Admin, Managers, and assigned sales engineers.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Invoices & Quotations"
      subtitle="Quotations, client billing statements, and payment tracking in Indian Rupees (₹)"
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
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:flex-1 min-w-0 sm:min-w-[220px] bg-slate-50 sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-slate-200">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search invoice number, client, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs overflow-x-auto">
            {["ALL", "PAID", "SENT", "OVERDUE"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 sm:px-3 py-1 rounded-md font-semibold text-[11px] transition-all shrink-0 cursor-pointer ${
                  statusFilter === st ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {isAdminOrManager && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Invoice</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 min-w-[760px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Client / Company</th>
                <th className="py-3 px-4">Project Scope</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Tax (GST)</th>
                <th className="py-3 px-4 text-right">Total (INR)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading invoices...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No invoices match the current query.
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
                        <span className="text-slate-600 truncate max-w-[180px] inline-block">{inv.description || "Direct Deliverables"}</span>
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
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            title="Mark as Paid"
                          >
                            Mark Paid
                          </button>
                        )}

                        {isAdminOrManager && (
                          <button
                            onClick={() => handleOpenEdit(inv)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Invoice"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="View Invoice Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="Download PDF Quotation / Invoice"
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

      {/* =========================================================================
          CREATE INVOICE MODAL (Removed 'Tax' from title, all fields manually typed)
         ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">Create New Invoice</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Generate professional quotation or invoice denominated in Indian Rupees (₹)
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateInvoice} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Row 1: Invoice Number & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Invoice / Quote No.</label>
                  <input
                    type="text"
                    placeholder="e.g. EXO-2026-001 (or auto)"
                    value={createForm.invoiceNumber}
                    onChange={(e) => setCreateForm({ ...createForm, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Issue Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.issueDate}
                    onChange={(e) => setCreateForm({ ...createForm, issueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Valid Until / Due Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Row 2: Client & Project Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Select Client *</label>
                  <select
                    required
                    value={createForm.clientId}
                    onChange={(e) => handleClientSelect(e.target.value)}
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
                    value={createForm.projectId}
                    onChange={(e) => setCreateForm({ ...createForm, projectId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                  >
                    <option value="">-- None (Direct Engagement / Product) --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Project Headline */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Project / Service Headline *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Billing Software – Full Stack Web Application"
                  value={createForm.projectHeadline}
                  onChange={(e) => setCreateForm({ ...createForm, projectHeadline: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                />
              </div>

              {/* Collapsible: Manual Company FROM Details */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60">
                <button
                  type="button"
                  onClick={() => setShowFromSection(!showFromSection)}
                  className="w-full p-3 flex items-center justify-between text-left font-bold text-slate-800 hover:bg-slate-100/60 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-600" />
                    <span>Company (FROM) Details on Quotation</span>
                  </span>
                  {showFromSection ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {showFromSection && (
                  <div className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-slate-200 bg-white">
                    <div>
                      <label className="block text-slate-600 text-[11px] font-semibold mb-0.5">Company Name</label>
                      <input
                        type="text"
                        value={createForm.fromDetails.companyName}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            fromDetails: { ...createForm.fromDetails, companyName: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[11px] font-semibold mb-0.5">Address</label>
                      <input
                        type="text"
                        value={createForm.fromDetails.address}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            fromDetails: { ...createForm.fromDetails, address: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[11px] font-semibold mb-0.5">Phone(s)</label>
                      <input
                        type="text"
                        value={createForm.fromDetails.phone}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            fromDetails: { ...createForm.fromDetails, phone: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[11px] font-semibold mb-0.5">Email</label>
                      <input
                        type="email"
                        value={createForm.fromDetails.email}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            fromDetails: { ...createForm.fromDetails, email: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[11px] font-semibold mb-0.5">Website</label>
                      <input
                        type="text"
                        value={createForm.fromDetails.website}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            fromDetails: { ...createForm.fromDetails, website: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[11px] font-semibold mb-0.5">GSTIN / Tax ID</label>
                      <input
                        type="text"
                        value={createForm.fromDetails.gstin}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            fromDetails: { ...createForm.fromDetails, gstin: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs uppercase"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible: Manual Client TO Details */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60">
                <button
                  type="button"
                  onClick={() => setShowToSection(!showToSection)}
                  className="w-full p-3 flex items-center justify-between text-left font-bold text-slate-800 hover:bg-slate-100/60 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Client (TO / PREPARED FOR) Details</span>
                  </span>
                  {showToSection ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {showToSection && (
                  <div className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-slate-200 bg-white">
                    <div>
                      <label className="block text-slate-600 text-[11px] font-semibold mb-0.5">Client Company Name</label>
                      <input
                        type="text"
                        value={createForm.toDetails.company}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            toDetails: { ...createForm.toDetails, company: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[11px] font-semibold mb-0.5">Attn: Contact Person</label>
                      <input
                        type="text"
                        value={createForm.toDetails.contactPerson}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            toDetails: { ...createForm.toDetails, contactPerson: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 text-[11px] font-semibold mb-0.5">Client Address</label>
                      <input
                        type="text"
                        value={createForm.toDetails.address}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            toDetails: { ...createForm.toDetails, address: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[11px] font-semibold mb-0.5">Client Email</label>
                      <input
                        type="email"
                        value={createForm.toDetails.email}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            toDetails: { ...createForm.toDetails, email: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[11px] font-semibold mb-0.5">Client Phone</label>
                      <input
                        type="text"
                        value={createForm.toDetails.phone}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            toDetails: { ...createForm.toDetails, phone: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Line Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-900 font-bold">Line Items & Services (#, Description, Qty, Rate, Amount)</label>
                  <button
                    type="button"
                    onClick={handleAddCreateItem}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {createForm.items.map((itm, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="w-6 text-center font-bold text-slate-400 text-xs shrink-0 hidden sm:block">
                        #{idx + 1}
                      </div>
                      <input
                        type="text"
                        placeholder="Description (e.g. UI/UX Design)"
                        required
                        value={itm.description}
                        onChange={(e) => handleCreateItemChange(idx, "description", e.target.value)}
                        className="w-full sm:flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <div className="flex items-center gap-2 justify-between sm:justify-start">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={itm.quantity}
                          onChange={(e) => handleCreateItemChange(idx, "quantity", e.target.value)}
                          className="w-16 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center"
                        />
                        <input
                          type="number"
                          min="0"
                          step="100"
                          placeholder="Rate (₹)"
                          value={itm.unitPrice}
                          onChange={(e) => handleCreateItemChange(idx, "unitPrice", e.target.value)}
                          className="w-28 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-right"
                        />
                        <div className="w-24 text-right font-bold text-slate-800 text-xs truncate">
                          {formatINR(itm.amount)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCreateItem(idx)}
                          disabled={createForm.items.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GST / Tax Toggle & Calculation */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 text-xs">Apply GST ({createForm.taxRate}%)</span>
                  <p className="text-[11px] text-slate-500">
                    {createForm.applyGST
                      ? `Standard ${createForm.taxRate}% GST applied.`
                      : "Zero-rated, non-taxable, or GST exempt."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {createForm.applyGST && (
                    <input
                      type="number"
                      min="0"
                      max="28"
                      value={createForm.taxRate}
                      onChange={(e) => setCreateForm({ ...createForm, taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold"
                    />
                  )}
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={createForm.applyGST}
                      onChange={(e) => setCreateForm({ ...createForm, applyGST: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900">{formatINR(createSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({createForm.applyGST ? `${createForm.taxRate}%` : "0%"}):</span>
                  <span className={`font-semibold ${createForm.applyGST ? "text-slate-900" : "text-slate-400"}`}>
                    {createForm.applyGST ? `+${formatINR(createTax)}` : "₹0"}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-indigo-200 font-bold text-sm text-indigo-950">
                  <span>Grand Total (INR):</span>
                  <span className="text-indigo-700 font-black">{formatINR(createGrandTotal)}</span>
                </div>
              </div>

              {/* Commercial Terms & Conditions */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Commercial Terms & Conditions (Editable)</label>
                <textarea
                  rows={4}
                  value={createForm.termsText}
                  onChange={(e) => setCreateForm({ ...createForm, termsText: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-mono text-[11px]"
                  placeholder="Enter terms, one per line..."
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Invoice...</span>
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

      {/* =========================================================================
          EDIT INVOICE MODAL (Full manual editing for existing invoices)
         ========================================================================= */}
      {editingInvoice && editFormData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">Edit Invoice ({editFormData.invoiceNumber})</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Update deliverables, contact details, payment terms, or quotation status
                </p>
              </div>
              <button
                onClick={() => setEditingInvoice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Row 1: Invoice Number, Dates & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Invoice / Quote No. *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.invoiceNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Issue Date *</label>
                  <input
                    type="date"
                    required
                    value={editFormData.issueDate}
                    onChange={(e) => setEditFormData({ ...editFormData, issueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Valid Until / Due Date *</label>
                  <input
                    type="date"
                    required
                    value={editFormData.dueDate}
                    onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="SENT">SENT</option>
                    <option value="PAID">PAID</option>
                    <option value="OVERDUE">OVERDUE</option>
                  </select>
                </div>
              </div>

              {/* Project Headline */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Project / Service Headline *</label>
                <input
                  type="text"
                  required
                  value={editFormData.projectHeadline}
                  onChange={(e) => setEditFormData({ ...editFormData, projectHeadline: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                />
              </div>

              {/* Two Column Address Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* FROM Details */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                  <span className="font-bold text-slate-800 text-[11px] block flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Company (FROM) Details</span>
                  </span>
                  <div>
                    <label className="block text-slate-600 text-[10px] font-semibold">Company Name</label>
                    <input
                      type="text"
                      value={editFormData.fromDetails.companyName}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          fromDetails: { ...editFormData.fromDetails, companyName: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[10px] font-semibold">Address</label>
                    <input
                      type="text"
                      value={editFormData.fromDetails.address}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          fromDetails: { ...editFormData.fromDetails, address: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[10px] font-semibold">Phone(s)</label>
                    <input
                      type="text"
                      value={editFormData.fromDetails.phone}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          fromDetails: { ...editFormData.fromDetails, phone: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[10px] font-semibold">Email & Web</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="email"
                        value={editFormData.fromDetails.email}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            fromDetails: { ...editFormData.fromDetails, email: e.target.value },
                          })
                        }
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        placeholder="Email"
                      />
                      <input
                        type="text"
                        value={editFormData.fromDetails.website}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            fromDetails: { ...editFormData.fromDetails, website: e.target.value },
                          })
                        }
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        placeholder="Website"
                      />
                    </div>
                  </div>
                </div>

                {/* TO Details */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                  <span className="font-bold text-slate-800 text-[11px] block flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Client (TO / PREPARED FOR) Details</span>
                  </span>
                  <div>
                    <label className="block text-slate-600 text-[10px] font-semibold">Client Company Name</label>
                    <input
                      type="text"
                      value={editFormData.toDetails.company}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          toDetails: { ...editFormData.toDetails, company: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[10px] font-semibold">Attn: Contact Person</label>
                    <input
                      type="text"
                      value={editFormData.toDetails.contactPerson}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          toDetails: { ...editFormData.toDetails, contactPerson: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[10px] font-semibold">Address</label>
                    <input
                      type="text"
                      value={editFormData.toDetails.address}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          toDetails: { ...editFormData.toDetails, address: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[10px] font-semibold">Email & Phone</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="email"
                        value={editFormData.toDetails.email}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            toDetails: { ...editFormData.toDetails, email: e.target.value },
                          })
                        }
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        placeholder="Email"
                      />
                      <input
                        type="text"
                        value={editFormData.toDetails.phone}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            toDetails: { ...editFormData.toDetails, phone: e.target.value },
                          })
                        }
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        placeholder="Phone"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-900 font-bold">Line Items & Services</label>
                  <button
                    type="button"
                    onClick={handleAddEditItem}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editFormData.items.map((itm, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="w-6 text-center font-bold text-slate-400 text-xs shrink-0 hidden sm:block">
                        #{idx + 1}
                      </div>
                      <input
                        type="text"
                        placeholder="Description"
                        required
                        value={itm.description}
                        onChange={(e) => handleEditItemChange(idx, "description", e.target.value)}
                        className="w-full sm:flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <div className="flex items-center gap-2 justify-between sm:justify-start">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={itm.quantity}
                          onChange={(e) => handleEditItemChange(idx, "quantity", e.target.value)}
                          className="w-16 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center"
                        />
                        <input
                          type="number"
                          min="0"
                          step="100"
                          placeholder="Rate (₹)"
                          value={itm.unitPrice}
                          onChange={(e) => handleEditItemChange(idx, "unitPrice", e.target.value)}
                          className="w-28 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-right"
                        />
                        <div className="w-24 text-right font-bold text-slate-800 text-xs truncate">
                          {formatINR(itm.amount)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEditItem(idx)}
                          disabled={editFormData.items.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax Toggle & Calculation */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 text-xs">Apply GST ({editFormData.taxRate}%)</span>
                  <p className="text-[11px] text-slate-500">
                    {editFormData.applyGST ? `GST calculated at ${editFormData.taxRate}%.` : "GST calculation disabled."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {editFormData.applyGST && (
                    <input
                      type="number"
                      min="0"
                      max="28"
                      value={editFormData.taxRate}
                      onChange={(e) => setEditFormData({ ...editFormData, taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold"
                    />
                  )}
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editFormData.applyGST}
                      onChange={(e) => setEditFormData({ ...editFormData, applyGST: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Total Card */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900">{formatINR(editSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({editFormData.applyGST ? `${editFormData.taxRate}%` : "0%"}):</span>
                  <span className={`font-semibold ${editFormData.applyGST ? "text-slate-900" : "text-slate-400"}`}>
                    {editFormData.applyGST ? `+${formatINR(editTax)}` : "₹0"}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-indigo-200 font-bold text-sm text-indigo-950">
                  <span>Grand Total (INR):</span>
                  <span className="text-indigo-700 font-black">{formatINR(editGrandTotal)}</span>
                </div>
              </div>

              {/* Commercial Terms & Conditions */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Commercial Terms & Conditions (Editable)</label>
                <textarea
                  rows={4}
                  value={editFormData.termsText}
                  onChange={(e) => setEditFormData({ ...editFormData, termsText: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-mono text-[11px]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {savingEdit ? (
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

      {/* =========================================================================
          VIEW INVOICE DETAILS MODAL
         ========================================================================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold">Quotation / Invoice</span>
                <h3 className="text-base sm:text-lg font-bold mt-0.5">{selectedInvoice.invoiceNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Client Name</span>
                  <p className="font-bold text-slate-900">{selectedInvoice.client.name}</p>
                  <p className="text-[11px] text-slate-500">{selectedInvoice.client.company}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Project Scope</span>
                  <p className="font-bold text-slate-900">{selectedInvoice.project?.name || selectedInvoice.description || "Direct Engagement"}</p>
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
                  <span>Goods & Services Tax (GST)</span>
                  <span className="font-semibold text-slate-900">+{formatINR(selectedInvoice.tax)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-black text-slate-950 text-sm">
                  <span>Total Amount</span>
                  <span className="text-indigo-700">{formatINR(selectedInvoice.totalAmount)}</span>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 sm:p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Status</span>
                  <p className="font-bold text-indigo-950 mt-0.5">{selectedInvoice.status}</p>
                </div>
                <button
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TEMPLATE CHOOSER MODAL (Template 1 Minimalist vs Template 2 Cyber Tech)
         ========================================================================= */}
      {templateModalInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Choose Quotation PDF Template</h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                    Select a layout format to download for {templateModalInvoice.invoiceNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTemplateModalInvoice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Selection Cards */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1">
              {/* Option 1: Modern Cyber Tech 2-Page Quotation */}
              <div className="relative border-2 border-indigo-500/60 hover:border-indigo-600 rounded-xl p-4 bg-gradient-to-b from-indigo-50/50 to-white flex flex-col justify-between transition-all hover:shadow-md group">
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
                    <Sparkles className="w-3 h-3" /> Cyber 2-Page
                  </span>
                </div>

                <div>
                  <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm mb-3 shadow-xs">
                    EXO
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Modern Cyber Tech</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    2-page high-tech IT quotation with server illustration banner, section badges, deliverable phase table, and Page 2 terms & dual signoff.
                  </p>

                  <div className="mt-3.5 space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>Deep navy tech illustration banner & cyan line</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>3 Accent metadata cards (Quote No, Date, Valid Until)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>Phase deliverables (# | Description | Amount)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>Page 2 Shield TERMS & Dual ACCEPTANCE boxes</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => executeDownloadPDF(templateModalInvoice, "modern_tech")}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Cyber Template</span>
                </button>
              </div>

              {/* Option 2: Minimalist Monochrome Standard (1 Page) */}
              <div className="relative border border-slate-200 hover:border-slate-400 rounded-xl p-4 bg-white flex flex-col justify-between transition-all hover:shadow-md group">
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Minimalist 1-Page
                  </span>
                </div>

                <div>
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs mb-3 shadow-xs">
                    EC
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Minimalist Monochrome</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    Clean monochrome executive quotation layout with square EC mark, 4-column itemized breakdown, 4 commercial terms, and dual signatories.
                  </p>

                  <div className="mt-3.5 space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>Square EC Exocross logo mark / dynamic logo</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>4-Column Table: Description | Qty | Rate | Amount</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>4-Point Commercial Terms & Conditions</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>Dual formal signatory lines & business appreciation</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => executeDownloadPDF(templateModalInvoice, "classic_corporate")}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Monochrome PDF</span>
                </button>
              </div>
            </div>

            {/* Modal Footer note */}
            <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:py-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
              <span className="text-[11px] sm:text-xs">Both templates dynamically load your edited FROM & TO addresses, deliverables, and custom terms.</span>
              <button
                onClick={() => setTemplateModalInvoice(null)}
                className="font-medium text-slate-600 hover:text-slate-900 cursor-pointer text-xs"
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
