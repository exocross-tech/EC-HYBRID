"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { RoleBadge } from "@/components/RoleBadge";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/formatDate";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Phone,
  Mail,
  Building,
  Edit2,
  Trash2,
  Eye,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Camera,
  Calendar,
  Briefcase,
  User,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  designation: string;
  department: string;
  dateJoined: string;
  status: "ACTIVE" | "RESTRICTED" | "INACTIVE";
  role: string;
  avatarUrl?: string | null;
  _count?: {
    assignedTasks: number;
    leaves: number;
  };
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [confirmDeleteEmployee, setConfirmDeleteEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    designation: "",
    department: "Engineering",
    role: "EMPLOYEE",
    avatarUrl: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    designation: "",
    department: "",
    role: "",
    status: "ACTIVE",
    password: "",
    avatarUrl: "",
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Auto-dismiss success notification after 3 seconds
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => {
        setActionSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  const isAdmin = user?.role === "ADMIN";
  const isAdminOrHR = user?.role === "ADMIN" || user?.role === "HR";
  const isManager = user?.role === "MANAGER";
  const isEmployee = user?.role === "EMPLOYEE";

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (departmentFilter) params.set("department", departmentFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/employees?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Fetch employees error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, departmentFilter, statusFilter, user?.role]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccess(`Employee ${formData.name} successfully registered.`);
        setIsAddModalOpen(false);
        setFormData({
          name: "",
          email: "",
          password: "",
          phone: "",
          designation: "",
          department: "Engineering",
          role: "EMPLOYEE",
          avatarUrl: "",
        });
        fetchEmployees();
      } else {
        setActionError(data.error || "Failed to create employee");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditFormData({
      name: emp.name,
      phone: emp.phone || "",
      designation: emp.designation,
      department: emp.department,
      role: emp.role,
      status: emp.status,
      password: "",
      avatarUrl: emp.avatarUrl || "",
    });
    setActionError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();

      if (res.ok) {
        setActionSuccess(`Employee ${editingEmployee.name} updated successfully.`);
        setIsEditModalOpen(false);
        fetchEmployees();
      } else {
        setActionError(data.error || "Failed to update employee");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRestrict = async (emp: Employee) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    const isRestricting = emp.status !== "RESTRICTED";
    const actionLabel = isRestricting ? "RESTRICT" : "UNRESTRICT";

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionLabel }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(
          isRestricting
            ? `Access restricted for ${emp.name}. Any active session is terminated.`
            : `System access restored for ${emp.name}.`
        );
        fetchEmployees();
      } else {
        setActionError(data.error || "Failed to update access status");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmDeleteEmployee || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/employees/${confirmDeleteEmployee.id}?permanent=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(data.message || `Permanently deleted employee ${confirmDeleteEmployee.name}.`);
        setConfirmDeleteEmployee(null);
        fetchEmployees();
      } else {
        setActionError(data.error || "Permanent delete failed");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout
      title={isEmployee ? "My Profile & Employment Details" : "Employee Management (HR)"}
      subtitle={
        isEmployee
          ? "View and update your personal employee records"
          : isManager
          ? `View-only directory for your department (${user?.department})`
          : "Full employee lifecycle: profile directory, access restriction, and safe record management"
      }
    >
      {/* Floating Success Toast (Compact, Non-Intrusive, 3s Auto-dismiss) */}
      {actionSuccess && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-auto animate-in fade-in slide-in-from-top-4 duration-200 shadow-2xl rounded-2xl bg-white border border-emerald-200 p-3.5 flex items-center gap-3 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-800 pr-2">{actionSuccess}</p>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative w-full sm:flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Department Filter (Admin & HR only) */}
          {isAdminOrHR && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">All Departments</option>
              <option value="Executive">Executive</option>
              <option value="Engineering">Engineering</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Sales">Sales</option>
              <option value="Operations">Operations</option>
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Staff</option>
            <option value="RESTRICTED">Restricted Access</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Add Employee Button (Admin & HR only) */}
        {isAdminOrHR && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 gradient-brand text-white font-medium text-xs rounded-lg hover:opacity-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      {/* Employee List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading employee records...
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No employees found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[760px]">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Role & Status</th>
                  <th className="py-3 px-4">Department & Title</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Employee Name & Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {emp.avatarUrl ? (
                          <img
                            src={emp.avatarUrl}
                            alt={emp.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-700 to-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {emp.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{emp.name}</p>
                          <p className="text-[11px] text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role & Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <RoleBadge role={emp.role} />
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            emp.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : emp.status === "RESTRICTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200 line-through"
                          }`}
                        >
                          {emp.status === "RESTRICTED" ? "ACCESS RESTRICTED" : emp.status}
                        </span>
                      </div>
                    </td>

                    {/* Department & Title */}
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800">{emp.designation}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400" />
                        {emp.department}
                      </p>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className="text-slate-600 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{emp.email}</span>
                        </p>
                        {emp.phone && (
                          <p className="text-slate-500 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{emp.phone}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Joined Date (Standardized DD-MM-YYYY) */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {formatDate(emp.dateJoined)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* 1. View Button (Eye icon) */}
                        <button
                          onClick={() => setViewingEmployee(emp)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                          title="View Employee Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Executive Protection */}
                        {user?.role === "HR" && emp.role === "ADMIN" ? (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Executive Protected
                          </span>
                        ) : (
                          <>
                            {/* 2. Edit Button */}
                            {(isAdmin || (user?.role === "HR" && emp.role !== "ADMIN") || user?.id === emp.id) && (
                              <button
                                onClick={() => handleOpenEdit(emp)}
                                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Edit Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* 3. Restrict Access Button */}
                            {(isAdmin || (user?.role === "HR" && emp.role !== "ADMIN")) && emp.id !== user?.id && (
                              <button
                                onClick={() => handleToggleRestrict(emp)}
                                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                  emp.status === "RESTRICTED"
                                    ? "hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700"
                                    : "hover:bg-amber-50 text-amber-600 hover:text-amber-700"
                                }`}
                                title={emp.status === "RESTRICTED" ? "Restore Access" : "Restrict Access (Revoke Login)"}
                              >
                                {emp.status === "RESTRICTED" ? (
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                ) : (
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* 4. Permanent Delete Button */}
                            {isAdmin && emp.id !== user?.id && (
                              <button
                                onClick={() => setConfirmDeleteEmployee(emp)}
                                className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Permanent Delete (Cascade Purge)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}

                        {isManager && (
                          <span className="text-[11px] text-slate-400 italic">View Only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: View Employee Details (Requirement 2) */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {viewingEmployee.avatarUrl ? (
                  <img
                    src={viewingEmployee.avatarUrl}
                    alt={viewingEmployee.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-400 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
                    {viewingEmployee.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-base">{viewingEmployee.name}</h3>
                  <p className="text-xs text-indigo-300">{viewingEmployee.email}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingEmployee(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="flex items-center gap-2">
                <RoleBadge role={viewingEmployee.role} />
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    viewingEmployee.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : viewingEmployee.status === "RESTRICTED"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}
                >
                  {viewingEmployee.status === "RESTRICTED" ? "ACCESS RESTRICTED" : viewingEmployee.status}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 grid grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Designation</span>
                  <p className="font-bold text-slate-900 mt-0.5">{viewingEmployee.designation}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Department</span>
                  <p className="font-bold text-slate-900 mt-0.5">{viewingEmployee.department}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Phone</span>
                  <p className="font-medium text-slate-800 mt-0.5">{viewingEmployee.phone || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date Joined</span>
                  <p className="font-medium text-slate-800 mt-0.5">{formatDate(viewingEmployee.dateJoined)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                  <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-[11px]">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Assigned Tasks</span>
                  </div>
                  <p className="text-xl font-bold text-indigo-950 mt-1">
                    {viewingEmployee._count?.assignedTasks || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                  <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-[11px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Leave Requests</span>
                  </div>
                  <p className="text-xl font-bold text-blue-950 mt-1">
                    {viewingEmployee._count?.leaves || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setViewingEmployee(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Permanent Cascading Delete Confirmation (Requirement 10) */}
      {confirmDeleteEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-200 shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Permanently Delete Employee?</h3>
                <p className="text-xs text-slate-500">{confirmDeleteEmployee.name} ({confirmDeleteEmployee.email})</p>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1.5">
              <p className="font-semibold">This action cannot be undone.</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-700">
                <li>Permanently deletes this employee&apos;s salary records, payslips, leaves, and notifications.</li>
                <li>Safely unassigns their tasks without deleting shared project workflows.</li>
                <li>Projects and client accounts will be fully preserved.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmDeleteEmployee(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePermanentDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging Records...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Employee (Requirement 1 - Photo Field included) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                Add New Employee Account
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Photo Upload Field (Requirement 1) */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-300 flex items-center justify-center shrink-0">
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block font-semibold text-slate-700 mb-1">Employee Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({ ...formData, avatarUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
                {formData.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, avatarUrl: "" })}
                    className="text-xs text-rose-600 hover:text-rose-800 cursor-pointer font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Jordan Lee"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jlee@echybrid.com"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Systems Engineer"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Executive">Executive</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="EMPLOYEE">EMPLOYEE (Standard Staff)</option>
                  <option value="MANAGER">MANAGER (Team Overseer)</option>
                  <option value="HR">HR (People & Payroll)</option>
                  {user?.role === "ADMIN" && <option value="ADMIN">ADMIN (Full Access)</option>}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 gradient-brand text-white font-medium rounded-lg hover:opacity-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Employee...</span>
                    </>
                  ) : (
                    <span>Save Employee</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Employee (Requirement 1 - Photo Field included) */}
      {isEditModalOpen && editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                Edit Employee: {editingEmployee.name}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Photo Upload in Edit */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-300 flex items-center justify-center shrink-0">
                  {editFormData.avatarUrl ? (
                    <img src={editFormData.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block font-semibold text-slate-700 mb-1">Employee Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditFormData({ ...editFormData, avatarUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
                {editFormData.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, avatarUrl: "" })}
                    className="text-xs text-rose-600 hover:text-rose-800 cursor-pointer font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>

              {isAdminOrHR ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                      <input
                        type="text"
                        value={editFormData.designation}
                        onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Department</label>
                      <select
                        value={editFormData.department}
                        onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      >
                        <option value="Engineering">Engineering</option>
                        <option value="Executive">Executive</option>
                        <option value="Human Resources">Human Resources</option>
                        <option value="Sales">Sales</option>
                        <option value="Operations">Operations</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Status</label>
                      <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="RESTRICTED">RESTRICTED</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
                      <select
                        value={editFormData.role}
                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      >
                        <option value="EMPLOYEE">EMPLOYEE</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="HR">HR</option>
                        {user?.role === "ADMIN" && <option value="ADMIN">ADMIN</option>}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Reset Password (leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>
                </>
              ) : (
                /* Employee editing self */
                <div>
                  <p className="text-slate-500 mb-2">
                    You can update your personal contact phone number and photo. Other fields require HR or Admin approval.
                  </p>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 gradient-brand text-white font-medium rounded-lg hover:opacity-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
