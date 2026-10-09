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
  const [activeTab, setActiveTab] = useState<"payslips" | "structures">("payslips");
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [salaries, setSalaries] = useState<SalaryStructure[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
        const [salariesRes, empRes] = await Promise.all([
          fetch("/api/payroll/salaries"),
          fetch("/api/employees"),
        ]);
        if (salariesRes.ok) {
          const sData = await salariesRes.json();
          setSalaries(sData.salaries || []);
        }
        if (empRes.ok) {
          const eData = await empRes.json();
          setEmployees(eData.employees || []);
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
      {/* Alert Messages */}
      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
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
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>My Issued Payslips</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {isAdminOrHR && (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Run Monthly Payroll</span>
            </button>
          )}
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
