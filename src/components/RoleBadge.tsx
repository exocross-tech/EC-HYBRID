import React from "react";

export function RoleBadge({ role }: { role: string }) {
  const getBadgeStyle = () => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "MANAGER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "HR":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "EMPLOYEE":
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle()}`}
    >
      {role}
    </span>
  );
}
