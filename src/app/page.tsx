"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  Building2,
  FolderGit2,
  CheckSquare,
  IndianRupee,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  Activity,
  Sparkles,
  CreditCard,
  CheckCircle2,
  PieChart,
  UserCheck,
  Briefcase,
  RefreshCw,
} from "lucide-react";
import { formatINR } from "@/lib/formatCurrency";
import { formatDate } from "@/lib/formatDate";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import LoginPage from "./login/page";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadStats = async (isBackground = false) => {
    if (!isBackground && !stats) {
      setLoading(true);
    }
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadStats(false);
    }
  }, [user]);

  // Real-time synchronization: silently auto-refreshes metrics without UI flicker or layout shifts
  useRealtimeSync((event) => {
    if (user && event?.type !== "PING" && event?.type !== "CONNECTED") {
      loadStats(true);
    }
  });

  // Quick leave action for Manager/Admin
  const handleQuickLeaveReview = async (leaveId: string, status: "APPROVED" | "REJECTED") => {
    setActionLoading(leaveId);
    try {
      const res = await fetch(`/api/leaves/${leaveId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewerComment: `Quick ${status.toLowerCase()} from Operations Dashboard`,
        }),
      });
      if (res.ok) {
        await loadStats();
      }
    } catch (err) {
      console.error("Failed to update leave:", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Loading EC HYBRID...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AppLayout
      title={`Welcome back, ${user.name.split(" ")[0]}!`}
      subtitle={`EC HYBRID Operations Dashboard • Role: ${user.role} • Dept: ${user.department}`}
    >
      {/* 1. Dynamic Role Welcome Banner (Gradient Banner & Text Retained; Buttons Removed for all roles) */}
      <div className="gradient-brand rounded-2xl p-4 sm:p-6 text-white shadow-lg mb-5 sm:mb-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-indigo-100 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>
              {user.role === "ADMIN" && "Executive Operations Console"}
              {user.role === "MANAGER" && `${user.department} Department Hub`}
              {user.role === "HR" && "People & Talent Operations"}
              {user.role === "EMPLOYEE" && "My Daily Workstation"}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-black tracking-tight leading-tight">
            {user.role === "ADMIN" && "Full Governance, Financial Health & Real-Time Org Telemetry"}
            {user.role === "MANAGER" && "Sprint Execution, Department Workload & Approvals"}
            {user.role === "HR" && "Workforce Headcount, Leave Pipeline & Payroll Disbursal"}
            {user.role === "EMPLOYEE" && "Personal Schedule, Active Tasks & Career Records"}
          </h2>

          <p className="text-xs md:text-sm text-indigo-100 mt-2 leading-relaxed">
            {user.role === "ADMIN" &&
              "Live overview of client billings, employee payroll obligations, active deliverables, and operational audit logs."}
            {user.role === "MANAGER" &&
              `Overseeing team members in ${user.department}. Review deliverable velocity and direct report leave requests.`}
            {user.role === "HR" &&
              "Manage talent directory, organization-wide leave requests, and accurate INR payroll structure configurations."}
            {user.role === "EMPLOYEE" &&
              "Track your assigned sprint tickets, calendar milestones, submitted leave balances, and monthly take-home salary."}
          </p>
        </div>

        {/* Decorative ambient circle glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Role-Specific Metric Cards (For Manager, HR, and Employee) */}
      {user.role !== "ADMIN" && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {user.role} Operational Telemetry
            </h3>
            <button
              onClick={() => { loadStats(false); }}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 font-medium transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Live Data</span>
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* MANAGER KPI CARDS */}
              {user.role === "MANAGER" && stats?.metrics && (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Department Team</span>
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">
                      {stats.metrics.teamEmployees}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Active staff in {user.department}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Active Projects</span>
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                        <FolderGit2 className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">
                      {stats.metrics.activeProjects}
                    </p>
                    <p className="text-[11px] text-indigo-600 font-medium mt-1">
                      Under active delivery
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Open Tasks</span>
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">
                      {stats.metrics.openTasks}
                    </p>
                    <p className="text-[11px] text-amber-600 font-medium mt-1">
                      Pending across sprints
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Leave Approvals</span>
                      <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">
                      {stats.metrics.pendingDepartmentLeaves}
                    </p>
                    <p className="text-[11px] text-rose-600 font-medium mt-1">
                      {stats.metrics.pendingDepartmentLeaves > 0
                        ? "Action required from you"
                        : "All requests reviewed"}
                    </p>
                  </div>
                </>
              )}

              {/* HR KPI CARDS */}
              {user.role === "HR" && stats?.metrics && (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Total Workforce</span>
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">
                      {stats.metrics.totalEmployees}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">
                      {stats.metrics.activeEmployees} active • {stats.metrics.inactiveEmployees} inactive
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Monthly Payroll</span>
                      <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                        <IndianRupee className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">
                      {formatINR(stats.metrics.monthlyPayroll)}
                    </p>
                    <p className="text-[11px] text-purple-600 font-medium mt-1">
                      Total net compensation line
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Average Compensation</span>
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">
                      {formatINR(stats.metrics.averageSalary)}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">
                      Per active employee / month
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Pending Leaves</span>
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">
                      {stats.metrics.pendingLeaves}
                    </p>
                    <p className="text-[11px] text-amber-600 font-medium mt-1">
                      Company-wide awaiting review
                    </p>
                  </div>
                </>
              )}

              {/* EMPLOYEE KPI CARDS */}
              {user.role === "EMPLOYEE" && stats?.metrics && (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">My Open Tasks</span>
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">
                      {stats.metrics.assignedTasks}
                    </p>
                    <p className="text-[11px] text-indigo-600 font-medium mt-1">
                      Assigned to your queue
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Completed Tasks</span>
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">
                      {stats.metrics.completedTasks}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">
                      Successfully finished
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Active Projects</span>
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <FolderGit2 className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">
                      {stats.metrics.activeProjects}
                    </p>
                    <p className="text-[11px] text-blue-600 font-medium mt-1">
                      Current team engagements
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Pending Leaves</span>
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">
                      {stats.metrics.pendingLeaves}
                    </p>
                    <p className="text-[11px] text-amber-600 font-medium mt-1">
                      Under manager approval
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. DYNAMIC ROLE-TAILORED CONTENT PANELS */}

      {/* ===================== ADMIN DASHBOARD: GRAPHICAL OVERHAUL ===================== */}
      {user.role === "ADMIN" && (
        <div className="space-y-6">
          {/* Refresh Action & Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Executive Telemetry & Graphical Analytics
            </h3>
            <button
              onClick={() => { loadStats(false); }}
              className="w-fit inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
              <span>Refresh Analytics</span>
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-72 bg-white rounded-2xl border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* ROW 1: TOTAL WORKFORCE CARD & TODAY'S TASKS VELOCITY GRAPH */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* 1. TOTAL NUMBER OF WORKFORCE CARD */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">Total Workforce Telemetry</h3>
                          <p className="text-[11px] text-slate-500">Corporate headcount & department distribution</p>
                        </div>
                      </div>
                      <Link
                        href="/employees"
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                      >
                        <span>Manage Staff</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Headcount Number & Active/Inactive Badges */}
                    <div className="flex items-baseline gap-3 mb-4">
                      <span className="text-4xl font-black text-slate-900 tracking-tight">
                        {stats?.workforce?.total ?? 0}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">Total Personnel</span>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {stats?.workforce?.active ?? 0} Active
                        </span>
                        {(stats?.workforce?.inactive ?? 0) > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {stats?.workforce?.inactive} Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Department Distribution Stacked Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 font-medium">
                        <span>Department Headcount Share</span>
                        <span>{stats?.workforce?.departments?.length || 0} Functional Units</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                        {stats?.workforce?.departments?.map((dept: any, idx: number) => {
                          const colors = ["bg-indigo-600", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500"];
                          const pct = stats.workforce.total > 0 ? (dept.count / stats.workforce.total) * 100 : 0;
                          return (
                            <div
                              key={dept.department}
                              style={{ width: `${pct}%` }}
                              className={`h-full ${colors[idx % colors.length]}`}
                              title={`${dept.department}: ${dept.count} members (${Math.round(pct)}%)`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Department Detail Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-100">
                    {stats?.workforce?.departments?.map((dept: any, idx: number) => {
                      const dotColors = ["bg-indigo-600", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500"];
                      return (
                        <div key={dept.department} className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${dotColors[idx % dotColors.length]}`} />
                            <span className="text-xs font-semibold text-slate-700 truncate">{dept.department}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-900">{dept.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. TODAY'S TASKS VELOCITY GRAPH (DAILY RESET) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                          <CheckSquare className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">Today's Workforce Task Velocity</h3>
                          <p className="text-[11px] text-slate-500">Live operational ticket distribution across all staff</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Resets Daily at Midnight</span>
                      </div>
                    </div>

                    {/* Sub-header showing date */}
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span>Sprint Date: <strong className="text-slate-800">{stats?.todayTasksData?.dateStr || "Today"}</strong></span>
                      <span>Total Active Tickets: <strong className="text-slate-900 font-bold">{stats?.todayTasksData?.total || 0}</strong></span>
                    </div>

                    {/* 5-Column Bar Histogram */}
                    {(() => {
                      const d = stats?.todayTasksData || { todo: 0, inProgress: 0, review: 0, completed: 0, notCompleted: 0 };
                      const maxVal = Math.max(d.todo, d.inProgress, d.review, d.completed, d.notCompleted, 1);
                      const cols = [
                        { label: "To Do", count: d.todo, color: "bg-slate-400", hoverColor: "hover:bg-slate-500", textCol: "text-slate-700" },
                        { label: "In Progress", count: d.inProgress, color: "bg-blue-500", hoverColor: "hover:bg-blue-600", textCol: "text-blue-700" },
                        { label: "In Review", count: d.review, color: "bg-amber-500", hoverColor: "hover:bg-amber-600", textCol: "text-amber-700" },
                        { label: "Completed", count: d.completed, color: "bg-emerald-500", hoverColor: "hover:bg-emerald-600", textCol: "text-emerald-700" },
                        { label: "Overdue", count: d.notCompleted, color: "bg-rose-500", hoverColor: "hover:bg-rose-600", textCol: "text-rose-700" },
                      ];

                      return (
                        <div className="grid grid-cols-5 gap-2.5 pt-2">
                          {cols.map((col) => {
                            const heightPct = Math.max(12, Math.round((col.count / maxVal) * 100));
                            return (
                              <div key={col.label} className="flex flex-col items-center">
                                <span className="text-xs font-bold text-slate-900 mb-1.5">{col.count}</span>
                                {/* Column Track */}
                                <div className="w-full h-32 bg-slate-100 rounded-xl flex flex-col justify-end p-1 overflow-hidden">
                                  <div
                                    style={{ height: `${heightPct}%` }}
                                    className={`w-full rounded-lg transition-all duration-500 ${col.color} ${col.hoverColor} shadow-2xs`}
                                    title={`${col.label}: ${col.count} tasks`}
                                  />
                                </div>
                                <span className={`text-[10px] font-bold text-center mt-2 ${col.textCol}`}>
                                  {col.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Bottom Info Ribbon */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Real-time completion tracking</span>
                    </span>
                    <Link href="/tasks" className="font-semibold text-indigo-600 hover:text-indigo-800">
                      Open Kanban &rarr;
                    </Link>
                  </div>
                </div>
              </div>

              {/* ROW 2: CLIENT COMPANIES SERVICE SHARE & ACTIVE PROJECTS COMPLETION */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* 3. CLIENT COMPANIES SERVICE SHARE (CIRCULAR SVG DONUT CHART) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <PieChart className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">Client Companies Service & Buying Share</h3>
                          <p className="text-[11px] text-slate-500">Revenue & contract volume distribution by client company</p>
                        </div>
                      </div>
                      <Link
                        href="/clients"
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                      >
                        <span>CRM Accounts</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Donut Chart and Legend */}
                    {(() => {
                      const items = stats?.clientServiceShare || [];
                      const totalRev = items.reduce((sum: number, it: any) => sum + it.revenue, 0);
                      const DONUT_COLORS = [
                        "#4F46E5", // Indigo
                        "#10B981", // Emerald
                        "#F59E0B", // Amber
                        "#EC4899", // Pink
                        "#8B5CF6", // Purple
                        "#06B6D4", // Cyan
                      ];

                      // SVG Donut Math: radius = 64, circumference = 2 * PI * 64 ≈ 402.12
                      const radius = 64;
                      const circumference = 2 * Math.PI * radius;
                      let accumulatedOffset = 0;

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                          {/* SVG Donut */}
                          <div className="sm:col-span-5 flex justify-center relative">
                            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                              {/* Background circle track */}
                              <circle
                                cx="80"
                                cy="80"
                                r={radius}
                                className="stroke-slate-100"
                                strokeWidth="18"
                                fill="transparent"
                              />
                              {items.map((item: any, idx: number) => {
                                const pct = totalRev > 0 ? item.revenue / totalRev : 0;
                                const strokeLength = pct * circumference;
                                const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
                                const strokeDashoffset = -accumulatedOffset;
                                accumulatedOffset += strokeLength;

                                return (
                                  <circle
                                    key={item.company}
                                    cx="80"
                                    cy="80"
                                    r={radius}
                                    stroke={DONUT_COLORS[idx % DONUT_COLORS.length]}
                                    strokeWidth="18"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    fill="transparent"
                                    className="transition-all duration-700 hover:opacity-85"
                                  />
                                );
                              })}
                            </svg>

                            {/* Center Cutout Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Share</span>
                              <span className="text-base font-black text-slate-900 leading-tight">
                                {items[0]?.sharePercentage || 0}%
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">{items[0]?.company?.slice(0, 10) || "Clients"}</span>
                            </div>
                          </div>

                          {/* Ranked Company Breakdown Table/List */}
                          <div className="sm:col-span-7 space-y-2">
                            {items.length > 0 ? (
                              items.map((item: any, idx: number) => (
                                <div
                                  key={item.company}
                                  className="p-2 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 transition-all flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                                    />
                                    <span className="font-bold text-slate-800 truncate" title={item.company}>
                                      {item.company}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2.5 shrink-0 text-right">
                                    <span className="font-bold text-slate-900">{formatINR(item.revenue, true)}</span>
                                    <span
                                      className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                                      style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                                    >
                                      {item.sharePercentage}%
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-center text-xs text-slate-400 py-4">No client invoice activity recorded yet.</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Ranked by cumulative service realizations & orders</span>
                    <span className="font-semibold text-slate-700">Top {stats?.clientServiceShare?.length || 0} Organizations</span>
                  </div>
                </div>

                {/* 4. ACTIVE PROJECTS COMPLETION RATES (HORIZONTAL PROGRESS MATRIX) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                          <FolderGit2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">Active Projects Completion Rates</h3>
                          <p className="text-[11px] text-slate-500">Live delivery milestone progress across contracted engagements</p>
                        </div>
                      </div>
                      <Link
                        href="/projects"
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                      >
                        <span>All Projects</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Project Horizon Progress Bars */}
                    <div className="space-y-3.5">
                      {stats?.projectsGraphData && stats.projectsGraphData.length > 0 ? (
                        stats.projectsGraphData.slice(0, 4).map((p: any, idx: number) => {
                          const gradients = [
                            "from-indigo-600 via-indigo-500 to-blue-500",
                            "from-emerald-600 via-emerald-500 to-teal-500",
                            "from-purple-600 via-purple-500 to-pink-500",
                            "from-amber-600 via-amber-500 to-orange-500",
                          ];
                          const badgeStyles =
                            p.progress >= 80
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : p.progress >= 40
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200";

                          return (
                            <div key={p.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 transition-all">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <h4 className="font-bold text-xs text-slate-900 truncate">{p.name}</h4>
                                  <span className="text-[10px] text-slate-500 bg-slate-200/60 px-1.5 py-0.2 rounded font-medium truncate">
                                    {p.clientName}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badgeStyles}`}>
                                  {p.progress}% Done
                                </span>
                              </div>

                              {/* Colorful Gradient Progress Bar */}
                              <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden mb-1.5 shadow-inner">
                                <div
                                  style={{ width: `${p.progress}%` }}
                                  className={`h-full bg-gradient-to-r ${gradients[idx % gradients.length]} rounded-full transition-all duration-700`}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                                <span>
                                  {p.completedTasks} of {p.totalTasks} tasks delivered
                                </span>
                                {p.budget > 0 && (
                                  <span className="font-bold text-slate-700">
                                    Budget: {formatINR(p.budget, true)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-center text-xs text-slate-400 py-6">No active client projects found.</p>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Calculated from sprint task ticket velocity</span>
                    <span className="font-semibold text-slate-700">{stats?.projectsGraphData?.length || 0} Projects Active</span>
                  </div>
                </div>
              </div>

              {/* ROW 3: REAL-TIME AUDIT TRAIL (FULL-WIDTH SYMMETRICAL CARD) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                      <Activity className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Real-Time System Audit Trail</h3>
                      <p className="text-[11px] text-slate-500">Live operational telemetry of administrative, client, and security events</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold border border-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Event Stream</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                    stats.recentActivities.map((log: any) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 transition-all text-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1.5">
                            <span className="font-bold text-slate-900">{log.user?.name || "System Event"}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(log.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                            {log.details || log.action}
                          </p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px]">
                          <span className="font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">
                            {log.action}
                          </span>
                          <span className="text-slate-400">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="col-span-3 text-center text-xs text-slate-400 py-6">No recent audit log entries.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================== MANAGER DASHBOARD ===================== */}
      {user.role === "MANAGER" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 2-Col: Sprint Progress & Task Status Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Velocity Distribution */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span>Sprint & Task Velocity Breakdown</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Current ticket distribution across all workflow columns
                  </p>
                </div>
                <Link
                  href="/tasks"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <span>Open Kanban Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    To Do
                  </span>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {stats?.taskBreakdown?.todo || 0}
                  </p>
                </div>
                <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    In Progress
                  </span>
                  <p className="text-2xl font-black text-blue-700 mt-1">
                    {stats?.taskBreakdown?.inProgress || 0}
                  </p>
                </div>
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    In Review
                  </span>
                  <p className="text-2xl font-black text-amber-700 mt-1">
                    {stats?.taskBreakdown?.review || 0}
                  </p>
                </div>
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Done
                  </span>
                  <p className="text-2xl font-black text-emerald-700 mt-1">
                    {stats?.taskBreakdown?.done || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Department Active Projects with Progress */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-indigo-600" />
                    <span>Active Projects & Milestone Progress</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Live delivery completion rates tracked against task deliverables
                  </p>
                </div>
                <Link
                  href="/projects"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <span>Manage Projects</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3.5">
                {stats?.managerProjects && stats.managerProjects.length > 0 ? (
                  stats.managerProjects.map((proj: any) => (
                    <div
                      key={proj.id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">{proj.name}</h4>
                          <span className="text-[11px] text-slate-500">
                            Client: {proj.clientName}
                          </span>
                        </div>
                        <span className="text-xs font-black text-indigo-600">
                          {proj.progress}% Done
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${proj.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                        <span>
                          {proj.completedTasks} of {proj.totalTasks} tasks completed
                        </span>
                        {proj.budget > 0 && (
                          <span className="font-semibold text-emerald-700">
                            Budget: {formatINR(proj.budget, true)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-slate-400 py-4">
                    No active projects assigned.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right 1-Col: Direct Reports' Pending Leaves & Team Roster */}
          <div className="space-y-6">
            {/* Quick Leave Approvals */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-600" />
                  <span>Direct Report Leave Approvals</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full border border-rose-200">
                  {stats?.pendingDepartmentLeavesList?.length || 0} Pending
                </span>
              </div>

              <div className="space-y-3">
                {stats?.pendingDepartmentLeavesList && stats.pendingDepartmentLeavesList.length > 0 ? (
                  stats.pendingDepartmentLeavesList.map((leave: any) => (
                    <div
                      key={leave.id}
                      className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">{leave.user?.name}</span>
                        <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                          {leave.leaveType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mb-1.5">
                        {formatDate(leave.startDate)} –{" "}
                        {formatDate(leave.endDate)}
                      </p>
                      {leave.reason && (
                        <p className="text-[11px] italic text-slate-500 mb-2.5">
                          "{leave.reason}"
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
                        <button
                          disabled={actionLoading === leave.id}
                          onClick={() => handleQuickLeaveReview(leave.id, "APPROVED")}
                          className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded transition-colors text-center disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoading === leave.id ? "Saving..." : "Approve"}
                        </button>
                        <button
                          disabled={actionLoading === leave.id}
                          onClick={() => handleQuickLeaveReview(leave.id, "REJECTED")}
                          className="flex-1 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded transition-colors text-center disabled:opacity-50 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                    <p className="font-medium text-slate-600">All clear!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No pending leave requests from {user.department}.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Department Team Roster */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>{user.department} Team Roster</span>
              </h3>

              <div className="divide-y divide-slate-100">
                {stats?.departmentMembers && stats.departmentMembers.length > 0 ? (
                  stats.departmentMembers.map((m: any) => (
                    <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{m.name}</div>
                        <div className="text-[11px] text-slate-400">{m.designation || "Staff"}</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {m.role}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-slate-400 py-3">No team members found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== HR DASHBOARD ===================== */}
      {user.role === "HR" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 2-Col: Workforce Distribution & Recent Joiners */}
          <div className="lg:col-span-2 space-y-6">
            {/* Department Headcounts */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <span>Workforce Distribution by Department</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Active headcount across operational business units
                  </p>
                </div>
                <Link
                  href="/employees"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <span>Manage Employees</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {stats?.departmentHeadcounts && stats.departmentHeadcounts.length > 0 ? (
                  stats.departmentHeadcounts.map((d: any) => (
                    <div
                      key={d.department}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60"
                    >
                      <span className="text-xs font-bold text-slate-800">{d.department}</span>
                      <p className="text-2xl font-black text-indigo-700 mt-1">{d.count}</p>
                      <span className="text-[10px] text-slate-400">Team members</span>
                    </div>
                  ))
                ) : (
                  <p className="col-span-3 text-center text-xs text-slate-400 py-4">
                    No department data.
                  </p>
                )}
              </div>
            </div>

            {/* Recent Joiners Staff Directory */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>Recent Employee Onboarding</span>
                </h3>
                <Link
                  href="/employees"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  View All Staff
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Employee</th>
                      <th className="py-2.5 px-4">Department & Role</th>
                      <th className="py-2.5 px-4">Joined Date</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats?.recentEmployees && stats.recentEmployees.length > 0 ? (
                      stats.recentEmployees.map((emp: any) => (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{emp.name}</div>
                            <div className="text-[11px] text-slate-400">{emp.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{emp.designation}</div>
                            <span className="text-[10px] text-indigo-600 font-semibold">
                              {emp.department}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {formatDate(emp.dateJoined)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                emp.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {emp.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                          No employee records.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right 1-Col: Org-Wide Leave Pipeline & Monthly Payroll Breakdown */}
          <div className="space-y-6">
            {/* Org-Wide Pending Leaves */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Pending Leave Pipeline</span>
                </h3>
                <Link
                  href="/leave"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Manage
                </Link>
              </div>

              <div className="space-y-3">
                {stats?.pendingLeavesList && stats.pendingLeavesList.length > 0 ? (
                  stats.pendingLeavesList.map((l: any) => (
                    <div
                      key={l.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{l.user?.name}</span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                          {l.leaveType}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {l.user?.department} • {l.user?.designation}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 font-medium">
                        {formatDate(l.startDate)} –{" "}
                        {formatDate(l.endDate)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-slate-400 py-4">
                    No pending leave applications.
                  </p>
                )}
              </div>
            </div>

            {/* Payroll Compensation Summary Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Payroll Disbursal Architecture
                </span>
                <IndianRupee className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-indigo-800/60">
                  <span className="text-indigo-200">Total Basic Pay</span>
                  <span className="font-bold">{formatINR(stats?.payrollSummary?.totalBasic || 0, true)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-indigo-800/60">
                  <span className="text-emerald-300">Total Allowances</span>
                  <span className="font-bold text-emerald-300">
                    +{formatINR(stats?.payrollSummary?.totalAllowances || 0, true)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-indigo-800/60">
                  <span className="text-rose-300">Total Deductions</span>
                  <span className="font-bold text-rose-300">
                    -{formatINR(stats?.payrollSummary?.totalDeductions || 0, true)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-black text-white">
                  <span>Net Disbursal</span>
                  <span className="text-emerald-400">
                    {formatINR(stats?.payrollSummary?.totalNet || 0, true)}
                  </span>
                </div>
              </div>

              <Link
                href="/payroll"
                className="mt-4 block w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-center font-bold text-xs rounded-lg transition-colors text-white"
              >
                Go to Payroll Management
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ===================== EMPLOYEE DASHBOARD ===================== */}
      {user.role === "EMPLOYEE" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 2-Col: Assigned Tasks & Projects */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Active Tasks Agenda */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span>My Assigned Work Agenda</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tasks scheduled for your execution across active projects
                  </p>
                </div>
                <Link
                  href="/tasks"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <span>Open Kanban Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-2.5">
                {stats?.myTasks && stats.myTasks.length > 0 ? (
                  stats.myTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-bold text-slate-900 truncate">{task.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Project: {task.project?.name || "General"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            task.priority === "HIGH" || task.priority === "URGENT"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {task.priority}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                    <p className="font-medium text-slate-700">All caught up!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No open tasks assigned to you right now.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* My Active Projects */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-indigo-600" />
                  <span>My Active Work Engagements</span>
                </h3>
                <Link
                  href="/projects"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  View Details
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats?.myProjects && stats.myProjects.length > 0 ? (
                  stats.myProjects.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/60"
                    >
                      <h4 className="font-bold text-xs text-slate-900">{p.name}</h4>
                      <div className="flex items-center justify-between mt-2 text-[10px]">
                        <span className="text-slate-500">{p.type} Engagement</span>
                        <span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="col-span-2 text-center text-xs text-slate-400 py-3">
                    No active projects linked yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right 1-Col: My Compensation & Leave Tracker */}
          <div className="space-y-6">
            {/* My Compensation Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>My Compensation Structure</span>
                </h3>
                <Link
                  href="/payroll"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Payslips
                </Link>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-3 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Monthly Net Take-Home (INR)
                </span>
                <p className="text-2xl font-black text-indigo-700 mt-1">
                  {formatINR(stats?.mySalary?.netSalary || 0, true)}
                </p>
                <span className="text-[10px] text-emerald-600 font-medium">
                  Direct Bank Remittance
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>Basic Pay</span>
                  <span className="font-semibold text-slate-800">
                    {formatINR(stats?.mySalary?.basicPay || 0, true)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span className="text-emerald-600">Allowances</span>
                  <span className="font-semibold text-emerald-600">
                    +{formatINR(stats?.mySalary?.allowances || 0, true)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-slate-600">
                  <span className="text-rose-600">Deductions (PF / Tax)</span>
                  <span className="font-semibold text-rose-600">
                    -{formatINR(stats?.mySalary?.deductions || 0, true)}
                  </span>
                </div>
              </div>
            </div>

            {/* My Leave Tracker */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>My Leave History</span>
                </h3>
                <Link
                  href="/leave"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Apply
                </Link>
              </div>

              <div className="space-y-2.5">
                {stats?.myRecentLeaves && stats.myRecentLeaves.length > 0 ? (
                  stats.myRecentLeaves.map((l: any) => (
                    <div
                      key={l.id}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{l.leaveType} Leave</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            l.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : l.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {l.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {formatDate(l.startDate)} –{" "}
                        {formatDate(l.endDate)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-slate-400 py-3">No leaves applied yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
