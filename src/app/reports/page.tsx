"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  BarChart3,
  TrendingUp,
  IndianRupee,
  Download,
  PieChart,
  ShieldAlert,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Calendar,
  FileSpreadsheet,
  RefreshCw,
  FolderGit2,
  ArrowUpRight,
  TrendingDown
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/lib/formatCurrency";
import { formatDate } from "@/lib/formatDate";
import { downloadExecutiveReportPDF } from "@/lib/pdfGenerator";

interface ReportData {
  revenueBreakdown: {
    productRevenue: number;
    serviceRevenue: number;
    totalRevenue: number;
  };
  expenseBreakdown: {
    monthlyPayroll: number;
    annualPayroll: number;
  };
  netProfit: number;
  projectSummary: {
    total: number;
    active: number;
    planning: number;
    onHold: number;
    completed: number;
  };
  taskSummary: {
    total: number;
    done: number;
    inProgress: number;
    todo: number;
    review: number;
    overdue: number;
    completionRate: number;
  };
  workloadPerEmployee: Array<{
    id: string;
    name: string;
    department: string | null;
    totalTasks: number;
    completedTasks: number;
    openTasks: number;
  }>;
  leaveSummary: {
    total: number;
    casual: number;
    sick: number;
    unpaid: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdminOrHR = user?.role === "ADMIN" || user?.role === "HR";

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!isAdminOrHR) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to load reports");
      }
    } catch (err: any) {
      setErrorMsg("Network error loading financial and operational reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  // Export CSV Data
  const handleExportCSV = () => {
    if (!report) return;

    const rows = [
      ["EC HYBRID - EXECUTIVE PERFORMANCE REPORT"],
      ["Generated Date", formatDate(new Date())],
      [],
      ["FINANCIAL PROFITABILITY METRICS (INR)"],
      ["Metric", "Amount (INR)"],
      ["Service Line Billing", report.revenueBreakdown.serviceRevenue],
      ["Product Line Sales", report.revenueBreakdown.productRevenue],
      ["Total Gross Revenue", report.revenueBreakdown.totalRevenue],
      ["Monthly Payroll Operational Expense", report.expenseBreakdown.monthlyPayroll],
      ["Annual Projected Payroll Expense", report.expenseBreakdown.annualPayroll],
      ["Net Operating Profit", report.netProfit],
      [],
      ["PROJECT METRICS"],
      ["Total Projects", report.projectSummary.total],
      ["Active Projects", report.projectSummary.active],
      ["In Planning", report.projectSummary.planning],
      ["On Hold", report.projectSummary.onHold],
      ["Completed", report.projectSummary.completed],
      [],
      ["TASK EXECUTION METRICS"],
      ["Total Tasks", report.taskSummary.total],
      ["Completed Tasks", report.taskSummary.done],
      ["In Progress Tasks", report.taskSummary.inProgress],
      ["Overdue Tasks", report.taskSummary.overdue],
      ["Completion Rate %", `${report.taskSummary.completionRate}%`],
      [],
      ["EMPLOYEE WORKLOAD ALLOCATION"],
      ["Employee Name", "Department", "Total Tasks", "Completed", "Open Tasks"],
      ...report.workloadPerEmployee.map((e) => [
        e.name,
        e.department || "General",
        e.totalTasks,
        e.completedTasks,
        e.openTasks,
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EC_HYBRID_Executive_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Restrict Non-Admin / HR
  if (!isAdminOrHR) {
    return (
      <AppLayout title="Executive Reports" subtitle="Organization profitability and performance">
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto mt-12 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-2">Access Restricted (Section 3.9 Compliance)</h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Per Section 3.9 of the corporate security specification, <strong>executive financial reporting, revenue analytics, and organization-wide capacity dashboards are strictly reserved for Admin and HR personnel</strong>.
          </p>
          <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            Managers and Employees cannot view organization financial ledgers or cross-department workload summaries.
          </div>
        </div>
      </AppLayout>
    );
  }

  // Calculate percentages
  const totalRev = report?.revenueBreakdown.totalRevenue || 1;
  const servicePct = Math.round(((report?.revenueBreakdown.serviceRevenue || 0) / totalRev) * 100);
  const productPct = Math.round(((report?.revenueBreakdown.productRevenue || 0) / totalRev) * 100);
  const profitMargin = report && report.revenueBreakdown.totalRevenue > 0
    ? Math.round((report.netProfit / report.revenueBreakdown.totalRevenue) * 100)
    : 0;

  return (
    <AppLayout
      title="Financial & Operations Reporting"
      subtitle="Dual revenue streams (Product vs IT Services), payroll expense tracking, and organizational net profit in Indian Rupees (₹)"
    >
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div>
          <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-200">
            Phase 3 Executive Analytics
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => report && downloadExecutiveReportPDF(report)}
            disabled={!report || loading}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!report || loading}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchReports}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-xs">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
          <p className="text-sm font-bold text-slate-800">Calculating Organization Financial Metrics...</p>
          <p className="text-xs text-slate-500 mt-1">Aggregating IT client billing, product sales, and payroll expenses.</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* 5-Column Financial KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Revenue */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Gross Total Revenue</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {formatINR(report.revenueBreakdown.totalRevenue)}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Combined Inflows</span>
              </div>
            </div>

            {/* IT Services Billing */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Service Line Billing</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-indigo-950 mt-2">
                {formatINR(report.revenueBreakdown.serviceRevenue)}
              </p>
              <p className="text-[11px] text-indigo-600 mt-1 font-medium">{servicePct}% of gross revenue</p>
            </div>

            {/* Product Line Sales */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Product Line Sales</span>
                <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                  <PieChart className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-violet-950 mt-2">
                {formatINR(report.revenueBreakdown.productRevenue)}
              </p>
              <p className="text-[11px] text-violet-600 mt-1 font-medium">{productPct}% of gross revenue</p>
            </div>

            {/* Monthly Payroll Expense */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Monthly Payroll Cost</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-600 mt-2">
                {formatINR(report.expenseBreakdown.monthlyPayroll)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Primary operational line</p>
            </div>

            {/* Net Operating Profit */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">Net Operating Profit</span>
                <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full">
                  {profitMargin}% Margin
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-950 mt-2">
                {formatINR(report.netProfit)}
              </p>
              <p className="text-[11px] text-emerald-700 mt-1 font-semibold">Revenue minus Staff Cost</p>
            </div>
          </div>

          {/* Revenue & Profit Distribution Visualizers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Composition Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>Dual Revenue Streams Breakdown</span>
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  Total: {formatINR(report.revenueBreakdown.totalRevenue)}
                </span>
              </div>

              {/* Stacked bar */}
              <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden flex mb-4">
                <div
                  style={{ width: `${servicePct}%` }}
                  className="bg-indigo-600 h-full transition-all duration-500"
                  title={`IT Services: ${servicePct}%`}
                />
                <div
                  style={{ width: `${productPct}%` }}
                  className="bg-violet-500 h-full transition-all duration-500"
                  title={`Product Sales: ${productPct}%`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                    <span className="font-bold text-indigo-950">IT Services Billing</span>
                  </div>
                  <p className="text-lg font-bold text-indigo-700">{formatINR(report.revenueBreakdown.serviceRevenue)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{servicePct}% total share &bull; Contracted client work</p>
                </div>

                <div className="bg-violet-50/60 p-3 rounded-xl border border-violet-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
                    <span className="font-bold text-violet-950">Product Line Sales</span>
                  </div>
                  <p className="text-lg font-bold text-violet-700">{formatINR(report.revenueBreakdown.productRevenue)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{productPct}% total share &bull; Software licenses & subscriptions</p>
                </div>
              </div>
            </div>

            {/* Profit Margin & Operating Health */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Profitability & Cost Efficiency</span>
                </h3>
                <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  {profitMargin}% Retention
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between py-1 text-slate-600 font-medium">
                    <span>Total Revenue</span>
                    <span className="font-bold text-slate-900">{formatINR(report.revenueBreakdown.totalRevenue)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between py-1 text-slate-600 font-medium">
                    <span>Monthly Payroll Burn</span>
                    <span className="font-bold text-rose-600">-{formatINR(report.expenseBreakdown.monthlyPayroll)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(100, Math.round((report.expenseBreakdown.monthlyPayroll / totalRev) * 100))}%`,
                      }}
                      className="h-full bg-rose-500 rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between py-1 text-slate-600 font-medium">
                    <span>Net Operating Profit</span>
                    <span className="font-bold text-emerald-600">+{formatINR(report.netProfit)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, profitMargin))}%`,
                      }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-4 leading-relaxed border-t border-slate-100 pt-3">
                Projected annual payroll commitment stands at <strong>{formatINR(report.expenseBreakdown.annualPayroll)}</strong>.
                Operating margin remains positive and within target organizational thresholds.
              </p>
            </div>
          </div>

          {/* Operational Metrics: Projects & Tasks Delivery */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Projects Delivery Health */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-indigo-600" />
                  <span>Project Delivery Status ({report.projectSummary.total} Total)</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Active</span>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{report.projectSummary.active}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-700">Planning</span>
                  <p className="text-2xl font-black text-blue-900 mt-1">{report.projectSummary.planning}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-700">On Hold</span>
                  <p className="text-2xl font-black text-amber-900 mt-1">{report.projectSummary.onHold}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-700">Completed</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{report.projectSummary.completed}</p>
                </div>
              </div>
            </div>

            {/* Task Execution Velocity */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Task Execution Velocity ({report.taskSummary.total} Total)</span>
                </h3>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                  {report.taskSummary.completionRate}% Done
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Done</span>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{report.taskSummary.done}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-700">In Progress</span>
                  <p className="text-2xl font-black text-blue-900 mt-1">{report.taskSummary.inProgress}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-600">To Do</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">{report.taskSummary.todo}</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-rose-700">Overdue</span>
                  <p className="text-2xl font-black text-rose-900 mt-1">{report.taskSummary.overdue}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Capacity & Workload Allocation Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Employee Workload & Capacity Allocation</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cross-departmental distribution of tasks and operational delivery burden.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 min-w-[680px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Total Tasks</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                    <th className="py-3 px-4 text-center">Open / Pending</th>
                    <th className="py-3 px-4 text-center">Completion Ratio</th>
                    <th className="py-3 px-4 text-right">Capacity State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.workloadPerEmployee.map((emp) => {
                    const ratio = emp.totalTasks > 0 ? Math.round((emp.completedTasks / emp.totalTasks) * 100) : 0;
                    const isHighLoad = emp.openTasks >= 5;
                    const isOptimal = emp.openTasks > 0 && emp.openTasks < 5;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {emp.name}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-slate-200">
                            {emp.department || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-800 whitespace-nowrap">
                          {emp.totalTasks}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600 whitespace-nowrap">
                          {emp.completedTasks}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-rose-600 whitespace-nowrap">
                          {emp.openTasks}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${ratio}%` }}
                                className="h-full bg-indigo-600 rounded-full"
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700">{ratio}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isHighLoad
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : isOptimal
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {isHighLoad ? "High Workload" : isOptimal ? "Optimal Load" : "Available"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leave & Operational Impact */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Leave & Staff Availability Summary</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Requests</span>
                <p className="text-lg font-bold text-slate-900 mt-1">{report.leaveSummary.total}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-[10px] text-blue-700 font-semibold uppercase">Casual Leaves</span>
                <p className="text-lg font-bold text-blue-900 mt-1">{report.leaveSummary.casual}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="text-[10px] text-amber-700 font-semibold uppercase">Sick Leaves</span>
                <p className="text-lg font-bold text-amber-900 mt-1">{report.leaveSummary.sick}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                <span className="text-[10px] text-purple-700 font-semibold uppercase">Unpaid Leaves</span>
                <p className="text-lg font-bold text-purple-900 mt-1">{report.leaveSummary.unpaid}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 font-semibold uppercase">Approved</span>
                <p className="text-lg font-bold text-emerald-900 mt-1">{report.leaveSummary.approved}</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <span className="text-[10px] text-rose-700 font-semibold uppercase">Pending</span>
                <p className="text-lg font-bold text-rose-900 mt-1">{report.leaveSummary.pending}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="font-bold text-slate-800">Unable to load report metrics</p>
          <p className="text-xs text-slate-500 mt-1">{errorMsg || "Please try refreshing the page"}</p>
        </div>
      )}
    </AppLayout>
  );
}
