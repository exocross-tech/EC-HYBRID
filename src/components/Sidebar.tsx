"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { RoleBadge } from "./RoleBadge";
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
  X,
  Box,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  show: boolean;
  color: string;
  badge?: string;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  desktopCollapsed?: boolean;
}

export function Sidebar({
  mobileOpen = false,
  onCloseMobile,
  desktopCollapsed = false,
}: SidebarProps) {
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
      color: "text-sky-500",
    },
    {
      name: isEmployee ? "My Profile" : "Employees (HR)",
      href: "/employees",
      icon: Users,
      show: true, // Everyone has an employee view (filtered server-side)
      color: "text-rose-500",
    },
    {
      name: "Clients (CRM)",
      href: "/clients",
      icon: Building2,
      // HR has NO access to client/project data per Section 2
      show: !isHR,
      color: "text-emerald-500",
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderGit2,
      show: !isHR,
      color: "text-indigo-500",
    },
    {
      name: "Products",
      href: "/products",
      icon: Box,
      show: !isHR,
      color: "text-amber-500",
    },
    {
      name: "Tasks & Planner",
      href: "/tasks",
      icon: CheckSquare,
      show: !isHR,
      color: "text-blue-500",
    },
    {
      name: "Calendar",
      href: "/calendar",
      icon: Calendar,
      show: true,
      color: "text-purple-500",
    },
    {
      name: "Leave Requests",
      href: "/leave",
      icon: Clock,
      show: true,
      color: "text-orange-500",
    },
    {
      name: (isEmployee || isManager) ? "My Payslips" : "Salary & Payroll",
      href: "/payroll",
      icon: IndianRupee,
      show: true,
      color: "text-teal-500",
    },
    {
      name: "Invoices & Billing",
      href: "/invoices",
      icon: CreditCard,
      show: !isHR,
      color: "text-violet-500",
    },
    {
      name: "Reports & Profit",
      href: "/reports",
      icon: BarChart3,
      // Restricted to Admin and HR per Section 3.9
      show: isAdmin || isHR,
      color: "text-pink-500",
    },
    {
      name: "Social Media",
      href: "/social",
      icon: Share2,
      show: true,
      color: "text-cyan-500",
    },
    {
      name: "Org Settings",
      href: "/settings",
      icon: Settings,
      show: isAdmin,
      color: "text-slate-500",
    },
  ];

  const renderNavLinks = () => (
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
              onClick={() => onCloseMobile?.()}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${item.color} ${
                    isActive ? "scale-110 drop-shadow-xs" : "opacity-80 group-hover:opacity-100"
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
  );

  const renderMobileFooter = () => (
    <div className="p-3 border-t border-slate-200 bg-slate-50/50">
      <button
        onClick={() => {
          onCloseMobile?.();
          logout();
        }}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-white rounded-lg border border-slate-200 transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </button>
    </div>
  );

  return (
    <>
      {/* 1. Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* 2. Mobile Off-Canvas Drawer (< lg) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col h-full shadow-2xl select-none overflow-hidden transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-3">
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
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900 leading-tight">
                  EC HYBRID
                </span>
                <RoleBadge role={user.role} />
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                Operations Platform
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {renderNavLinks()}
        {renderMobileFooter()}
      </aside>

      {/* 3. Desktop Persistent Sidebar (>= lg) */}
      <aside
        className={`hidden lg:flex bg-white border-slate-200 flex-col h-screen shrink-0 select-none shadow-sm overflow-hidden transition-all duration-300 ease-in-out ${
          desktopCollapsed
            ? "w-0 opacity-0 border-r-0 pointer-events-none"
            : "w-64 opacity-100 border-r"
        }`}
      >
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
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900 leading-tight">
                EC HYBRID
              </span>
              <RoleBadge role={user.role} />
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Operations Platform
            </span>
          </div>
        </div>

        {renderNavLinks()}
      </aside>
    </>
  );
}
