"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderGit2,
  CheckSquare,
  Calendar,
  Clock,
  IndianRupee,
  BarChart3,
  Share2,
  CreditCard,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  show: boolean;
  badge?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  // Determine allowed links based on role
  const isHR = user.role === "HR";
  const isEmployee = user.role === "EMPLOYEE";
  const isManager = user.role === "MANAGER";
  const isAdmin = user.role === "ADMIN";

  const navigation: NavItem[] = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      show: true,
    },
    {
      name: isEmployee ? "My Profile" : "Employees (HR)",
      href: "/employees",
      icon: Users,
      show: true, // Everyone has an employee view (filtered server-side)
    },
    {
      name: "Clients (CRM)",
      href: "/clients",
      icon: Building2,
      // HR has NO access to client/project data per Section 2
      show: !isHR,
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderGit2,
      show: !isHR,
    },
    {
      name: "Tasks & Planner",
      href: "/tasks",
      icon: CheckSquare,
      show: !isHR,
    },
    {
      name: "Calendar",
      href: "/calendar",
      icon: Calendar,
      show: true,
    },
    {
      name: "Leave Requests",
      href: "/leave",
      icon: Clock,
      show: true,
    },
    {
      name: (isEmployee || isManager) ? "My Payslips" : "Salary & Payroll",
      href: "/payroll",
      icon: IndianRupee,
      show: true,
    },
    {
      name: "Invoices & Billing",
      href: "/invoices",
      icon: CreditCard,
      show: !isHR,
    },
    {
      name: "Reports & Profit",
      href: "/reports",
      icon: BarChart3,
      // Restricted to Admin and HR per Section 3.9
      show: isAdmin || isHR,
    },
    {
      name: "Social Media",
      href: "/social",
      icon: Share2,
      show: true,
    },
    {
      name: "Org Settings",
      href: "/settings",
      icon: Settings,
      show: isAdmin,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 select-none shadow-sm overflow-hidden">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200 gap-3">
        <div className="relative w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center p-0.5 bg-slate-100 shadow-sm border border-slate-200">
          <Image
            src="/logo.png"
            alt="EC HYBRID Logo"
            width={32}
            height={32}
            className="object-contain"
            priority
          />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base tracking-tight text-slate-900 leading-tight">
            EC HYBRID
          </span>
          <span className="text-[11px] font-medium text-slate-500">
            Operations Platform
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Main Navigation
        </div>
        {navigation
          .filter((item) => item.show)
          .map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-indigo-600" : "text-slate-400"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-normal">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-700 to-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>{user.role}</span>
            </div>
            <button
              onClick={() => logout()}
              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
