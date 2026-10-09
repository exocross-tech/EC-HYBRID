"use client";

import React, { useState, useRef, useEffect } from "react";
import { User, Check, X, Search, ChevronDown, Users, Star } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  department?: string;
  email?: string;
}

interface MultiAssigneeSelectProps {
  employees: Employee[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
}

export function MultiAssigneeSelect({
  employees,
  selectedIds,
  onChange,
  placeholder = "Select one or more assignees...",
}: MultiAssigneeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedUsers = employees.filter((e) => selectedIds.includes(e.id));

  const filteredEmployees = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      (e.department && e.department.toLowerCase().includes(q))
    );
  });

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(employees.map((e) => e.id));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Area with Selected Chips */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[38px] w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer hover:border-slate-300 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20 transition-all flex flex-wrap items-center gap-1.5"
      >
        {selectedUsers.length === 0 ? (
          <span className="text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{placeholder}</span>
          </span>
        ) : (
          selectedUsers.map((user, idx) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 font-medium text-[11px] shadow-xs animate-in fade-in duration-100"
            >
              {idx === 0 && selectedUsers.length > 1 && (
                <span title="Primary / Lead Assignee" className="inline-flex shrink-0">
                  <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                </span>
              )}
              <span className="truncate max-w-[110px]">{user.name}</span>
              <button
                type="button"
                onClick={(e) => handleRemove(user.id, e)}
                className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                title={`Remove ${user.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}

        <div className="ml-auto flex items-center gap-1 text-slate-400 pl-1 shrink-0">
          {selectedUsers.length > 0 && (
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-full font-semibold">
              {selectedUsers.length}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-150">
          {/* Search Bar & Quick Actions */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 space-y-1.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search team member..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
              <button
                type="button"
                onClick={handleSelectAll}
                className="hover:text-indigo-600 font-medium transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="hover:text-rose-600 font-medium transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Member Options List */}
          <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-50 text-xs">
            {filteredEmployees.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">No team members match "{search}"</div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = selectedIds.includes(emp.id);
                const isLead = isSelected && selectedIds[0] === emp.id && selectedIds.length > 1;

                return (
                  <div
                    key={emp.id}
                    onClick={() => handleToggle(emp.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-indigo-50/80 text-indigo-900 font-medium"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{emp.name}</span>
                          {isLead && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded flex items-center gap-0.5">
                              <Star className="w-2 h-2 fill-amber-500 text-amber-500" />
                              Lead
                            </span>
                          )}
                        </div>
                        {emp.department && (
                          <span className="text-[10px] text-slate-400 block truncate">
                            {emp.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default MultiAssigneeSelect;
