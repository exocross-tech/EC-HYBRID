"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { RoleBadge } from "./RoleBadge";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Activity, ShieldCheck, Menu, LogOut } from "lucide-react";

export function Navbar({
  title,
  subtitle,
  onOpenMobileMenu,
}: {
  title: string;
  subtitle?: string;
  onOpenMobileMenu?: () => void;
}) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 select-none shadow-xs">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Authenticated User Role Badge */}
        <RoleBadge role={user.role} />

        {/* User Quick Identity Pill (Desktop Only) */}
        <div className="hidden lg:flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
              {user.name}
            </p>
            <p className="text-[10px] text-slate-500 truncate max-w-[130px]">
              {user.designation || user.department}
            </p>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
