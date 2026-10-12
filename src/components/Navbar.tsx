"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { RoleBadge } from "./RoleBadge";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Menu, LogOut, User as UserIcon, X, ChevronRight, ShieldCheck, Mail, Briefcase } from "lucide-react";

export function Navbar({
  title,
  subtitle,
  onOpenMobileMenu,
  desktopCollapsed = false,
  onToggleDesktopCollapse,
}: {
  title: string;
  subtitle?: string;
  onOpenMobileMenu?: () => void;
  desktopCollapsed?: boolean;
  onToggleDesktopCollapse?: () => void;
}) {
  const { user, logout } = useAuth();
  const [showProfileSheet, setShowProfileSheet] = useState(false);

  if (!user) return null;

  return (
    <>
      <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 select-none shadow-xs safe-area-top">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
          {/* Mobile drawer toggle */}
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Mobile brand icon indicator */}
          <div className="lg:hidden flex items-center shrink-0">
            <Image
              src="/logo.png"
              alt="Logo"
              width={26}
              height={26}
              className="object-contain"
            />
          </div>

          {/* Desktop collapsible sidebar toggle button */}
          {onToggleDesktopCollapse && (
            <button
              type="button"
              onClick={onToggleDesktopCollapse}
              className="hidden lg:flex p-1.5 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              aria-label="Toggle sidebar"
              title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar into full view"}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="min-w-0 ml-1 sm:ml-1.5">
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

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Mobile User Avatar (Tap opens Profile Sheet) */}
          <button
            type="button"
            onClick={() => setShowProfileSheet(true)}
            className="lg:hidden flex items-center justify-center p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
            aria-label="Open profile options"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          {/* Desktop User Quick Identity Pill */}
          <div className="hidden lg:flex items-center gap-2 pl-1">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                {user.name}
              </p>
              <p className="text-[10px] text-slate-500 truncate max-w-[130px]">
                {user.designation || user.department}
              </p>
            </div>
          </div>

          {/* Desktop Sign Out Button */}
          <button
            onClick={logout}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile User Profile Bottom Sheet */}
      {showProfileSheet && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowProfileSheet(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-5 safe-area-bottom max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Drag Handle */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {user.name}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{user.email}</span>
                  </p>
                  <div className="mt-1.5">
                    <RoleBadge role={user.role} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowProfileSheet(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Close profile menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Department info */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4 flex items-center gap-2.5 text-xs text-slate-600">
              <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Department: <strong className="text-slate-800">{user.department}</strong>
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowProfileSheet(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-sm rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
