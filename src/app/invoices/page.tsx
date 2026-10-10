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
import { formatDate } from "@/lib/formatDate";
import {
  downloadInvoicePDF,
  getInvoicePDFBlob,
  InvoicePDFData,
  InvoicePDFTemplate,
  InvoiceItem,
  InvoiceCustomData,
} from "@/lib/pdfGenerator";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { DateInput } from "@/components/DateInput";

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
  status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
  items: string | null;
  paymentDate: string | null;
  payments?: string | null;
  paidAmount?: number;
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
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<InvoicePDFTemplate>("modern_tech");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // Installment / Partial Payment Modal State (Requirement 15)
  const [installmentModalInvoice, setInstallmentModalInvoice] = useState<Invoice | null>(null);
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [installmentDate, setInstallmentDate] = useState("");
  const [installmentMethod, setInstallmentMethod] = useState("UPI");
  const [installmentReference, setInstallmentReference] = useState("");
  const [installmentNote, setInstallmentNote] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  const [templateModalInvoice, setTemplateModalInvoice] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit Invoice State
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editFormData, setEditFormData] = useState<InvoiceFormState | null>(null);
  const [editStatus, setEditStatus] = useState<"DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE">("SENT");
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

  // 3-Second Floating Toast Auto-Dismiss (Requirement 3)
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

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
        body: JSON.stringify({
          status: "PAID",
          paidAmount: inv.totalAmount,
          paymentDate: new Date().toISOString(),
        }),
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

  // Helper to build standardized InvoicePDFData object
  const buildInvoicePDFDataObject = (inv: Invoice): InvoicePDFData => {
    const { lineItems, customData } = parseStoredInvoiceItems(inv.items);
    return {
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
  };

  // Open Exact PDF Live Preview Modal (Requirement 13)
  const handleOpenPreviewModal = (inv: Invoice, template: InvoicePDFTemplate = "modern_tech") => {
    setPreviewInvoice(inv);
    setPreviewTemplate(template);
    try {
      const pdfData = buildInvoicePDFDataObject(inv);
      const blob = getInvoicePDFBlob(pdfData, org, template);
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
    } catch (err) {
      console.error("Error generating live PDF preview:", err);
    }
  };

  const handleSwitchPreviewTemplate = (newTemplate: InvoicePDFTemplate) => {
    if (!previewInvoice) return;
    setPreviewTemplate(newTemplate);
    try {
      const pdfData = buildInvoicePDFDataObject(previewInvoice);
      const blob = getInvoicePDFBlob(pdfData, org, newTemplate);
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
    } catch (err) {
      console.error("Error switching preview template:", err);
    }
  };

  const handleClosePreviewModal = () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
    setPreviewInvoice(null);
  };

  // Open Installment / Partial Payment Modal (Requirement 15)
  const handleOpenInstallmentModal = (inv: Invoice) => {
    setInstallmentModalInvoice(inv);
    const existingPayments = inv.payments ? JSON.parse(inv.payments) : [];
    const currentPaid = inv.paidAmount || existingPayments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
    const remaining = Math.max(0, inv.totalAmount - currentPaid);
    setInstallmentAmount(remaining > 0 ? remaining.toString() : "");
    setInstallmentDate(new Date().toISOString().slice(0, 10));
    setInstallmentMethod("UPI");
    setInstallmentReference("");
    setInstallmentNote("");
  };

  // Submit Installment Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!installmentModalInvoice || recordingPayment) return;
    const amt = parseFloat(installmentAmount);
    if (!amt || amt <= 0) {
      setErrorMsg("Please enter a valid payment amount");
      return;
    }

    setRecordingPayment(true);
    setErrorMsg(null);

    try {
      const existingPayments = installmentModalInvoice.payments ? JSON.parse(installmentModalInvoice.payments) : [];
      const newPayment = {
        id: `pay_${Date.now()}`,
        amount: amt,
        date: installmentDate || new Date().toISOString().slice(0, 10),
        method: installmentMethod,
        reference: installmentReference.trim() || undefined,
        note: installmentNote.trim() || undefined,
      };

      const updatedPayments = [...existingPayments, newPayment];
      const newTotalPaid = updatedPayments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
      const newStatus = newTotalPaid >= installmentModalInvoice.totalAmount ? "PAID" : "PARTIALLY_PAID";

      const res = await fetch(`/api/invoices/${installmentModalInvoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payments: updatedPayments,
          paidAmount: newTotalPaid,
          status: newStatus,
          paymentDate: newStatus === "PAID" ? new Date().toISOString() : undefined,
        }),
      });

      if (res.ok) {
        // Optimistically update local invoices state so metrics & table update instantly!
        setInvoices((prev) =>
          prev.map((inv) => {
            if (inv.id === installmentModalInvoice.id) {
              return {
                ...inv,
                paidAmount: newTotalPaid,
                payments: JSON.stringify(updatedPayments),
                status: newStatus as any,
                paymentDate: newStatus === "PAID" ? new Date().toISOString() : inv.paymentDate,
              };
            }
            return inv;
          })
        );
        setSuccessMsg(`Payment of ${formatINR(amt)} logged successfully! Status updated to ${newStatus}`);
        setInstallmentModalInvoice(null);
        fetchInvoices();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to record payment installment");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error");
    } finally {
      setRecordingPayment(false);
    }
  };

  // Open Template Selector Modal
  const handleDownloadPDF = (inv: Invoice) => {
    setTemplateModalInvoice(inv);
  };

  // Execute PDF Download with chosen template
  const executeDownloadPDF = (inv: Invoice, template: InvoicePDFTemplate = "modern_tech") => {
    const pdfData = buildInvoicePDFDataObject(inv);
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

  // Calculate totals dynamically taking into account partial installment payments!
  const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalCollected = invoices.reduce((sum, i) => {
    const paid = i.paidAmount !== undefined && i.paidAmount !== null ? i.paidAmount : (i.status === "PAID" ? i.totalAmount : 0);
    return sum + paid;
  }, 0);
  const totalOutstanding = invoices.reduce((sum, i) => {
    const paid = i.paidAmount !== undefined && i.paidAmount !== null ? i.paidAmount : (i.status === "PAID" ? i.totalAmount : 0);
    return sum + Math.max(0, i.totalAmount - paid);
  }, 0);
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
      {/* Floating Compact Success Notification (Requirement 3: 3-Second Floating Toast) */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-emerald-900/90 text-white rounded-xl shadow-xl backdrop-blur-md border border-emerald-500/30 text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
          </div>
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-rose-900/90 text-white rounded-xl shadow-xl backdrop-blur-md border border-rose-500/30 text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto">
          <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
          </div>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
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
                      {formatDate(inv.dueDate)}
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                      {formatINR(inv.amount)}
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-slate-500 whitespace-nowrap">
                      +{formatINR(inv.tax)}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="font-black text-indigo-950">{formatINR(inv.totalAmount)}</div>
                      {inv.paidAmount !== undefined && inv.paidAmount > 0 ? (
                        <div className="text-[10px] mt-0.5 space-y-0.5">
                          <span className="text-emerald-600 font-bold block">Paid: {formatINR(inv.paidAmount)}</span>
                          {inv.totalAmount > inv.paidAmount && (
                            <span className="text-rose-500 font-semibold block">Due: {formatINR(inv.totalAmount - inv.paidAmount)}</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-0.5">Unpaid</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : inv.status === "PARTIALLY_PAID"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : inv.status === "OVERDUE"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {inv.status === "PAID" ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                        {inv.status === "PARTIALLY_PAID" ? "PARTIALLY PAID" : inv.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. Mark Paid Quick Action */}
                        {isAdminOrManager && (inv.status !== "PAID" || (inv.totalAmount - (inv.paidAmount || 0)) > 0) && (
                          <button
                            onClick={() => handleMarkAsPaid(inv)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            title="Mark as Full Paid"
                          >
                            Mark Paid
                          </button>
                        )}

                        {/* 2. Installment / Partial Payment (Always accessible) */}
                        {isAdminOrManager && (
                          <button
                            onClick={() => handleOpenInstallmentModal(inv)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Record Payment / View Installments"
                          >
                            <IndianRupee className="w-4 h-4" />
                          </button>
                        )}

                        {/* 3. Edit Invoice */}
                        {isAdminOrManager && (
                          <button
                            onClick={() => handleOpenEdit(inv)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Invoice"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {/* 4. Exact Live PDF Preview (Requirement 13) */}
                        <button
                          onClick={() => handleOpenPreviewModal(inv)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Exact Live PDF Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* 5. Download PDF */}
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
                  <DateInput
                    required
                    value={createForm.issueDate}
                    onChange={(val) => setCreateForm({ ...createForm, issueDate: val })}
                    placeholder="DD-MM-YYYY"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Valid Until / Due Date *</label>
                  <DateInput
                    required
                    value={createForm.dueDate}
                    onChange={(val) => setCreateForm({ ...createForm, dueDate: val })}
                    placeholder="DD-MM-YYYY"
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
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="w-6 pt-2 text-center font-bold text-slate-400 text-xs shrink-0 hidden sm:block">
                        #{idx + 1}
                      </div>
                      <textarea
                        rows={1}
                        placeholder="Description (e.g. UI/UX Design & System Architecture)"
                        required
                        value={itm.description}
                        onChange={(e) => {
                          handleCreateItemChange(idx, "description", e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        className="w-full sm:flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs resize-none overflow-hidden min-h-[34px] leading-relaxed"
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
                          step="any"
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
                  <DateInput
                    required
                    value={editFormData.issueDate}
                    onChange={(val) => setEditFormData({ ...editFormData, issueDate: val })}
                    placeholder="DD-MM-YYYY"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Valid Until / Due Date *</label>
                  <DateInput
                    required
                    value={editFormData.dueDate}
                    onChange={(val) => setEditFormData({ ...editFormData, dueDate: val })}
                    placeholder="DD-MM-YYYY"
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
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="w-6 pt-2 text-center font-bold text-slate-400 text-xs shrink-0 hidden sm:block">
                        #{idx + 1}
                      </div>
                      <textarea
                        rows={1}
                        placeholder="Description & Deliverable Scope"
                        required
                        value={itm.description}
                        onChange={(e) => {
                          handleEditItemChange(idx, "description", e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        className="w-full sm:flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs resize-none overflow-hidden min-h-[34px] leading-relaxed"
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
                          step="any"
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
          EXACT LIVE PDF PREVIEW MODAL (Requirement 13)
         ========================================================================= */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-snug">
                    PDF Preview: {previewInvoice.invoiceNumber}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {previewInvoice.client?.company || previewInvoice.client?.name} &middot; Live Vector PDF
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Template Selector Pills */}
                <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSwitchPreviewTemplate("modern_tech")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      previewTemplate === "modern_tech"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Modern Tech
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchPreviewTemplate("classic_corporate")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      previewTemplate === "classic_corporate"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Classic Corporate
                  </button>
                </div>

                {/* Direct Download */}
                <button
                  type="button"
                  onClick={() => executeDownloadPDF(previewInvoice, previewTemplate)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 gradient-brand text-white font-semibold text-xs rounded-lg hover:opacity-95 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={handleClosePreviewModal}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Live PDF Viewer Iframe */}
            <div className="flex-1 w-full bg-slate-100 overflow-hidden relative">
              {pdfPreviewUrl ? (
                <iframe
                  src={`${pdfPreviewUrl}#toolbar=0&navpanes=0`}
                  className="w-full h-full border-0"
                  title="Live PDF Document Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Rendering vector PDF document...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INSTALLMENT & PARTIAL PAYMENT MODAL (Requirement 15)
         ========================================================================= */}
      {installmentModalInvoice && (() => {
        const existingPayments = installmentModalInvoice.payments
          ? JSON.parse(installmentModalInvoice.payments)
          : [];
        const totalPaid = installmentModalInvoice.paidAmount ||
          existingPayments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
        const remaining = Math.max(0, installmentModalInvoice.totalAmount - totalPaid);
        const progressPct = installmentModalInvoice.totalAmount > 0
          ? Math.min(100, Math.round((totalPaid / installmentModalInvoice.totalAmount) * 100))
          : 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:base">Record Payment / Installment</h3>
                    <p className="text-xs text-indigo-300">
                      {installmentModalInvoice.invoiceNumber} &middot; {installmentModalInvoice.client?.company || installmentModalInvoice.client?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInstallmentModalInvoice(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
                {/* Financial Summary & Balance Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Invoice</span>
                      <span className="font-black text-slate-900 text-sm">{formatINR(installmentModalInvoice.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Paid So Far</span>
                      <span className="font-black text-emerald-600 text-sm">{formatINR(totalPaid)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-600 uppercase font-semibold block">Balance Left</span>
                      <span className="font-black text-rose-600 text-sm">{formatINR(remaining)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span>Payment Progress</span>
                      <span>{progressPct}% Settled</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Past Payments History */}
                {existingPayments.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-800 block mb-1.5">Previous Payments ({existingPayments.length})</span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {existingPayments.map((p: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800">{formatINR(p.amount)}</span>
                            <span className="text-slate-400 ml-2">&middot; {p.method}</span>
                            {p.reference && <span className="text-slate-500 ml-1">({p.reference})</span>}
                          </div>
                          <span className="text-slate-500 font-medium">{formatDate(p.date)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Installment Form */}
                <form onSubmit={handleRecordPayment} className="space-y-3 pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-900 block">Log New Payment Installment</span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Amount to Record (₹)</label>
                      <input
                        type="number"
                        min="1"
                        max={remaining > 0 ? remaining : undefined}
                        required
                        value={installmentAmount}
                        onChange={(e) => setInstallmentAmount(e.target.value)}
                        placeholder={`e.g. ${remaining}`}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 font-semibold text-xs">Payment Date</label>
                        {installmentDate && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                            {formatDate(installmentDate)}
                          </span>
                        )}
                      </div>
                      <DateInput
                        required
                        value={installmentDate}
                        onChange={(val) => setInstallmentDate(val)}
                        placeholder="DD-MM-YYYY"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Payment Method</label>
                      <select
                        value={installmentMethod}
                        onChange={(e) => setInstallmentMethod(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                        <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                        <option value="Cheque">Bank Cheque / DD</option>
                        <option value="Cash">Cash Receipt</option>
                        <option value="Card">Debit / Credit Card</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">UTR / Transaction Ref</label>
                      <input
                        type="text"
                        value={installmentReference}
                        onChange={(e) => setInstallmentReference(e.target.value)}
                        placeholder="e.g. HDFC-IMPS-8921"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Payment Note / Description</label>
                    <input
                      type="text"
                      value={installmentNote}
                      onChange={(e) => setInstallmentNote(e.target.value)}
                      placeholder="e.g. Initial advance 50% milestone payment"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={recordingPayment}
                      onClick={() => setInstallmentModalInvoice(null)}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={recordingPayment}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {recordingPayment ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Logging Payment...</span>
                        </>
                      ) : (
                        <span>Log Payment Installment</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}

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
