"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  FolderGit2,
  CheckSquare,
  BarChart3,
  Calendar,
  Clock,
  IndianRupee,
  CreditCard,
  Menu,
} from "lucide-react";

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const role = user.role;

  // Determine top 4 destinations based on user's role
  const getNavItems = () => {
    switch (role) {
      case "ADMIN":
        return [
          { name: "Dashboard", href: "/", icon: LayoutDashboard },
          { name: "Employees", href: "/employees", icon: Users },
          { name: "Tasks", href: "/tasks", icon: CheckSquare },
          { name: "Reports", href: "/reports", icon: BarChart3 },
        ];
      case "MANAGER":
        return [
          { name: "Dashboard", href: "/", icon: LayoutDashboard },
          { name: "Projects", href: "/projects", icon: FolderGit2 },
          { name: "Tasks", href: "/tasks", icon: CheckSquare },
          { name: "Calendar", href: "/calendar", icon: Calendar },
        ];
      case "HR":
        return [
          { name: "Dashboard", href: "/", icon: LayoutDashboard },
          { name: "Employees", href: "/employees", icon: Users },
          { name: "Leave", href: "/leave", icon: Clock },
          { name: "Payroll", href: "/payroll", icon: IndianRupee },
        ];
      case "EMPLOYEE":
      default:
        return [
          { name: "Home", href: "/", icon: LayoutDashboard },
          { name: "Tasks", href: "/tasks", icon: CheckSquare },
          { name: "Calendar", href: "/calendar", icon: Calendar },
          { name: "Leave", href: "/leave", icon: Clock },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-xs safe-area-bottom select-none"
    >
      <div className="grid grid-cols-5 h-15 items-center px-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center h-full py-1 text-center transition-all min-h-[44px] min-w-[44px] relative active:scale-95 ${
                isActive
                  ? "text-indigo-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <div
                className={`flex items-center justify-center p-1 rounded-lg transition-colors ${
                  isActive ? "text-indigo-600" : "text-slate-500"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.2]" : "stroke-[1.6]"}`} />
              </div>
              <span className={`text-[10px] tracking-tight truncate max-w-[64px] ${isActive ? "font-bold text-indigo-700" : "font-medium"}`}>
                {item.name}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-indigo-600 absolute bottom-1" />
              )}
            </Link>
          );
        })}

        {/* More/Menu Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center h-full py-1 text-center text-slate-500 hover:text-slate-800 transition-all min-h-[44px] min-w-[44px] cursor-pointer active:scale-95"
          aria-label="Open complete menu"
        >
          <div className="p-1 rounded-lg transition-colors">
            <Menu className="w-5 h-5 stroke-[1.6]" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
}
export default MobileBottomNav;
