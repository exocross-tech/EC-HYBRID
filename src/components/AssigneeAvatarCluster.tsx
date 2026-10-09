"use client";

import React from "react";
import { User } from "lucide-react";

interface Assignee {
  id: string;
  name: string;
  email?: string;
  department?: string;
}

interface AssigneeAvatarClusterProps {
  assignees?: Assignee[];
  fallbackUser?: Assignee | null;
  maxDisplay?: number;
  size?: "xs" | "sm" | "md";
  showName?: boolean;
}

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
];

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function AssigneeAvatarCluster({
  assignees = [],
  fallbackUser,
  maxDisplay = 3,
  size = "sm",
  showName = false,
}: AssigneeAvatarClusterProps) {
  const users: Assignee[] =
    assignees && assignees.length > 0
      ? assignees
      : fallbackUser
      ? [fallbackUser]
      : [];

  if (users.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
        <User className="w-3 h-3" />
        <span>Unassigned</span>
      </span>
    );
  }

  const sizeClasses = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-6 h-6 text-[10px]",
    md: "w-7 h-7 text-xs",
  }[size];

  const allNames = users.map((u) => u.name).join(", ");

  // If single user and showName is requested
  if (users.length === 1 && showName) {
    const user = users[0];
    return (
      <div className="inline-flex items-center gap-1.5" title={user.name}>
        <div
          className={`${sizeClasses} rounded-full font-bold flex items-center justify-center border shrink-0 ${getColor(
            user.name
          )}`}
        >
          {getInitials(user.name)}
        </div>
        <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">
          {user.name}
        </span>
      </div>
    );
  }

  const displayed = users.slice(0, maxDisplay);
  const remaining = users.length - maxDisplay;

  return (
    <div className="inline-flex items-center -space-x-1.5 overflow-hidden" title={`Assigned to: ${allNames}`}>
      {displayed.map((u, i) => (
        <div
          key={u.id || i}
          className={`${sizeClasses} rounded-full font-bold flex items-center justify-center border-2 border-white shadow-xs shrink-0 cursor-default hover:z-10 hover:scale-105 transition-transform ${getColor(
            u.name
          )}`}
          title={`${u.name} ${i === 0 && users.length > 1 ? "(Lead)" : ""}`}
        >
          {getInitials(u.name)}
        </div>
      ))}

      {remaining > 0 && (
        <div
          className={`${sizeClasses} rounded-full font-bold flex items-center justify-center border-2 border-white bg-slate-100 text-slate-600 shadow-xs shrink-0 hover:z-10 hover:bg-slate-200 transition-colors`}
          title={`+${remaining} more: ${users
            .slice(maxDisplay)
            .map((u) => u.name)
            .join(", ")}`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
export default AssigneeAvatarCluster;
