"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  IndianRupee,
  FileText,
  Download,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  UserCheck,
  Search,
  Plus,
  RefreshCw,
  Edit,
  Eye,
  X,
  CreditCard,
  Building,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/lib/formatCurrency";
import { formatDate } from "@/lib/formatDate";
import { downloadPayslipPDF, PayslipPDFData } from "@/lib/pdfGenerator";

interface Payslip {
  id: string;
  salaryId: string;
  month: number;
  year: number;
  basicPay: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentStatus: string;
  generatedAt: string;
  salary: {
    user: {
      id: string;
      name: string;
      email: string;
      department: string | null;
      designation: string | null;
      phone: string | null;
      dateJoined?: string | null;
    };
  };
}

interface SalaryStructure {
  id: string;
  userId: string;
  basicPay: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  user: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    designation: string | null;
    status: string;
    role?: string;
    dateJoined: string | null;
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function PayrollPage() {
  const { user } = useAuth();
  const isAdminOrHR = user?.role === "ADMIN" || user?.role === "HR";
  const isPersonalView = user?.role === "EMPLOYEE" || user?.role === "MANAGER";

  // State
  const [activeTab, setActiveTab] = useState<"payslips" | "structures" | "distributions">("payslips");
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [salaries, setSalaries] = useState<SalaryStructure[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Founder Profit Draws & Distributions State (Requirement 5)
  const [distributions, setDistributions] = useState<any[]>([]);
  const [distributionFounders, setDistributionFounders] = useState<any[]>([]);
  const [paidInvoices, setPaidInvoices] = useState<any[]>([]);
  const [distributionMetrics, setDistributionMetrics] = useState({
    totalCollectedRevenue: 0,
    totalDisbursed: 0,
    retainedReserves: 0,
  });

  // Modal for logging revenue split
  const [showLogSplitModal, setShowLogSplitModal] = useState(false);
  const [selectedSplitInvoiceId, setSelectedSplitInvoiceId] = useState("");
  const [splitTotalAmount, setSplitTotalAmount] = useState("");
  const [splitDate, setSplitDate] = useState(new Date().toISOString().slice(0, 10));
  const [splitMethod, setSplitMethod] = useState("UPI");
  const [splitReference, setSplitReference] = useState("");
  const [splitNotes, setSplitNotes] = useState("");
  const [founderAllocations, setFounderAllocations] = useState<{ [userId: string]: string }>({});
  const [savingSplit, setSavingSplit] = useState(false);

  // 3-Second Floating Toast Auto-Dismiss (Requirement 3)
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Filters
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<number>(2026);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [editingSalary, setEditingSalary] = useState<SalaryStructure | null>(null);
  const [salaryForm, setSalaryForm] = useState({
    basicPay: 0,
    allowances: 0,
    deductions: 0,
  });
  const [savingSalary, setSavingSalary] = useState(false);
  const [showAddStructureModal, setShowAddStructureModal] = useState(false);
  const [newSalaryForm, setNewSalaryForm] = useState({
    userId: "",
    basicPay: 50000,
    allowances: 10000,
    deductions: 5000,
  });
  const [savingNewSalary, setSavingNewSalary] = useState(false);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMonth, setGenerateMonth] = useState<number>(new Date().getMonth() + 1);
  const [generateYear, setGenerateYear] = useState<number>(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const payslipsRes = await fetch("/api/payroll/payslips");
      if (payslipsRes.ok) {
        const data = await payslipsRes.json();
        setPayslips(data.payslips || []);
      } else {
        const err = await payslipsRes.json();
        setErrorMsg(err.error || "Failed to load payslips");
      }

      if (isAdminOrHR) {
        const [salariesRes, empRes, distRes] = await Promise.all([
          fetch("/api/payroll/salaries"),
          fetch("/api/employees"),
          fetch("/api/payroll/distributions"),
        ]);
        if (salariesRes.ok) {
          const sData = await salariesRes.json();
          setSalaries(sData.salaries || []);
        }
        if (empRes.ok) {
          const eData = await empRes.json();
          setEmployees(eData.employees || []);
        }
        if (distRes.ok) {
          const dData = await distRes.json();
          setDistributions(dData.distributions || []);
          setDistributionFounders(dData.founders || []);
          setPaidInvoices(dData.paidInvoices || []);
          if (dData.metrics) {
            setDistributionMetrics(dData.metrics);
          }
        }
      }
    } catch (err: any) {
      setErrorMsg("Network error loading payroll information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Founder Split Handlers (Requirement 5)
  const handleOpenLogSplitModal = (prefillInvoice?: any) => {
    setSelectedSplitInvoiceId(prefillInvoice ? prefillInvoice.id : "");
    const amountToSplit = prefillInvoice ? (prefillInvoice.paidAmount || prefillInvoice.totalAmount) : "";
    setSplitTotalAmount(amountToSplit ? String(amountToSplit) : "");
    setSplitDate(new Date().toISOString().slice(0, 10));
    setSplitMethod("UPI");
    setSplitReference(prefillInvoice ? `INV-${prefillInvoice.invoiceNumber}` : "");
    setSplitNotes(prefillInvoice ? `Revenue split from invoice ${prefillInvoice.invoiceNumber}` : "");

    if (distributionFounders.length > 0 && amountToSplit) {
      const share = Math.round(Number(amountToSplit) / distributionFounders.length);
      const allocs: { [id: string]: string } = {};
      distributionFounders.forEach((f) => {
        allocs[f.id] = String(share);
      });
      setFounderAllocations(allocs);
    } else {
      const allocs: { [id: string]: string } = {};
      distributionFounders.forEach((f) => {
        allocs[f.id] = "";
      });
      setFounderAllocations(allocs);
    }
    setShowLogSplitModal(true);
  };

  const handleInvoiceSelectForSplit = (invId: string) => {
    setSelectedSplitInvoiceId(invId);
    if (!invId) return;
    const inv = paidInvoices.find((i) => i.id === invId);
    if (inv) {
      const amt = inv.paidAmount > 0 ? inv.paidAmount : inv.totalAmount;
      setSplitTotalAmount(String(amt));
      setSplitReference(`INV-${inv.invoiceNumber}`);
      setSplitNotes(`Project milestone split from invoice ${inv.invoiceNumber}`);

      if (distributionFounders.length > 0) {
        const share = Math.round(amt / distributionFounders.length);
        const allocs: { [id: string]: string } = {};
        distributionFounders.forEach((f) => {
          allocs[f.id] = String(share);
        });
        setFounderAllocations(allocs);
      }
    }
  };

  const handleQuickSplit = (type: "50-50" | "equal") => {
    const total = parseFloat(splitTotalAmount) || 0;
    if (total <= 0 || distributionFounders.length === 0) return;
    const share = Math.round(total / distributionFounders.length);
    const allocs: { [id: string]: string } = {};
    distributionFounders.forEach((f) => {
      allocs[f.id] = String(share);
    });
    setFounderAllocations(allocs);
  };

  const handleSubmitSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingSplit) return;
    setSavingSplit(true);
    setErrorMsg(null);

    try {
      const distArray = Object.entries(founderAllocations)
        .map(([userId, amt]) => ({
          userId,
          amount: parseFloat(amt) || 0,
        }))
        .filter((d) => d.amount > 0);

      if (distArray.length === 0) {
        setErrorMsg("Please allocate at least one founder amount greater than zero");
        setSavingSplit(false);
        return;
      }

      const inv = paidInvoices.find((i) => i.id === selectedSplitInvoiceId);

      const res = await fetch("/api/payroll/distributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedSplitInvoiceId || undefined,
          projectId: inv?.project?.id || undefined,
          distributions: distArray,
          paymentMethod: splitMethod,
          distributionDate: splitDate,
          reference: splitReference,
          notes: splitNotes,
        }),
      });

      if (res.ok) {
        setSuccessMsg("Founder revenue split logged successfully!");
        setShowLogSplitModal(false);
        fetchData();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to log distribution");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error");
    } finally {
      setSavingSplit(false);
    }
  };

  // Handle Salary Structure Edit
  const handleOpenEdit = (salary: SalaryStructure) => {
    setEditingSalary(salary);
    setSalaryForm({
      basicPay: salary.basicPay,
      allowances: salary.allowances,
      deductions: salary.deductions,
    });
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalary) return;
    setSavingSalary(true);
    try {
      const res = await fetch(`/api/payroll/salaries/${editingSalary.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(salaryForm),
      });
      if (res.ok) {
        setSuccessMsg(`Salary structure updated successfully for ${editingSalary.user.name}`);
        setEditingSalary(null);
        fetchData();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to update salary");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update salary");
    } finally {
      setSavingSalary(false);
    }
  };

  // Handle Create New Salary Structure
  const handleCreateSalaryStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalaryForm.userId) {
      setErrorMsg("Please select an employee or admin account");
      return;
    }
    setSavingNewSalary(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/payroll/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSalaryForm),
      });
      if (res.ok) {
        setSuccessMsg("Salary structure configured successfully");
        setShowAddStructureModal(false);
        setNewSalaryForm({ userId: "", basicPay: 50000, allowances: 10000, deductions: 5000 });
        fetchData();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to create salary structure");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create salary structure");
    } finally {
      setSavingNewSalary(false);
    }
  };

  // Handle Generate Monthly Payroll
  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/payroll/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchAll: true,
          month: generateMonth,
          year: generateYear,
          paymentStatus: "PAID",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || `Payroll generated for ${MONTH_NAMES[generateMonth - 1]} ${generateYear}`);
        setShowGenerateModal(false);
        fetchData();
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setErrorMsg(data.error || "Failed to generate monthly payroll");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error running payroll batch");
    } finally {
      setGenerating(false);
    }
  };

  // Trigger PDF Download
  const handleDownloadPDF = (slip: Payslip) => {
    const pdfData: PayslipPDFData = {
      id: slip.id,
      month: slip.month,
      year: slip.year,
      basicPay: slip.basicPay,
      allowances: slip.allowances,
      deductions: slip.deductions,
      netSalary: slip.netSalary,
      paymentStatus: slip.paymentStatus,
      generatedAt: slip.generatedAt,
      employee: {
        id: slip.salary.user.id,
        name: slip.salary.user.name,
        email: slip.salary.user.email,
        department: slip.salary.user.department,
        designation: slip.salary.user.designation,
        phone: slip.salary.user.phone,
      },
    };
    downloadPayslipPDF(pdfData);
  };

  // Filtered payslips
  const filteredPayslips = payslips.filter((p) => {
    if (filterMonth !== "all" && p.month !== parseInt(filterMonth)) return false;
    if (filterYear && p.year !== filterYear) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.salary?.user?.name?.toLowerCase().includes(q);
      const matchDept = p.salary?.user?.department?.toLowerCase().includes(q);
      const matchDesig = p.salary?.user?.designation?.toLowerCase().includes(q);
      if (!matchName && !matchDept && !matchDesig) return false;
    }
    return true;
  });

  // Financial metrics
  const totalMonthlyPayroll = salaries.reduce((acc, s) => acc + s.netSalary, 0);
  const avgSalary = salaries.length > 0 ? Math.round(totalMonthlyPayroll / salaries.length) : 0;
  const currentMonthSlipsCount = payslips.filter((p) => p.month === (new Date().getMonth() + 1) && p.year === new Date().getFullYear()).length;

  return (
    <AppLayout
      title={isPersonalView ? "My Payslips & Compensation" : "Salary & Payroll Management"}
      subtitle={
        isPersonalView
          ? "Monthly earnings, statutory deductions, and downloadable PDF payslips in Indian Rupees (₹)"
          : "Compensation structures, automated monthly payslip generation, and corporate payroll accounting"
      }
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
            <AlertCircle className="w-3.5 h-3.5 text-rose-300" />
          </div>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Metrics Cards (Admin / HR) */}
      {isAdminOrHR && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Monthly Payroll Run</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{formatINR(totalMonthlyPayroll)}</p>
            <p className="text-[11px] text-indigo-600 mt-1 font-medium">Total active staff commitment</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Active Staff Enrolled</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{salaries.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Configured salary accounts</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Average Net Salary</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{formatINR(avgSalary)}</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">Per employee average</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Generated This Month</span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{currentMonthSlipsCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Current billing cycle payslips</p>
          </div>
        </div>
      )}

      {/* Employee & Manager Top Profile & Salary Card */}
      {isPersonalView && payslips.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white mb-6 shadow-md border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Compensation Package</span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">Active</span>
              </div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {user?.designation || "Staff"} &bull; {user?.department || "General"} Department
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-4 border border-white/15 text-right md:text-left">
              <span className="text-[11px] text-indigo-200 font-medium">Monthly Take-Home Salary</span>
              <p className="text-2xl font-extrabold text-white mt-1 flex items-center gap-1 md:justify-start justify-end">
                {formatINR(payslips[0].netSalary, true)}
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5">Direct Deposit to registered bank account</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-5">
        {isAdminOrHR ? (
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
            <button
              onClick={() => setActiveTab("payslips")}
              className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === "payslips"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Payslips ({payslips.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("structures")}
              className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === "structures"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Salary Structures ({salaries.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("distributions")}
              className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === "distributions"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Founder Profit Splits & Draws ({distributions.length})</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>My Issued Payslips</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {isAdminOrHR && activeTab === "distributions" ? (
            <button
              onClick={() => handleOpenLogSplitModal()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Revenue Split / Founder Draw</span>
            </button>
          ) : isAdminOrHR && activeTab === "structures" ? (
            <button
              onClick={() => setShowAddStructureModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Salary Structure</span>
            </button>
          ) : isAdminOrHR ? (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Run Monthly Payroll</span>
            </button>
          ) : null}
          <button
            onClick={fetchData}
            title="Refresh list"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* TAB 1: PAYSLIPS LIST */}
      {activeTab === "payslips" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:flex-1 min-w-0 sm:min-w-[220px] bg-slate-50 sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-slate-200">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={isAdminOrHR ? "Search employee, designation, department..." : "Search payslips..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <span>Month:</span>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-indigo-500"
                >
                  <option value="all">All Months</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={String(idx + 1)}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <span>Year:</span>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(parseInt(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-indigo-500"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payslips Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 min-w-[720px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Period</th>
                    {isAdminOrHR && <th className="py-3 px-4">Employee</th>}
                    {isAdminOrHR && <th className="py-3 px-4">Department</th>}
                    <th className="py-3 px-4 text-right">Basic Pay</th>
                    <th className="py-3 px-4 text-right">Allowances</th>
                    <th className="py-3 px-4 text-right">Deductions</th>
                    <th className="py-3 px-4 text-right">Net Take-Home</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={isAdminOrHR ? 9 : 7} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                        Loading payslips...
                      </td>
                    </tr>
                  ) : filteredPayslips.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminOrHR ? 9 : 7} className="py-12 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-700">No payslips found for this period</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {isAdminOrHR
                            ? "Use 'Run Monthly Payroll' to generate payslips for your employees."
                            : "Your payslips will appear here once generated by HR."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayslips.map((slip) => {
                      const monthName = MONTH_NAMES[(slip.month - 1) % 12];
                      return (
                        <tr key={slip.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                              <span>
                                {monthName} {slip.year}
                              </span>
                            </div>
                          </td>

                          {isAdminOrHR && (
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-bold text-slate-900">{slip.salary?.user?.name}</div>
                              <div className="text-[11px] text-slate-400">{slip.salary?.user?.designation || "Staff"}</div>
                            </td>
                          )}

                          {isAdminOrHR && (
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-slate-200">
                                {slip.salary?.user?.department || "General"}
                              </span>
                            </td>
                          )}

                          <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                            {formatINR(slip.basicPay, true)}
                          </td>

                          <td className="py-3 px-4 text-right font-medium text-emerald-600 whitespace-nowrap">
                            +{formatINR(slip.allowances, true)}
                          </td>

                          <td className="py-3 px-4 text-right font-medium text-rose-600 whitespace-nowrap">
                            -{formatINR(slip.deductions, true)}
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-indigo-700 whitespace-nowrap">
                            {formatINR(slip.netSalary, true)}
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                slip.paymentStatus === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {slip.paymentStatus}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedPayslip(slip)}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="View Breakdown"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(slip)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors"
                                title="Download PDF Payslip"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALARY STRUCTURES (ADMIN & HR ONLY) */}
      {isAdminOrHR && activeTab === "structures" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Employee Salary Master Directory
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pre-configured compensation packages. Updates here automatically compute net salary in INR and apply to subsequent payslips.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStructureModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Salary Structure</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4 text-right">Basic Salary</th>
                    <th className="py-3 px-4 text-right">Allowances</th>
                    <th className="py-3 px-4 text-right">Deductions</th>
                    <th className="py-3 px-4 text-right">Calculated Net (Take-Home)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salaries.map((sal) => (
                    <tr key={sal.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{sal.user.name}</div>
                        <div className="text-[11px] text-slate-400">{sal.user.email}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{sal.user.designation || "Staff"}</div>
                        <span className="text-[10px] text-indigo-600 font-semibold">{sal.user.department || "General"}</span>
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatINR(sal.basicPay, true)}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-emerald-600 whitespace-nowrap">
                        +{formatINR(sal.allowances, true)}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-rose-600 whitespace-nowrap">
                        -{formatINR(sal.deductions, true)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-indigo-700 whitespace-nowrap">
                        {formatINR(sal.netSalary, true)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {user?.role === "HR" && sal.user.role === "ADMIN" ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-[11px] font-semibold border border-amber-200"
                            title="Only Admin/CEO can modify executive compensation package"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            <span>Executive Protected</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenEdit(sal)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-500" />
                            <span>Edit Structure</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FOUNDER PROFIT DRAWS & REVENUE SPLITS (Requirement 5) */}
      {isAdminOrHR && activeTab === "distributions" && (
        <div className="space-y-5">
          {/* Top 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Collected Project Revenue</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatINR(distributionMetrics.totalCollectedRevenue)}
              </p>
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">Real-time sync from invoice receipts</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Disbursed to Founders & Partners</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatINR(distributionMetrics.totalDisbursed)}
              </p>
              <p className="text-[11px] text-indigo-600 mt-1 font-medium">{distributions.length} profit splits logged</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Retained Business Reserves</span>
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatINR(distributionMetrics.retainedReserves)}
              </p>
              <p className="text-[11px] text-teal-600 mt-1 font-medium">Available company operating balance</p>
            </div>
          </div>

          {/* Context Banner */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-indigo-950 mb-0.5">Custom Founder Revenue-Sharing Model</h4>
              <p className="text-indigo-800 leading-relaxed">
                As founders (CEO & Co-CEO), profit distributions are tied directly to incoming client project payments rather than rigid monthly employee salary structures.
                When client payments or milestones are logged, use this ledger to record your custom splits and partner draws.
              </p>
            </div>
          </div>

          {/* Distributions Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Partner Disbursements & Profit Draws Ledger
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Historical log of all dividend withdrawals and milestone splits.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenLogSplitModal()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log New Split / Draw</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 min-w-[750px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Distribution Date</th>
                    <th className="py-3 px-4">Founder / Partner</th>
                    <th className="py-3 px-4">Source Project / Invoice</th>
                    <th className="py-3 px-4 text-right">Amount Disbursed</th>
                    <th className="py-3 px-4">Mode & Reference</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {distributions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        <IndianRupee className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No founder distributions logged yet</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Click "Log Revenue Split / Founder Draw" above to record milestone splits between founders.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    distributions.map((dist) => (
                      <tr key={dist.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                          {formatDate(dist.distributionDate)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{dist.user.name}</div>
                          <div className="text-[11px] text-indigo-600 font-medium">{dist.user.designation || dist.user.role}</div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {dist.invoice ? (
                            <div>
                              <span className="font-semibold text-slate-800">Invoice {dist.invoice.invoiceNumber}</span>
                              {dist.project && <span className="text-[11px] text-slate-400 block">{dist.project.name}</span>}
                            </div>
                          ) : dist.project ? (
                            <span className="font-semibold text-slate-800">{dist.project.name}</span>
                          ) : (
                            <span className="text-slate-500">General Partner Draw</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-black text-emerald-600 whitespace-nowrap text-sm">
                          {formatINR(dist.amount, true)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{dist.paymentMethod}</div>
                          {dist.reference && <div className="text-[10px] text-slate-400">{dist.reference}</div>}
                        </td>

                        <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={dist.notes || ""}>
                          {dist.notes || "—"}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LOG REVENUE SPLIT / FOUNDER DRAW MODAL (Requirement 5) */}
      {showLogSplitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Log Founder Revenue Split / Partner Draw</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Distribute collected project payments among founders & executives
                </p>
              </div>
              <button
                onClick={() => setShowLogSplitModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitSplit} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Select Source Payment */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Source Payment / Invoice</label>
                <select
                  value={selectedSplitInvoiceId}
                  onChange={(e) => handleInvoiceSelectForSplit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-indigo-500 font-medium"
                >
                  <option value="">-- General Profit Draw (Not linked to specific invoice) --</option>
                  {paidInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} &bull; {inv.client?.company || inv.client?.name} (Collected: {formatINR(inv.paidAmount > 0 ? inv.paidAmount : inv.totalAmount)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Total Amount to Split */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">Total Amount to Split (₹ INR)</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickSplit("50-50")}
                      className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      50% / 50% Equal Split
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  step="100"
                  placeholder="e.g. 5000"
                  value={splitTotalAmount}
                  onChange={(e) => {
                    setSplitTotalAmount(e.target.value);
                    const val = parseFloat(e.target.value);
                    if (val > 0 && distributionFounders.length > 0) {
                      const share = Math.round(val / distributionFounders.length);
                      const allocs: { [id: string]: string } = {};
                      distributionFounders.forEach((f) => {
                        allocs[f.id] = String(share);
                      });
                      setFounderAllocations(allocs);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-bold text-sm text-slate-900"
                />
              </div>

              {/* Individual Founder Share Inputs */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block text-xs">Founder Breakdown</span>
                {distributionFounders.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-900 block">{f.name}</span>
                      <span className="text-[10px] text-slate-500">{f.designation || f.role}</span>
                    </div>
                    <div className="w-36">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        placeholder="Share in ₹"
                        value={founderAllocations[f.id] || ""}
                        onChange={(e) =>
                          setFounderAllocations({ ...founderAllocations, [f.id]: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-right font-bold text-slate-900 focus:outline-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Date & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">Distribution Date</label>
                    {splitDate && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1 rounded">
                        {formatDate(splitDate)}
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    required
                    value={splitDate}
                    onChange={(e) => setSplitDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Payment Method</label>
                  <select
                    value={splitMethod}
                    onChange={(e) => setSplitMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-indigo-500 font-medium"
                  >
                    <option value="UPI">UPI (GooglePay / PhonePe)</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                    <option value="Cash">Cash Disbursement</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">UTR / Transaction Ref</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC-UPI-4928190"
                  value={splitReference}
                  onChange={(e) => setSplitReference(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 text-slate-800 font-medium"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Milestone 1 revenue split (₹2,500 each to CEO & Co-CEO)"
                  value={splitNotes}
                  onChange={(e) => setSplitNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 text-slate-800 font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={savingSplit}
                  onClick={() => setShowLogSplitModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSplit}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingSplit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <IndianRupee className="w-3.5 h-3.5" />}
                  <span>Save Distribution Split</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PAYSLIP DETAIL MODAL */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold">EC HYBRID</span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">
                    Official Payslip
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold mt-1">
                  {MONTH_NAMES[selectedPayslip.month - 1]} {selectedPayslip.year} Salary Slip
                </h3>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs overflow-y-auto flex-1">
              {/* Employee Info Header */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Employee</span>
                  <p className="font-bold text-slate-900">{selectedPayslip.salary.user.name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Department</span>
                  <p className="font-bold text-slate-900">{selectedPayslip.salary.user.department || "General"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Designation</span>
                  <p className="font-medium text-slate-800">{selectedPayslip.salary.user.designation || "Staff"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Payment Status</span>
                  <p className="font-bold text-emerald-600">{selectedPayslip.paymentStatus} (Bank Transfer)</p>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex justify-between">
                    <span>Earnings</span>
                    <span>INR (₹)</span>
                  </h4>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Basic Salary</span>
                    <span className="font-semibold text-slate-900">{formatINR(selectedPayslip.basicPay, true)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>House Rent Allowance</span>
                    <span className="font-semibold text-slate-900">
                      {formatINR(Math.round(selectedPayslip.allowances * 0.5), true)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Special Allowance</span>
                    <span className="font-semibold text-slate-900">
                      {formatINR(Math.round(selectedPayslip.allowances * 0.5), true)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>Gross Earnings</span>
                    <span className="text-emerald-700">
                      {formatINR(selectedPayslip.basicPay + selectedPayslip.allowances, true)}
                    </span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex justify-between">
                    <span>Deductions</span>
                    <span>INR (₹)</span>
                  </h4>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Provident Fund (EPF)</span>
                    <span className="font-semibold text-rose-600">
                      -{formatINR(Math.round(selectedPayslip.deductions * 0.5), true)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Income Tax (TDS)</span>
                    <span className="font-semibold text-rose-600">
                      -{formatINR(Math.round(selectedPayslip.deductions * 0.4), true)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Professional Tax (PT)</span>
                    <span className="font-semibold text-rose-600">
                      -{formatINR(Math.round(selectedPayslip.deductions * 0.1), true)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>Total Deductions</span>
                    <span className="text-rose-700">-{formatINR(selectedPayslip.deductions, true)}</span>
                  </div>
                </div>
              </div>

              {/* Net Take-Home Highlight */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-indigo-700 font-bold uppercase tracking-wider">
                    Net Take-Home Salary
                  </span>
                  <p className="text-xl font-black text-indigo-950 mt-0.5">{formatINR(selectedPayslip.netSalary, true)}</p>
                </div>
                <button
                  onClick={() => handleDownloadPDF(selectedPayslip)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SALARY STRUCTURE MODAL */}
      {editingSalary && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold">Edit Salary Structure</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {editingSalary.user.name} ({editingSalary.user.designation || "Staff"})
                </p>
              </div>
              <button
                onClick={() => setEditingSalary(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSalary} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Basic Monthly Pay (₹ INR)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  value={salaryForm.basicPay}
                  onChange={(e) =>
                    setSalaryForm({ ...salaryForm, basicPay: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Standard Allowances (HRA + Special ₹ INR)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={salaryForm.allowances}
                  onChange={(e) =>
                    setSalaryForm({ ...salaryForm, allowances: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Total Deductions (Tax + EPF + PT ₹ INR)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={salaryForm.deductions}
                  onChange={(e) =>
                    setSalaryForm({ ...salaryForm, deductions: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                />
              </div>

              {/* Calculated Net Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-500 font-semibold">Calculated Net Salary (Take-Home)</span>
                <p className="text-xl font-black text-indigo-700 mt-1">
                  {formatINR(Math.max(0, salaryForm.basicPay + salaryForm.allowances - salaryForm.deductions), true)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Computed as Basic + Allowances - Deductions</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSalary(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSalary}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {savingSalary ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{savingSalary ? "Updating..." : "Update Salary"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RUN MONTHLY PAYROLL MODAL (ADMIN & HR) */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold">Generate Monthly Payroll</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Batch generates monthly payslips for all active employees
                </p>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGeneratePayroll} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Select Month</label>
                  <select
                    value={generateMonth}
                    onChange={(e) => setGenerateMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Select Year</label>
                  <select
                    value={generateYear}
                    onChange={(e) => setGenerateYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                  </select>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-indigo-900">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Automated Batch Run Details</span>
                </div>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  Generating payroll will calculate individual payslips using each active employee&apos;s configured salary structure in INR (₹). In-app notifications will be sent to employees automatically upon completion.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm & Run Payroll</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SALARY STRUCTURE MODAL (ADMIN & HR) */}
      {showAddStructureModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold">Add Salary Structure</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Manually configure compensation package for an employee or admin
                </p>
              </div>
              <button
                onClick={() => setShowAddStructureModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSalaryStructure} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Employee / Admin *</label>
                <select
                  required
                  value={newSalaryForm.userId}
                  onChange={(e) => setNewSalaryForm({ ...newSalaryForm, userId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                >
                  <option value="">-- Choose Account --</option>
                  {employees
                    .filter((e) => !salaries.some((s) => s.userId === e.id))
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role}) - {emp.designation || emp.department || emp.email}
                      </option>
                    ))}
                </select>
                {employees.filter((e) => !salaries.some((s) => s.userId === e.id)).length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    All existing staff and admin accounts already have salary structures configured.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Monthly Basic Salary (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={newSalaryForm.basicPay}
                  onChange={(e) =>
                    setNewSalaryForm({ ...newSalaryForm, basicPay: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Monthly Allowances (HRA, Travel, etc.) (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={newSalaryForm.allowances}
                  onChange={(e) =>
                    setNewSalaryForm({ ...newSalaryForm, allowances: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Monthly Deductions (PF, TDS, etc.) (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={newSalaryForm.deductions}
                  onChange={(e) =>
                    setNewSalaryForm({ ...newSalaryForm, deductions: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                />
              </div>

              {/* Calculated Net Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-500 font-semibold">Calculated Net Salary (Take-Home)</span>
                <p className="text-xl font-black text-indigo-700 mt-1">
                  {formatINR(Math.max(0, newSalaryForm.basicPay + newSalaryForm.allowances - newSalaryForm.deductions), true)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Computed as Basic + Allowances - Deductions</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStructureModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewSalary}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {savingNewSalary ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Structure</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
