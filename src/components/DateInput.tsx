"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calendar } from "lucide-react";

interface DateInputProps {
  value: string; // Accepts "YYYY-MM-DD", "DD-MM-YYYY", or ISO string
  onChange: (value: string) => void; // Emits "YYYY-MM-DD" for backend compatibility
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

// Convert "YYYY-MM-DD" or ISO string to display "DD-MM-YYYY"
function toDisplayDDMMYYYY(val: string): string {
  if (!val) return "";
  // If already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    const parts = val.slice(0, 10).split("-");
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  // Try parsing Date
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return val;
}

// Convert display "DD-MM-YYYY" to backend "YYYY-MM-DD"
function toBackendYYYYMMDD(displayVal: string): string {
  if (!displayVal) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(displayVal)) {
    const [d, m, y] = displayVal.split("-");
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(displayVal)) {
    return displayVal;
  }
  return displayVal;
}

export function DateInput({
  value,
  onChange,
  placeholder = "DD-MM-YYYY",
  required = false,
  disabled = false,
  className = "",
  id,
}: DateInputProps) {
  const [displayText, setDisplayText] = useState<string>(toDisplayDDMMYYYY(value));
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayText(toDisplayDDMMYYYY(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d-]/g, "");

    // Auto-dash formatting as user types digits: DD -> DD- -> DD-MM -> DD-MM-YYYY
    const digitsOnly = raw.replace(/-/g, "");
    let formatted = "";
    if (digitsOnly.length > 0) {
      formatted = digitsOnly.slice(0, 2);
      if (digitsOnly.length > 2) {
        formatted += `-${digitsOnly.slice(2, 4)}`;
      }
      if (digitsOnly.length > 4) {
        formatted += `-${digitsOnly.slice(4, 8)}`;
      }
    } else {
      formatted = raw;
    }

    setDisplayText(formatted);

    // If complete DD-MM-YYYY, emit YYYY-MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(formatted)) {
      const [d, m, y] = formatted.split("-");
      const dayNum = parseInt(d, 10);
      const monthNum = parseInt(m, 10);
      const yearNum = parseInt(y, 10);
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900) {
        onChange(`${y}-${m}-${d}`);
      }
    } else if (formatted === "") {
      onChange("");
    }
  };

  const handleCalendarPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickerVal = e.target.value; // "YYYY-MM-DD"
    if (pickerVal) {
      const formatted = toDisplayDDMMYYYY(pickerVal);
      setDisplayText(formatted);
      onChange(pickerVal);
    }
  };

  const openCalendar = () => {
    if (hiddenDateRef.current) {
      if (typeof hiddenDateRef.current.showPicker === "function") {
        hiddenDateRef.current.showPicker();
      } else {
        hiddenDateRef.current.focus();
      }
    }
  };

  // Convert current value to YYYY-MM-DD for the hidden picker
  const pickerValue = toBackendYYYYMMDD(displayText) || (value ? value.slice(0, 10) : "");

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <input
        id={id}
        type="text"
        value={displayText}
        onChange={handleTextChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={10}
        className="w-full px-3 py-1.5 pr-9 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
      />

      {/* Calendar icon button */}
      <button
        type="button"
        onClick={openCalendar}
        disabled={disabled}
        tabIndex={-1}
        className="absolute right-2.5 p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer disabled:opacity-40"
        title="Open calendar picker"
      >
        <Calendar className="w-3.5 h-3.5" />
      </button>

      {/* Invisible HTML5 date picker that handles date selection smoothly */}
      <input
        ref={hiddenDateRef}
        type="date"
        value={pickerValue}
        onChange={handleCalendarPickerChange}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute opacity-0 pointer-events-none w-0 h-0 right-0 top-0"
      />
    </div>
  );
}
