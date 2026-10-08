"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  Building2,
  CreditCard,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Landmark,
  Shield,
  ShieldAlert,
  Upload,
  Trash2,
  Image as ImageIcon,
  MapPin
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface OrgSettings {
  id: string;
  companyName: string;
  legalEntityName: string;
  tagline: string;
  logoUrl: string;
  gstin: string;
  pan: string;
  cin: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  officialEmail: string;
  financeEmail: string;
  phone: string;
  website: string;
  bankName: string;
  bankBranch: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  defaultGSTRate: number;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState<"profile" | "banking">("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [form, setForm] = useState<OrgSettings>({
    id: "default",
    companyName: "EC HYBRID",
    legalEntityName: "EC HYBRID Enterprise Solutions Pvt. Ltd.",
    tagline: "All-in-One Enterprise Operations & Management Platform",
    logoUrl: "/logo.png",
    gstin: "29AABCE1234F1Z5",
    pan: "AABCE1234F",
    cin: "U72200KA2024PTC189201",
    addressLine1: "742 Innovation Tech Corridor",
    addressLine2: "Electronic City Phase 1",
    city: "Bangalore",
    state: "Karnataka",
    postalCode: "560100",
    country: "India",
    officialEmail: "contact@echybrid.com",
    financeEmail: "finance@echybrid.com",
    phone: "+91 (80) 4129-8800",
    website: "https://echybrid.com",
    bankName: "HDFC Bank Ltd.",
    bankBranch: "Electronic City Branch",
    accountName: "EC HYBRID ENTERPRISE SOLUTIONS PVT LTD",
    accountNumber: "50200084920192",
    ifscCode: "HDFC0000128",
    upiId: "echybrid@hdfcbank",
    defaultGSTRate: 18.0,
  });

  // Fetch settings
  const fetchSettings = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/organization");
      if (res.ok) {
        const data = await res.json();
        if (data.organization) {
          setForm(data.organization);
        }
      } else {
        setErrorMsg("Failed to load organization settings");
      }
    } catch {
      setErrorMsg("Network error loading settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  // Handle Logo Upload via FileReader
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg("Logo image file size must be less than 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setForm((prev) => ({ ...prev, logoUrl: result }));
        setSuccessMsg("Brand logo uploaded. Click 'Save Organization Settings' to apply.");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset / Delete Logo
  const handleResetLogo = () => {
    setForm((prev) => ({ ...prev, logoUrl: "/logo.png" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSuccessMsg("Brand logo reset to default. Click 'Save Organization Settings' to apply.");
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSuccessMsg("Organization settings and logo updated successfully!");
        fetchSettings();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to update settings");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  // Guard: Admin (CEO) only
  if (!isAdmin) {
    return (
      <AppLayout title="Organization Settings" subtitle="Corporate configuration">
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto mt-12 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-2">Access Restricted (Admin Only)</h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Organization settings, corporate legal entities, GSTIN registrations, and bank remittance configurations are strictly reserved for the <strong>Administrator (CEO)</strong>.
          </p>
          <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            If you need to update company credentials or billing information, please reach out to executive administration.
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Organization Customization"
      subtitle="Corporate identity, branding logo, legal tax identifiers, and client billing remittance accounts"
    >
      {/* Alert Messages */}
      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab Navigation (2 Tabs only) */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "profile"
              ? "bg-white text-indigo-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Company & Legal Identity</span>
        </button>
        <button
          onClick={() => setActiveTab("banking")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "banking"
              ? "bg-white text-indigo-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Invoicing & Bank Remittance</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
          <span>Loading organization configuration...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* TAB 1: COMPANY & LEGAL PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* Brand Logo Upload & Management */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <ImageIcon className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Brand Logo Management</h3>
                    <p className="text-xs text-slate-500">Upload your organization logo to appear on the sidebar, header, and official PDF documents.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Logo Preview */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center p-2 overflow-hidden shadow-inner">
                      {form.logoUrl ? (
                        <img
                          src={form.logoUrl}
                          alt="Brand Logo Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Current Logo</span>
                  </div>

                  {/* Upload Actions */}
                  <div className="flex-1 space-y-3 text-xs">
                    <p className="text-slate-600 leading-relaxed">
                      Recommended size: Square or landscape (PNG, SVG, JPG, WebP) with transparent or white background. Max size: 3MB.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload-input"
                      />
                      <label
                        htmlFor="logo-upload-input"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold cursor-pointer transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload New Logo File</span>
                      </label>

                      {form.logoUrl && form.logoUrl !== "/logo.png" && (
                        <button
                          type="button"
                          onClick={handleResetLogo}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Reset to Default</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand & Legal Entity Identity */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Brand & Legal Entity Identity</h3>
                    <p className="text-xs text-slate-500">Corporate naming displayed across all headers, payslips, and invoices.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Brand Name *</label>
                    <input
                      type="text"
                      required
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Registered Legal Entity Name *</label>
                    <input
                      type="text"
                      required
                      value={form.legalEntityName}
                      onChange={(e) => setForm({ ...form, legalEntityName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Corporate Tagline / Subtitle</label>
                    <input
                      type="text"
                      value={form.tagline}
                      onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Official Contact Email</label>
                    <input
                      type="email"
                      value={form.officialEmail}
                      onChange={(e) => setForm({ ...form, officialEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Official Phone Number</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Website URL</label>
                    <input
                      type="url"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Tax & Registration Identifiers */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Legal Tax Identification Numbers</h3>
                    <p className="text-xs text-slate-500">Government registrations printed on GST tax invoices.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">GSTIN (Goods & Services Tax) *</label>
                    <input
                      type="text"
                      required
                      value={form.gstin}
                      onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-bold uppercase"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">15-digit Indian GST number</p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">PAN (Permanent Account Number) *</label>
                    <input
                      type="text"
                      required
                      value={form.pan}
                      onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-bold uppercase"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">10-digit income tax identifier</p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">CIN (Corporate Identity Number)</label>
                    <input
                      type="text"
                      value={form.cin}
                      onChange={(e) => setForm({ ...form, cin: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium uppercase"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Ministry of Corporate Affairs ID</p>
                  </div>
                </div>
              </div>

              {/* Registered Corporate Address */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Registered Office Address</h3>
                    <p className="text-xs text-slate-500">Corporate location embedded into official bills and legal contracts.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={form.addressLine1}
                      onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={form.addressLine2}
                      onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">State & PIN Code</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                      />
                      <input
                        type="text"
                        value={form.postalCode}
                        onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVOICING & BANK REMITTANCE (LIVE PREVIEW REMOVED) */}
          {activeTab === "banking" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <Landmark className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Corporate Bank Account for Client Remittance</h3>
                    <p className="text-xs text-slate-500">
                      These bank details are automatically injected into the remittance footer of all generated PDF Invoices.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Beneficiary Account Name *</label>
                    <input
                      type="text"
                      required
                      value={form.accountName}
                      onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={form.bankName}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Bank Branch</label>
                    <input
                      type="text"
                      value={form.bankBranch}
                      onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Current Account Number *</label>
                    <input
                      type="text"
                      required
                      value={form.accountNumber}
                      onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">IFSC Code (RTGS / NEFT) *</label>
                    <input
                      type="text"
                      required
                      value={form.ifscCode}
                      onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-mono font-bold text-slate-900 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Corporate UPI ID</label>
                    <input
                      type="text"
                      value={form.upiId}
                      onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Default GST Rate (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.defaultGSTRate}
                      onChange={(e) => setForm({ ...form, defaultGSTRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-bold text-indigo-700"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Standard B2B IT rate is 18%</p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Finance & Billing Email</label>
                    <input
                      type="email"
                      value={form.financeEmail}
                      onChange={(e) => setForm({ ...form, financeEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Save Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={fetchSettings}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
            >
              Reset Changes
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Organization Profile...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Organization Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </AppLayout>
  );
}
