"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { RoleBadge } from "./RoleBadge";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Activity, ShieldCheck, Menu } from "lucide-react";

export function Navbar({
  title,
  subtitle,
  onOpenMobileMenu,
}: {
  title: string;
  subtitle?: string;
  onOpenMobileMenu?: () => void;
}) {
  const { user } = useAuth();
  const { isConnected } = useRealtimeSync();

  if (!user) return null;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 select-none shadow-xs">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
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
        {/* Real-Time Live Sync Status Indicator (100% Free Native SSE) */}
        <div
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
            isConnected
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
          title={isConnected ? "Real-time SSE event stream connected" : "Connecting to real-time sync stream..."}
        >
          <span className="relative flex h-2 w-2">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
          <span className="hidden md:inline font-medium">
            {isConnected ? "Live Sync Active" : "Connecting..."}
          </span>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 hidden xs:block" />

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
      </div>
    </header>
  );
}
