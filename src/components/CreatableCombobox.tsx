"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Check } from "lucide-react";

interface CreatableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
  className?: string;
  id?: string;
}

export function CreatableCombobox({
  value,
  onChange,
  options,
  placeholder = "Select or type...",
  allowCustom = true,
  className = "",
  id,
}: CreatableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

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

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase().trim())
  );

  const exactMatchExists = options.some(
    (opt) => opt.toLowerCase().trim() === query.toLowerCase().trim()
  );

  const handleSelect = (selected: string) => {
    setQuery(selected);
    onChange(selected);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full px-3 py-1.5 pr-8 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
        />
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          tabIndex={-1}
          className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
          {filteredOptions.length > 0 ? (
            <div className="py-1">
              {filteredOptions.map((opt) => {
                const isSelected = opt.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-2 text-slate-400 text-center italic text-[11px]">
              No matching options found
            </div>
          )}

          {allowCustom && query.trim() && !exactMatchExists && (
            <div className="p-1 bg-slate-50/70 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleSelect(query.trim())}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Add &ldquo;{query.trim()}&rdquo; as new option</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
