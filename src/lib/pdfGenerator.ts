import jsPDF from "jspdf";
import { formatDate } from "./formatDate";
import {
  CYBER_HEADER_BG,
  MINIMALIST_LOGO,
  ICON_PROJECT,
  ICON_TERMS,
  ICON_ACCEPTANCE,
} from "./pdfAssets";

export interface PayslipPDFData {
  id: string;
  month: number;
  year: number;
  basicPay: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentStatus: string;
  generatedAt?: string | Date;
  employee: {
    id: string;
    name: string;
    email: string;
    department?: string | null;
    designation?: string | null;
    phone?: string | null;
    dateJoined?: string | Date | null;
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function formatCurrencyINR(amount: number): string {
  return "INR " + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatAmountINR(amount: number): string {
  return "Rs. " + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function numberToWordsINR(amount: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
  }

  function convertThreeDigits(n: number): string {
    if (n === 0) return "";
    let str = "";
    if (Math.floor(n / 100) > 0) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
    }
    const rem = n % 100;
    if (rem > 0) {
      str += convertTwoDigits(rem);
    }
    return str.trim();
  }

  const rounded = Math.floor(amount);
  if (rounded === 0) return "Zero Rupees Only";

  let result = "";
  const crores = Math.floor(rounded / 10000000);
  const remCrores = rounded % 10000000;
  const lakhs = Math.floor(remCrores / 100000);
  const remLakhs = remCrores % 100000;
  const thousands = Math.floor(remLakhs / 1000);
  const hundreds = remLakhs % 1000;

  if (crores > 0) result += convertThreeDigits(crores) + " Crore ";
  if (lakhs > 0) result += convertThreeDigits(lakhs) + " Lakh ";
  if (thousands > 0) result += convertThreeDigits(thousands) + " Thousand ";
  if (hundreds > 0) result += convertThreeDigits(hundreds) + " ";

  return (result.trim() + " Rupees Only").replace(/\s+/g, " ");
}

/**
 * Generates and triggers download of a professional, branded PDF payslip
 */
export function downloadPayslipPDF(data: PayslipPDFData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Header Background Banner
  doc.setFillColor(13, 12, 34); // #0D0C22 Midnight Navy
  doc.rect(0, 0, pageWidth, 32, "F");

  // Top Accent Stripe
  doc.setFillColor(37, 99, 235); // #2563EB Electric Blue
  doc.rect(0, 0, pageWidth, 2.5, "F");

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("EC HYBRID", margin, 14);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text("All-in-One Enterprise Operations & Management Platform", margin, 20);
  doc.text("Private & Confidential - Payroll & Compensation Services", margin, 25);

  // Payslip Tag on Top Right
  const monthName = MONTH_NAMES[(data.month - 1) % 12] || "Month";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`SALARY SLIP - ${monthName.toUpperCase()} ${data.year}`, pageWidth - margin, 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Ref ID: ${data.id.substring(0, 16)}`, pageWidth - margin, 20, { align: "right" });
  doc.text(`Status: ${data.paymentStatus}`, pageWidth - margin, 25, { align: "right" });

  let y = 40;

  // Employee Information Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("EMPLOYEE INFORMATION", margin + 5, y + 6);

  // Two columns for employee details
  const col1X = margin + 5;
  const col2X = margin + 95;

  doc.setFontSize(8.5);
  // Row 1
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Employee Name:", col1X, y + 13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(data.employee.name, col1X + 30, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Designation:", col2X, y + 13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(data.employee.designation || "Staff Member", col2X + 28, y + 13);

  // Row 2
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Department:", col1X, y + 20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(data.employee.department || "General", col1X + 30, y + 20);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Email Address:", col2X, y + 20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(data.employee.email, col2X + 28, y + 20);

  // Row 3
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Pay Period:", col1X, y + 27);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${monthName} 1 - ${monthName} 30, ${data.year}`, col1X + 30, y + 27);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Disbursement:", col2X, y + 27);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(`${data.paymentStatus} (Bank Transfer)`, col2X + 28, y + 27);

  y += 42;

  // Earnings & Deductions Tables (Side-by-Side)
  const colWidth = (contentWidth - 6) / 2;
  const colRightX = margin + colWidth + 6;

  // EARNINGS HEADER
  doc.setFillColor(37, 99, 235); // electric blue
  doc.roundedRect(margin, y, colWidth, 7, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("EARNINGS BREAKDOWN", margin + 4, y + 4.8);
  doc.text("AMOUNT (INR)", margin + colWidth - 4, y + 4.8, { align: "right" });

  // DEDUCTIONS HEADER
  doc.setFillColor(225, 29, 72); // rose-600
  doc.roundedRect(colRightX, y, colWidth, 7, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("DEDUCTIONS & TAX", colRightX + 4, y + 4.8);
  doc.text("AMOUNT (INR)", colRightX + colWidth - 4, y + 4.8, { align: "right" });

  y += 7;

  // EARNINGS ITEMS
  const earningsItems = [
    { label: "Basic Salary", val: data.basicPay },
    { label: "House Rent Allowance (HRA)", val: Math.round(data.allowances * 0.5) },
    { label: "Special & Travel Allowance", val: Math.round(data.allowances * 0.3) },
    { label: "Performance & Other Allowances", val: Math.round(data.allowances * 0.2) },
  ];

  // DEDUCTIONS ITEMS
  const deductionsItems = [
    { label: "Provident Fund (EPF)", val: Math.round(data.deductions * 0.5) },
    { label: "Income Tax (TDS)", val: Math.round(data.deductions * 0.4) },
    { label: "Professional Tax (PT)", val: Math.round(data.deductions * 0.1) },
    { label: "Other Statutory Deductions", val: 0 },
  ];

  const totalEarnings = data.basicPay + data.allowances;
  const totalDeductions = data.deductions;

  let currentY = y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  for (let i = 0; i < earningsItems.length; i++) {
    currentY += 6.5;

    // Alternating rows bg
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY - 5, colWidth, 6.5, "F");
      doc.rect(colRightX, currentY - 5, colWidth, 6.5, "F");
    }

    // Earnings row
    doc.setTextColor(51, 65, 85);
    doc.text(earningsItems[i].label, margin + 4, currentY - 0.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrencyINR(earningsItems[i].val), margin + colWidth - 4, currentY - 0.5, { align: "right" });

    // Deductions row
    doc.setTextColor(51, 65, 85);
    doc.text(deductionsItems[i].label, colRightX + 4, currentY - 0.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrencyINR(deductionsItems[i].val), colRightX + colWidth - 4, currentY - 0.5, { align: "right" });
  }

  currentY += 4;
  // Border below table body
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY, margin + colWidth, currentY);
  doc.line(colRightX, currentY, colRightX + colWidth, currentY);

  currentY += 6;
  // Total Earnings
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Total Gross Earnings", margin + 4, currentY);
  doc.setTextColor(37, 99, 235);
  doc.text(formatCurrencyINR(totalEarnings), margin + colWidth - 4, currentY, { align: "right" });

  // Total Deductions
  doc.setTextColor(30, 41, 59);
  doc.text("Total Deductions", colRightX + 4, currentY);
  doc.setTextColor(225, 29, 72);
  doc.text(formatCurrencyINR(totalDeductions), colRightX + colWidth - 4, currentY, { align: "right" });

  y = currentY + 12;

  // NET SALARY HIGHLIGHT BOX
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(99, 102, 241); // indigo-500
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text("NET SALARY PAYABLE (TAKE HOME)", margin + 6, y + 7);

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(formatCurrencyINR(data.netSalary), margin + 6, y + 17);

  // Amount in words
  const words = numberToWordsINR(data.netSalary);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`In Words: ${words}`, pageWidth - margin - 6, y + 17, { align: "right" });

  y += 34;

  // Verification & Signatures section
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, "FD");

  // Two columns for signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("EMPLOYEE ACKNOWLEDGEMENT", margin + 6, y + 6);
  doc.text("AUTHORIZED SIGNATORY (FINANCE & HR)", col2X, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Confirmed received by ${data.employee.name}`, margin + 6, y + 13);
  doc.text(`Generated on ${formatDate(data.generatedAt || Date.now())}`, col2X, y + 13);

  // Digital verification stamp box
  doc.setDrawColor(16, 185, 129); // emerald
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(col2X, y + 16, 75, 12, 1, 1, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text("VERIFIED & DIGITALLY APPROVED", col2X + 4, y + 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("EC HYBRID Corporate Payroll Engine", col2X + 4, y + 25.5);

  // Footer
  const footerY = 280;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "This is a system-generated document issued by EC HYBRID Organization Management Platform. No physical signature is required.",
    pageWidth / 2,
    footerY + 4,
    { align: "center" }
  );
  doc.text(
    "Page 1 of 1 | Confidential & Proprietary",
    pageWidth / 2,
    footerY + 8,
    { align: "center" }
  );

  const cleanName = data.employee.name.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`EC_HYBRID_Payslip_${cleanName}_${monthName}_${data.year}.pdf`);
}

/**
 * Generates and triggers download of the Executive Profitability & Operations Report
 */
export function downloadExecutiveReportPDF(report: any) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Header Background
  doc.setFillColor(13, 12, 34);
  doc.rect(0, 0, pageWidth, 32, "F");

  // Top Accent Stripe
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 2.5, "F");

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("EC HYBRID - EXECUTIVE PERFORMANCE REPORT", margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text("Revenue, Payroll Expense & Operational Capacity Analytics", margin, 20);
  doc.text("Confidential Executive Report | Section 3.9 Specification", margin, 25);

  const todayStr = formatDate(new Date());
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Generated: ${todayStr}`, pageWidth - margin, 18, { align: "right" });

  let y = 42;

  // FINANCIAL OVERVIEW CARDS (2x2 Grid)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("1. FINANCIAL PROFITABILITY SUMMARY (INR)", margin, y);
  y += 6;

  const cardW = (contentWidth - 6) / 2;
  const cardH = 22;

  // Card 1: Total Revenue
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, cardW, cardH, 2, 2, "FD");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL REVENUE (DUAL STREAMS)", margin + 4, y + 6);
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text(formatCurrencyINR(report.revenueBreakdown?.totalRevenue || 0), margin + 4, y + 14);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Services: ${formatCurrencyINR(report.revenueBreakdown?.serviceRevenue || 0)} | Products: ${formatCurrencyINR(report.revenueBreakdown?.productRevenue || 0)}`,
    margin + 4,
    y + 19
  );

  // Card 2: Payroll Operational Expense
  doc.roundedRect(margin + cardW + 6, y, cardW, cardH, 2, 2, "FD");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("MONTHLY PAYROLL EXPENSE", margin + cardW + 10, y + 6);
  doc.setFontSize(12);
  doc.setTextColor(225, 29, 72);
  doc.text(formatCurrencyINR(report.expenseBreakdown?.monthlyPayroll || 0), margin + cardW + 10, y + 14);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Annual Projected: ${formatCurrencyINR(report.expenseBreakdown?.annualPayroll || 0)}`, margin + cardW + 10, y + 19);

  y += cardH + 4;

  // Card 3: Net Operating Profit
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "FD");
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105);
  doc.text("NET OPERATING PROFIT (Revenue minus Monthly Payroll)", margin + 6, y + 6);
  doc.setFontSize(13);
  doc.setTextColor(4, 120, 87);
  doc.text(formatCurrencyINR(report.netProfit || 0), margin + 6, y + 14);

  const profitMargin = report.revenueBreakdown?.totalRevenue > 0
    ? Math.round((report.netProfit / report.revenueBreakdown.totalRevenue) * 100)
    : 0;
  doc.setFontSize(8);
  doc.text(`Operating Margin: ${profitMargin}%`, pageWidth - margin - 6, y + 14, { align: "right" });

  y += 28;

  // PROJECT & TASK METRICS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("2. OPERATIONAL DELIVERY METRICS", margin, y);
  y += 6;

  // Project Table
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("Projects Overview", margin + 6, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Total Managed Projects: ${report.projectSummary?.total || 0}`, margin + 6, y + 12);
  doc.text(`Active: ${report.projectSummary?.active || 0}  |  Planning: ${report.projectSummary?.planning || 0}  |  On Hold: ${report.projectSummary?.onHold || 0}  |  Completed: ${report.projectSummary?.completed || 0}`, margin + 6, y + 18);

  // Tasks overview on right side
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("Tasks Execution", margin + 95, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Total Tasks: ${report.taskSummary?.total || 0}  (Completion Rate: ${report.taskSummary?.completionRate || 0}%)`, margin + 95, y + 12);
  doc.text(`Done: ${report.taskSummary?.done || 0}  |  In Progress: ${report.taskSummary?.inProgress || 0}  |  Overdue: ${report.taskSummary?.overdue || 0}`, margin + 95, y + 18);

  y += 36;

  // EMPLOYEE WORKLOAD TABLE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("3. EMPLOYEE WORKLOAD & CAPACITY ALLOCATION", margin, y);
  y += 6;

  // Table header
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y, contentWidth, 6.5, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("EMPLOYEE NAME", margin + 4, y + 4.5);
  doc.text("DEPARTMENT", margin + 60, y + 4.5);
  doc.text("TOTAL TASKS", margin + 110, y + 4.5);
  doc.text("COMPLETED", margin + 140, y + 4.5);
  doc.text("OPEN / ACTIVE", margin + 165, y + 4.5);

  y += 6.5;

  const employees = report.workloadPerEmployee || [];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 6, "F");
    }

    doc.setTextColor(15, 23, 42);
    doc.text(emp.name, margin + 4, y + 4.2);
    doc.setTextColor(100, 116, 139);
    doc.text(emp.department || "General", margin + 60, y + 4.2);
    doc.setTextColor(15, 23, 42);
    doc.text(String(emp.totalTasks), margin + 115, y + 4.2);
    doc.setTextColor(16, 185, 129);
    doc.text(String(emp.completedTasks), margin + 145, y + 4.2);
    doc.setTextColor(239, 68, 68);
    doc.text(String(emp.openTasks), margin + 170, y + 4.2);

    y += 6;
  }

  // Footer
  const footerY = 280;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "EC HYBRID Organization Management Platform - Confidential & Proprietary Financial Analytics",
    pageWidth / 2,
    footerY + 4,
    { align: "center" }
  );

  doc.save(`EC_HYBRID_Executive_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceCustomData {
  fromDetails?: {
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    gstin?: string;
  };
  toDetails?: {
    company?: string;
    contactPerson?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  projectHeadline?: string;
  terms?: string[];
  notes?: string;
  taxRate?: number;
  subtitle?: string;
}

export interface InvoicePDFData {
  id: string;
  invoiceNumber: string;
  issueDate: string | Date;
  dueDate: string | Date;
  status: string;
  description?: string | null;
  amount: number;
  tax: number;
  totalAmount: number;
  client: {
    name: string;
    company?: string | null;
    email: string;
    phone?: string | null;
    address?: string | null;
  };
  project?: {
    name: string;
  } | null;
  items: InvoiceItem[];
  customData?: InvoiceCustomData;
}

export type InvoicePDFTemplate = "modern_tech" | "classic_corporate";

function formatPDFDate(dateInput: string | Date | undefined): string {
  return formatDate(dateInput);
}

/**
 * Renders company logo in PDF headers.
 * If user uploaded custom logo in Org Settings, renders it.
 * Otherwise renders default Exocross logo asset.
 */
function renderInvoiceLogo(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  org?: any,
  fallbackBase64?: string
) {
  if (org?.logoUrl && typeof org.logoUrl === "string" && org.logoUrl.startsWith("data:image/")) {
    try {
      const format = org.logoUrl.includes("png") ? "PNG" : "JPEG";
      doc.addImage(org.logoUrl, format, x, y, w, h);
      return;
    } catch {
      // Fallback
    }
  }

  if (fallbackBase64) {
    try {
      const format = fallbackBase64.includes("jpeg") || fallbackBase64.includes("jpg") ? "JPEG" : "PNG";
      doc.addImage(fallbackBase64, format, x, y, w, h);
      return;
    } catch {
      // Fallback to text box
    }
  }

  // Fallback vector EC block
  doc.setFillColor(17, 24, 39);
  doc.rect(x, y, w, h, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("EC", x + w / 2, y + h / 2 + 2, { align: "center" });
}

/**
 * ============================================================================
 * TEMPLATE 1: MINIMALIST MONOCHROME QUOTATION (1-Page)
 * Exact replication of user's provided PDF:
 * - Square EC Exocross Monogram / Custom Logo
 * - Bold tracking QUOTATION title & metadata bar
 * - Solid black hairline divider
 * - 2-Column FROM / TO details
 * - Project Headline
 * - 4-Column Table: Description | Qty | Rate | Amount
 * - Subtotal / Tax GST / Total summary block
 * - 4-Point Commercial Terms & Conditions
 * - Dual formal signatory lines (Authorised signatory – Exocross & Client acceptance)
 * - Centered "Thank you for your business."
 * ============================================================================
 */
export function buildClassicCorporatePDFDoc(invoice: InvoicePDFData, org?: any): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 16;
  const contentWidth = pageWidth - margin * 2; // 178mm
  const rightMarginX = pageWidth - margin; // 194mm

  const custom = invoice.customData || {};
  const fromDetails = custom.fromDetails || {};
  const toDetails = custom.toDetails || {};

  // Company / From details
  const compName = fromDetails.companyName || org?.companyName || "Exocross";
  const compAddress = fromDetails.address || (org?.addressLine1
    ? `${org.addressLine1}, ${org.city || "Chennai"}, ${org.state || "Tamil Nadu"}`
    : "Chennai, Tamil Nadu");
  const compPhone = fromDetails.phone || org?.phone || "7604830742, 8124473373";
  const compEmail = fromDetails.email || org?.officialEmail || "exocross.tech@gmail.com";
  const compWebsite = fromDetails.website || org?.website || "exocross.com";
  const compGstin = fromDetails.gstin || org?.gstin || "";

  // Client / To details
  const clientComp = toDetails.company || invoice.client.company || invoice.client.name;
  const contactPerson = toDetails.contactPerson || invoice.client.name;
  const clientAddr = toDetails.address || invoice.client.address || "Client Address on Record";
  const clientEmail = toDetails.email || invoice.client.email || "";
  const clientPhone = toDetails.phone || invoice.client.phone || "";

  // Project headline
  const projectHeadline = custom.projectHeadline || invoice.project?.name || invoice.description || "Full Stack Web Application";

  // Top Left: Monogram / Company Logo
  renderInvoiceLogo(doc, margin, 14, 18, 17, org, MINIMALIST_LOGO);

  // Top Right: Title "QUOTATION"
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(17, 24, 39);
  doc.text("QUOTATION", rightMarginX, 22, { align: "right" });

  // Top Right: Meta line: No. EXO-[YYYY]-[001] | Date: [DD/MM/YYYY] | Valid until: [DD/MM/YYYY]
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  const metaText = `No. ${invoice.invoiceNumber || "EXO-001"}   |   Date: ${formatPDFDate(invoice.issueDate)}   |   Valid until: ${formatPDFDate(invoice.dueDate)}`;
  doc.text(metaText, rightMarginX, 28, { align: "right" });

  // Black Divider Line
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.4);
  doc.line(margin, 35, rightMarginX, 35);

  // Two Column Addresses: FROM / TO
  const col1X = margin;
  const col2X = margin + 92;

  // FROM Column
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text("FROM", col1X, 42);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(compName, col1X, 47.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text(compAddress, col1X, 52.5);
  doc.text(`${compPhone}  |  ${compEmail}`, col1X, 57.5);
  const webGstLine = compGstin ? `${compWebsite}  |  GSTIN: ${compGstin}` : compWebsite;
  doc.text(webGstLine, col1X, 62.5);

  // TO Column
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text("TO", col2X, 42);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(clientComp, col2X, 47.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text(`Attn: ${contactPerson}`, col2X, 52.5);
  const clientAddrLines = doc.splitTextToSize(clientAddr, 80);
  doc.text(clientAddrLines, col2X, 57.5);

  const clientContactY = 57.5 + clientAddrLines.length * 4.2;
  const clientContactText = [clientEmail, clientPhone].filter(Boolean).join("  |  ");
  if (clientContactText) {
    doc.text(clientContactText, col2X, clientContactY);
  }

  // Project Headline
  const projectY = Math.max(72, clientContactY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(`Project: ${projectHeadline}`, margin, projectY);

  // 4-Column Table Header: Description | Qty | Rate | Amount
  const tableY = projectY + 5;
  doc.setFillColor(17, 24, 39); // Solid Black
  doc.rect(margin, tableY, contentWidth, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("Description", margin + 4, tableY + 4.8);
  doc.text("Qty", margin + 112, tableY + 4.8, { align: "center" });
  doc.text("Rate", margin + 145, tableY + 4.8, { align: "right" });
  doc.text("Amount", rightMarginX - 4, tableY + 4.8, { align: "right" });

  // Table Body Rows
  const items = invoice.items && invoice.items.length > 0
    ? invoice.items
    : [{ description: invoice.description || "Software Engineering & Architecture Deliverables", quantity: 1, unitPrice: invoice.amount, amount: invoice.amount }];

  let currentY = tableY + 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  for (let i = 0; i < items.length; i++) {
    const itm = items[i];
    const descLines = doc.splitTextToSize(itm.description, 95);
    const rowHeight = Math.max(7, descLines.length * 4.2 + 2.8);

    currentY += rowHeight;

    doc.setTextColor(17, 24, 39);
    doc.text(descLines, margin + 4, currentY - rowHeight + 4.6);

    doc.setTextColor(75, 85, 99);
    doc.text(String(itm.quantity), margin + 112, currentY - rowHeight + 4.6, { align: "center" });

    doc.setTextColor(75, 85, 99);
    doc.text(itm.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 145, currentY - rowHeight + 4.6, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(itm.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightMarginX - 4, currentY - rowHeight + 4.6, { align: "right" });
    doc.setFont("helvetica", "normal");

    // Row bottom separator line
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, currentY, rightMarginX, currentY);
  }

  // Summary & Totals Block
  let summaryY = currentY + 6;
  const totalsLabelX = rightMarginX - 65;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text("Subtotal", totalsLabelX, summaryY);
  doc.text(invoice.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightMarginX - 4, summaryY, { align: "right" });

  summaryY += 5.5;
  const taxPercent = custom.taxRate !== undefined ? custom.taxRate : (invoice.tax > 0 ? 18 : 0);
  doc.text(`Tax / GST (${taxPercent}%)`, totalsLabelX, summaryY);
  doc.text(invoice.tax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightMarginX - 4, summaryY, { align: "right" });

  summaryY += 3;
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.6);
  doc.line(totalsLabelX, summaryY, rightMarginX, summaryY);

  summaryY += 5.5;
  doc.setFontSize(9.5);
  doc.text("Total", totalsLabelX, summaryY);
  doc.text(invoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightMarginX - 4, summaryY, { align: "right" });

  summaryY += 2;
  doc.setLineWidth(0.3);
  doc.line(totalsLabelX, summaryY, rightMarginX, summaryY);

  // TERMS Block
  const termsY = Math.max(summaryY + 12, 175);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text("TERMS", margin, termsY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);

  const defaultTerms = [
    "1.  Valid for 30 days from the date of issue.",
    "2.  Payment: 50% advance, balance on delivery. Invoices payable within 15 days.",
    "3.  Prices exclude third-party licences and hosting unless stated.",
    "4.  Changes in scope will be quoted separately."
  ];

  const termsList = custom.terms && custom.terms.length > 0 ? custom.terms : defaultTerms;
  let termLineY = termsY + 5;
  termsList.forEach((term, index) => {
    const formattedTerm = term.match(/^\d+\./) ? term : `${index + 1}.  ${term}`;
    doc.text(formattedTerm, margin, termLineY);
    termLineY += 4.5;
  });

  // Dual Signatures Block (Bottom)
  const signY = 246;
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.4);

  // Left Signature: Exocross
  doc.line(margin, signY, margin + 68, signY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text(`Authorised signatory – ${compName}`, margin, signY + 4.5);

  // Right Signature: Client acceptance
  doc.line(rightMarginX - 72, signY, rightMarginX, signY);
  doc.text("Client acceptance (signature, name, date)", rightMarginX - 72, signY + 4.5);

  // Centered Footer: "Thank you for your business."
  const footerY = 278;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text("Thank you for your business.", pageWidth / 2, footerY, { align: "center" });

  return doc;
}

export function generateClassicCorporatePDF(invoice: InvoicePDFData, org?: any) {
  const doc = buildClassicCorporatePDFDoc(invoice, org);
  doc.save(`Quotation_${invoice.invoiceNumber || "EXO-001"}.pdf`);
}

/**
 * ============================================================================
 * TEMPLATE 2: MODERN TECH / CYBER 2-PAGE QUOTATION
 * Exact replication of user's provided PDF:
 * - Page 1 & Page 2: Deep navy server illustration header banner with cyan stripe
 * - Top Badge: Blue QUOTATION bar + dark IT Services & Solutions / Custom Future Products pill
 * - 3 Metadata Cards: QUOTE NO. (blue), DATE (teal), VALID UNTIL (orange)
 * - 2 Address Cards: FROM (blue accent bar) / PREPARED FOR (teal accent bar)
 * - Project Headline with blue document icon
 * - 3-Column Phase Deliverables Table (# | Description | Amount) with alternating rows
 * - Page 1 Highlighted TOTAL Pill (dark pill with bright cyan amount)
 * - Page 2: Shield TERMS bullet points
 * - Page 2: Cyan pencil ACCEPTANCE dual signoff stamp boxes
 * - Dark cyber footer bar on both pages with reference and "Page X of 2"
 * ============================================================================
 */
export function buildModernTechPDFDoc(invoice: InvoicePDFData, org?: any): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 16;
  const contentWidth = pageWidth - margin * 2; // 178mm
  const rightMarginX = pageWidth - margin; // 194mm

  const custom = invoice.customData || {};
  const fromDetails = custom.fromDetails || {};
  const toDetails = custom.toDetails || {};

  // Company details
  const compName = fromDetails.companyName || org?.companyName || "Exocross";
  const compAddress = fromDetails.address || (org?.addressLine1
    ? `${org.addressLine1}, ${org.city || "Chennai"}, ${org.state || "Tamil Nadu"}`
    : "Chennai, Tamil Nadu");
  const compPhone = fromDetails.phone || org?.phone || "7604830742, 8124473373";
  const compEmail = fromDetails.email || org?.officialEmail || "exocross.tech@gmail.com";
  const compWebsite = fromDetails.website || org?.website || "exocross.com";

  // Client details
  const clientComp = toDetails.company || invoice.client.company || invoice.client.name;
  const clientContact = toDetails.contactPerson || (invoice.client.company ? invoice.client.name : "");
  const clientAddr = toDetails.address || invoice.client.address || "Anna Nagar, Tamil Nadu";
  const clientPhone = toDetails.phone || invoice.client.phone || "";
  const clientEmail = toDetails.email || invoice.client.email || "";

  // Project headline
  const projectHeadline = custom.projectHeadline || invoice.project?.name || invoice.description || "Billing Software – Full Stack Web Application";

  // Helper for Top Banner (Header)
  const drawCyberHeader = () => {
    // Navy Tech Banner Background
    try {
      doc.addImage(CYBER_HEADER_BG, "JPEG", 0, 0, pageWidth, 42);
    } catch {
      doc.setFillColor(26, 26, 26);
      doc.rect(0, 0, pageWidth, 42, "F");
    }

    // Only if a custom uploaded organization logo exists (not default)
    const isCustomLogo =
      org?.logoUrl &&
      typeof org.logoUrl === "string" &&
      org.logoUrl.startsWith("data:image/") &&
      !org.logoUrl.includes("logo.png");

    if (isCustomLogo) {
      // Seamlessly mask the left area with matching header background color (#1a1a1a)
      // Height trimmed to 38.5mm to be in exact equal height with the tech header background
      doc.setFillColor(26, 26, 26);
      doc.rect(0, 0, 65, 38.5, "F");
      try {
        const format = org.logoUrl.includes("png") ? "PNG" : "JPEG";
        doc.addImage(org.logoUrl, format, margin, 9.25, 20, 20);
      } catch {}
    }

    // Continuous dark blue horizontal accent stripe running seamlessly across entire header
    doc.setFillColor(37, 99, 235); // #2563EB Electric Blue
    doc.rect(0, 38.5, pageWidth, 3.5, "F");

    // Cyan circuit accent line beneath banner
    doc.setFillColor(0, 229, 255); // #00E5FF
    doc.rect(0, 42, pageWidth, 2, "F");
  };

  // Helper for Dark Cyber Footer
  const drawCyberFooter = (pageNo: number) => {
    const footerY = 286;
    doc.setFillColor(0, 229, 255);
    doc.rect(0, footerY, pageWidth, 0.8, "F");

    doc.setFillColor(11, 15, 23);
    doc.rect(0, footerY + 0.8, pageWidth, pageHeight - footerY, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    const footerText = `${compName}  |  ${compWebsite}  |  ${compEmail}  |  ${compPhone.split(",")[0]}  |  Quote ${invoice.invoiceNumber || "EXO-002"}  |  Page ${pageNo} of 2`;
    doc.text(footerText, pageWidth / 2, footerY + 6.5, { align: "center" });
  };

  // ==================== PAGE 1 ====================
  drawCyberHeader();

  // 1. Badge Bar (y = 48mm)
  const badgeY = 48;
  const badgeH = 11;
  const leftBadgeW = 95;
  const rightBadgeW = contentWidth - leftBadgeW;

  // Left: Blue QUOTATION Badge
  doc.setFillColor(47, 107, 255); // #2F6BFF
  doc.rect(margin, badgeY, leftBadgeW, badgeH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("QUOTATION", margin + 6, badgeY + 7.5);

  // Right: Dark container with IT Services & Solutions
  doc.setFillColor(17, 24, 39);
  doc.rect(margin + leftBadgeW, badgeY, rightBadgeW, badgeH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("IT Services & Solutions", rightMarginX - 5, badgeY + 4.8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 229, 255);
  doc.text("Custom Future Products", rightMarginX - 5, badgeY + 9, { align: "right" });

  // 2. Three Metadata Cards (y = 62mm)
  const cardY = 62;
  const cardW = (contentWidth - 6) / 3;
  const cardH = 12;

  // Card 1: QUOTE NO.
  doc.setFillColor(244, 247, 252);
  doc.rect(margin, cardY, cardW, cardH, "F");
  doc.setFillColor(47, 107, 255); // Blue accent
  doc.rect(margin, cardY, 1.8, cardH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("QUOTE NO.", margin + 4.5, cardY + 4.2);
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(invoice.invoiceNumber || "EXO-002", margin + 4.5, cardY + 9);

  // Card 2: DATE
  const card2X = margin + cardW + 3;
  doc.setFillColor(244, 247, 252);
  doc.rect(card2X, cardY, cardW, cardH, "F");
  doc.setFillColor(0, 194, 178); // Cyan accent
  doc.rect(card2X, cardY, 1.8, cardH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DATE", card2X + 4.5, cardY + 4.2);
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text(formatPDFDate(invoice.issueDate), card2X + 4.5, cardY + 9);

  // Card 3: VALID UNTIL
  const card3X = card2X + cardW + 3;
  doc.setFillColor(244, 247, 252);
  doc.rect(card3X, cardY, cardW, cardH, "F");
  doc.setFillColor(255, 138, 61); // Orange accent
  doc.rect(card3X, cardY, 1.8, cardH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("VALID UNTIL", card3X + 4.5, cardY + 4.2);
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text(formatPDFDate(invoice.dueDate), card3X + 4.5, cardY + 9);

  // 3. Two Address Cards: FROM / PREPARED FOR (y = 77mm)
  const addrY = 77;
  const addrW = (contentWidth - 6) / 2;
  const addrH = 26;

  // Box 1: FROM
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, addrY, addrW, addrH, "FD");
  doc.setFillColor(47, 107, 255); // Blue top bar
  doc.rect(margin, addrY, addrW, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(47, 107, 255);
  doc.text("F R O M", margin + 4, addrY + 5.5);

  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(compName, margin + 4, addrY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(compAddress, margin + 4, addrY + 14.5);
  doc.text(compPhone, margin + 4, addrY + 18.5);
  doc.text(`${compEmail}  |  ${compWebsite}`, margin + 4, addrY + 22.5);

  // Box 2: PREPARED FOR
  const addr2X = margin + addrW + 6;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(addr2X, addrY, addrW, addrH, "FD");
  doc.setFillColor(0, 194, 178); // Cyan top bar
  doc.rect(addr2X, addrY, addrW, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(0, 194, 178);
  doc.text("P R E P A R E D   F O R", addr2X + 4, addrY + 5.5);

  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(clientComp, addr2X + 4, addrY + 10);

  let currentClientY = addrY + 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);

  if (clientContact) {
    doc.text(`Attn: ${clientContact}`, addr2X + 4, currentClientY);
    currentClientY += 3.8;
  }

  if (clientAddr) {
    const wrappedAddr = doc.splitTextToSize(clientAddr, addrW - 8);
    for (let i = 0; i < Math.min(wrappedAddr.length, 2); i++) {
      doc.text(wrappedAddr[i], addr2X + 4, currentClientY);
      currentClientY += 3.8;
    }
  }

  const clientContactLine = [clientPhone, clientEmail].filter(Boolean).join("  |  ");
  if (clientContactLine) {
    doc.text(clientContactLine, addr2X + 4, currentClientY);
  }

  // 4. PROJECT Section Icon & Title (y = 106mm)
  const projSecY = 106;
  try {
    doc.addImage(ICON_PROJECT, "PNG", margin, projSecY - 3, 5, 5);
  } catch {
    doc.setFillColor(47, 107, 255);
    doc.circle(margin + 2.5, projSecY - 0.5, 2.5, "F");
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text("PROJECT", margin + 7, projSecY);

  // Divider hairline
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, projSecY + 2.5, rightMarginX, projSecY + 2.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(projectHeadline, margin, projSecY + 7);

  // 5. Phase Deliverables Table (# | Description | Amount) (y = 116mm)
  const tableY = projSecY + 10;
  doc.setFillColor(47, 107, 255); // Solid Blue
  doc.rect(margin, tableY, contentWidth, 6.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("#", margin + 5, tableY + 4.5, { align: "center" });
  doc.text("Description", margin + 15, tableY + 4.5);
  doc.text("Amount", rightMarginX - 4, tableY + 4.5, { align: "right" });

  const items = invoice.items && invoice.items.length > 0
    ? invoice.items
    : [{ description: invoice.description || "Software Engineering & Architecture Deliverables", quantity: 1, unitPrice: invoice.amount, amount: invoice.amount }];

  let currentY = tableY + 6.5;
  const maxPage1Items = 16;
  const displayItems = items.slice(0, maxPage1Items);

  for (let i = 0; i < displayItems.length; i++) {
    const itm = displayItems[i];
    const rowH = 6.2;
    currentY += rowH;

    // Alternating zebra row
    if (i % 2 === 1) {
      doc.setFillColor(240, 246, 255); // Ice blue
      doc.rect(margin, currentY - rowH, contentWidth, rowH, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(17, 24, 39);
    doc.text(String(i + 1), margin + 5, currentY - 1.8, { align: "center" });

    const descText = itm.description.length > 70 ? itm.description.substring(0, 68) + "..." : itm.description;
    doc.text(descText, margin + 15, currentY - 1.8);

    doc.setFont("helvetica", "bold");
    doc.text(formatAmountINR(itm.amount), rightMarginX - 4, currentY - 1.8, { align: "right" });
  }

  // Highlighted TOTAL Pill (Right Aligned, y = 246mm)
  const totalPillY = Math.max(currentY + 6, 242);
  const pillW = 76;
  const pillH = 9;
  const pillX = rightMarginX - pillW;

  doc.setFillColor(17, 24, 39); // Deep dark pill
  doc.rect(pillX, totalPillY, pillW, pillH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", pillX + 6, totalPillY + 5.8);

  doc.setFontSize(10.5);
  doc.setTextColor(0, 229, 255); // Bright cyan
  doc.text(formatAmountINR(invoice.totalAmount), rightMarginX - 4, totalPillY + 6.2, { align: "right" });

  drawCyberFooter(1);

  // ==================== PAGE 2 ====================
  doc.addPage("a4", "portrait");
  drawCyberHeader();

  // 1. TERMS Section (y = 52mm)
  const termsSecY = 52;
  try {
    doc.addImage(ICON_TERMS, "PNG", margin, termsSecY - 3, 5, 5);
  } catch {
    doc.setFillColor(47, 107, 255);
    doc.circle(margin + 2.5, termsSecY - 0.5, 2.5, "F");
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text("TERMS", margin + 7, termsSecY);

  // Divider hairline
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, termsSecY + 2.5, rightMarginX, termsSecY + 2.5);

  const defaultCyberTerms = [
    "Valid for 30 days from the date of issue.",
    "Payment: 50% advance, balance on delivery; invoices payable within 15 days.",
    "Third-party licences and hosting are excluded; scope changes will be quoted separately."
  ];

  const page2Terms = custom.terms && custom.terms.length > 0 ? custom.terms : defaultCyberTerms;
  let termBulletY = termsSecY + 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);

  page2Terms.forEach((t) => {
    // Blue/Cyan square bullet
    doc.setFillColor(47, 107, 255);
    doc.rect(margin + 1, termBulletY - 2.5, 1.6, 1.6, "F");

    const cleanBullet = t.replace(/^\d+\.\s*/, "").replace(/^▪\s*/, "");
    doc.text(cleanBullet, margin + 5, termBulletY);
    termBulletY += 5.5;
  });

  // 2. ACCEPTANCE Section (y = 82mm)
  const acceptSecY = Math.max(termBulletY + 8, 82);
  try {
    doc.addImage(ICON_ACCEPTANCE, "PNG", margin, acceptSecY - 3, 5, 5);
  } catch {
    doc.setFillColor(0, 194, 178);
    doc.circle(margin + 2.5, acceptSecY - 0.5, 2.5, "F");
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text("ACCEPTANCE", margin + 7, acceptSecY);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, acceptSecY + 2.5, rightMarginX, acceptSecY + 2.5);

  // Dual Signoff Containers (y = 94mm)
  const signBoxY = acceptSecY + 6;
  const signBoxW = (contentWidth - 6) / 2;

  // Box 1: FOR EXOCROSS
  doc.setFillColor(47, 107, 255); // Blue top accent line
  doc.rect(margin, signBoxY, signBoxW, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(47, 107, 255);
  doc.text(`F O R   ${compName.toUpperCase()}`, margin + 2, signBoxY + 5.5);

  // Signature line
  const signLineY = signBoxY + 36;
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.4);
  doc.line(margin, signLineY, margin + signBoxW, signLineY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text("Authorised signatory, name & date", margin, signLineY + 4.5);

  // Box 2: ACCEPTED BY CLIENT
  const signBox2X = margin + signBoxW + 6;
  doc.setFillColor(0, 194, 178); // Cyan top accent line
  doc.rect(signBox2X, signBoxY, signBoxW, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(0, 194, 178);
  doc.text("A C C E P T E D   B Y   C L I E N T", signBox2X + 2, signBoxY + 5.5);

  // Signature line
  doc.setDrawColor(17, 24, 39);
  doc.line(signBox2X, signLineY, signBox2X + signBoxW, signLineY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text("Client signatory, name, date & seal", signBox2X, signLineY + 4.5);

  drawCyberFooter(2);

  return doc;
}

export function generateModernTechPDF(invoice: InvoicePDFData, org?: any) {
  const doc = buildModernTechPDFDoc(invoice, org);
  doc.save(`Cyber_Quotation_${invoice.invoiceNumber || "EXO-002"}.pdf`);
}

/**
 * Returns generated jsPDF instance based on selected template
 */
export function buildInvoicePDFDoc(
  invoice: InvoicePDFData,
  org?: any,
  template: InvoicePDFTemplate = "modern_tech"
): jsPDF {
  if (template === "classic_corporate") {
    return buildClassicCorporatePDFDoc(invoice, org);
  }
  return buildModernTechPDFDoc(invoice, org);
}

/**
 * Main Invoice PDF Dispatcher (downloads file to device)
 */
export function downloadInvoicePDF(
  invoice: InvoicePDFData,
  org?: any,
  template: InvoicePDFTemplate = "modern_tech"
) {
  const doc = buildInvoicePDFDoc(invoice, org, template);
  const prefix = template === "classic_corporate" ? "Quotation" : "Cyber_Quotation";
  doc.save(`${prefix}_${invoice.invoiceNumber || "EXO"}.pdf`);
}

/**
 * Returns raw Blob for in-browser PDF preview iframe
 */
export function getInvoicePDFBlob(
  invoice: InvoicePDFData,
  org?: any,
  template: InvoicePDFTemplate = "modern_tech"
): Blob {
  const doc = buildInvoicePDFDoc(invoice, org, template);
  return doc.output("blob");
}

/**
 * Returns data URI string for PDF preview
 */
export function getInvoicePDFDataUri(
  invoice: InvoicePDFData,
  org?: any,
  template: InvoicePDFTemplate = "modern_tech"
): string {
  const doc = buildInvoicePDFDoc(invoice, org, template);
  return doc.output("datauristring");
}
