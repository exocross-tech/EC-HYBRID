import jsPDF from "jspdf";

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

function numberToWordsINR(amount: number): string {
  // Simple words representation for common numbers
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
  doc.text(`Generated on ${new Date(data.generatedAt || Date.now()).toLocaleDateString("en-IN")}`, col2X, y + 13);

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

  const todayStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
}

export type InvoicePDFTemplate = "modern_tech" | "classic_corporate";

function formatPDFDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(dateInput);
  }
}

function renderExocrossLogo(doc: jsPDF, x: number, y: number, org?: any) {
  if (org?.logoUrl && typeof org.logoUrl === "string" && org.logoUrl.startsWith("data:image/")) {
    try {
      const format = org.logoUrl.includes("png") ? "PNG" : "JPEG";
      doc.addImage(org.logoUrl, format, x, y, 16, 16);
      return;
    } catch {
      // Fallback to vector logo below
    }
  }

  // Official Exocross Vector Monogram Logo
  // Solid Dark Square Box
  doc.setFillColor(15, 23, 42); // #0F172A slate-900
  doc.roundedRect(x, y, 16, 16, 1.2, 1.2, "F");

  // "EC" monogram inside
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("EC", x + 8, y + 11.2, { align: "center" });

  // "EXOCROSS" text below
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("EXOCROSS", x + 8, y + 21, { align: "center" });
}

/**
 * Template 1: Formal Corporate Standard
 * Minimalist monochrome corporate layout with Exocross square monogram logo,
 * 4-column itemized breakdown (Description | Qty | Rate | Amount),
 * standard 4-point commercial terms, and formal dual signatory block.
 */
export function generateClassicCorporatePDF(invoice: InvoicePDFData, org?: any) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 16;
  const contentWidth = pageWidth - margin * 2; // 178mm
  const rightMarginX = pageWidth - margin; // 194mm

  const compName = org?.companyName || "Exocross";
  const officialEmail = org?.officialEmail || "exocross.tech@gmail.com";
  const phone = org?.phone || "7604830742 / 8124473373";
  const website = org?.website || "exocross.com";
  const gstin = org?.gstin || "33AABCE1234F1Z5";
  const address = org?.addressLine1
    ? `${org.addressLine1}, ${org.addressLine2 ? org.addressLine2 + ", " : ""}${org.city || "Chennai"}, ${org.state || "Tamil Nadu"} - ${org.postalCode || "600001"}`
    : "Chennai, Tamil Nadu, India";

  // Top Left: Exocross Monogram Logo
  renderExocrossLogo(doc, margin, 16, org);

  // Top Right: Document Title & Meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `QUOTATION / TAX INVOICE No. ${invoice.invoiceNumber || "EXO-2025-001"}`,
    rightMarginX,
    20,
    { align: "right" }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${formatPDFDate(invoice.issueDate)}`, rightMarginX, 25.5, { align: "right" });
  doc.text(`Valid until: ${formatPDFDate(invoice.dueDate)}`, rightMarginX, 30.5, { align: "right" });

  // Thin Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, 41, rightMarginX, 41);

  // Two Column Address Block
  const col1X = margin;
  const col2X = margin + 92;

  // From:
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("From:", col1X, 47);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(compName, col1X, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(address, col1X, 57);
  doc.text(`Phone: ${phone}`, col1X, 62);
  doc.text(`Email: ${officialEmail}`, col1X, 67);
  doc.text(`Web: ${website}`, col1X, 72);
  if (gstin) {
    doc.text(`GSTIN: ${gstin}`, col1X, 77);
  }

  // To:
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("To:", col2X, 47);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.client.company || invoice.client.name, col2X, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Attn: ${invoice.client.name}`, col2X, 57);

  const clientAddress = invoice.client.address || "Client Address on Record";
  const addressLines = doc.splitTextToSize(clientAddress, 85);
  doc.text(addressLines, col2X, 62);

  let clientMetaY = 62 + addressLines.length * 4.5;
  doc.text(`Email: ${invoice.client.email}`, col2X, clientMetaY);
  if (invoice.client.phone) {
    clientMetaY += 4.5;
    doc.text(`Phone: ${invoice.client.phone}`, col2X, clientMetaY);
  }

  // Project Title Headline
  const projectY = Math.max(83, clientMetaY + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const projectName = invoice.project?.name || invoice.description || "IT Services & Solutions";
  doc.text(`Project: ${projectName}`, margin, projectY);

  // 4-Column Table Header
  const tableHeaderY = projectY + 5.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, tableHeaderY, contentWidth, 7.5, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Description", margin + 4, tableHeaderY + 5);
  doc.text("Qty", margin + 104, tableHeaderY + 5, { align: "center" });
  doc.text("Rate", margin + 138, tableHeaderY + 5, { align: "right" });
  doc.text("Amount", rightMarginX - 4, tableHeaderY + 5, { align: "right" });

  // Table Body Rows
  const items = invoice.items && invoice.items.length > 0
    ? invoice.items
    : [{ description: invoice.description || "IT Deliverables & Technical Services", quantity: 1, unitPrice: invoice.amount, amount: invoice.amount }];

  let currentY = tableHeaderY + 7.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  for (let i = 0; i < items.length; i++) {
    const itm = items[i];
    const descLines = doc.splitTextToSize(itm.description, 92);
    const rowHeight = Math.max(7.5, descLines.length * 4.5 + 3);

    currentY += rowHeight;

    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY - rowHeight, contentWidth, rowHeight, "F");
    }

    doc.setTextColor(15, 23, 42);
    doc.text(descLines, margin + 4, currentY - rowHeight + 4.8);

    doc.setTextColor(71, 85, 105);
    doc.text(String(itm.quantity), margin + 104, currentY - rowHeight + 4.8, { align: "center" });

    doc.setTextColor(71, 85, 105);
    doc.text(formatCurrencyINR(itm.unitPrice), margin + 138, currentY - rowHeight + 4.8, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrencyINR(itm.amount), rightMarginX - 4, currentY - rowHeight + 4.8, { align: "right" });
    doc.setFont("helvetica", "normal");

    // Row bottom line
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, currentY, rightMarginX, currentY);
  }

  // Summary & Totals Block
  let summaryY = currentY + 6;
  const totalsLabelX = rightMarginX - 68;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Subtotal:", totalsLabelX, summaryY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrencyINR(invoice.amount), rightMarginX - 4, summaryY, { align: "right" });

  summaryY += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  if (invoice.tax > 0) {
    doc.text("Tax / GST (18%):", totalsLabelX, summaryY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrencyINR(invoice.tax), rightMarginX - 4, summaryY, { align: "right" });
  } else {
    doc.text("Tax / GST (0%):", totalsLabelX, summaryY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("INR 0.00", rightMarginX - 4, summaryY, { align: "right" });
  }

  summaryY += 3;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(totalsLabelX, summaryY, rightMarginX, summaryY);

  summaryY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Total:", totalsLabelX, summaryY);
  doc.text(formatCurrencyINR(invoice.totalAmount), rightMarginX - 4, summaryY, { align: "right" });

  summaryY += 2.5;
  doc.line(totalsLabelX, summaryY, rightMarginX, summaryY);

  // In Words
  summaryY += 7;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`In Words: ${numberToWordsINR(invoice.totalAmount)}`, margin, summaryY);

  // Commercial Terms & Conditions
  const termsY = Math.max(summaryY + 8, 184);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Terms & Conditions:", margin, termsY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const terms = [
    "1. Payment terms: 50% advance upon contract signing, 50% upon project handover and acceptance.",
    "2. Validity: This quotation is valid for 30 calendar days from the date of issue.",
    "3. Scope changes: Any features or changes requested outside the agreed scope will be quoted separately.",
    "4. Intellectual Property: Final source code, credentials, and digital deliverables transfer to the client upon full payment."
  ];

  let currentTermY = termsY + 4.5;
  terms.forEach(t => {
    doc.text(t, margin, currentTermY);
    currentTermY += 4;
  });

  // Dual Signatures
  const signY = 244;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);

  // Left Signature: Exocross
  doc.line(margin, signY, margin + 70, signY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Authorised signatory - Exocross", margin, signY + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatPDFDate(invoice.issueDate)}`, margin, signY + 9);

  // Right Signature: Client Acceptance
  doc.line(rightMarginX - 70, signY, rightMarginX, signY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Client acceptance (signature, name, date)", rightMarginX - 70, signY + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Date: ____________________", rightMarginX - 70, signY + 9);

  // Footer
  const footerY = 282;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, rightMarginX, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${compName}  |  Chennai, India  |  ${officialEmail}  |  ${website}`,
    pageWidth / 2,
    footerY + 4.5,
    { align: "center" }
  );

  doc.save(`EXOCROSS_Invoice_${invoice.invoiceNumber}.pdf`);
}

/**
 * Template 2: Modern Exocross Tech
 * High-tech modern IT services quote featuring section badges (PROJECT, TERMS, ACCEPTANCE),
 * itemized deliverable phase table (# | Description | Amount), highlighted total box,
 * and dual boxed signatory stamps.
 */
export function generateModernTechPDF(invoice: InvoicePDFData, org?: any) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 16;
  const contentWidth = pageWidth - margin * 2; // 178mm
  const rightMarginX = pageWidth - margin; // 194mm

  const compName = org?.companyName || "Exocross";
  const officialEmail = org?.officialEmail || "exocross.tech@gmail.com";
  const phone = org?.phone || "7604830742 / 8124473373";
  const website = org?.website || "exocross.com";
  const address = org?.addressLine1
    ? `${org.addressLine1}, ${org.addressLine2 ? org.addressLine2 + ", " : ""}${org.city || "Chennai"}, ${org.state || "Tamil Nadu"} - ${org.postalCode || "600001"}`
    : "Chennai, Tamil Nadu, India";

  // Top Left: Modern Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("QUOTATION", margin, 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("IT SERVICES & SOLUTIONS  |  CUSTOM FUTURE PRODUCTS", margin, 28);

  // Top Right: Meta Strip Card
  const metaCardW = 64;
  const metaCardH = 20;
  const metaCardX = rightMarginX - metaCardW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(metaCardX, 14, metaCardW, metaCardH, 1.5, 1.5, "FD");

  // Meta row 1: Quote No
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("QUOTE NO.", metaCardX + 4, 19.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.invoiceNumber || "EXO-002", metaCardX + metaCardW - 4, 19.5, { align: "right" });

  // Meta row 2: Date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("DATE", metaCardX + 4, 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(formatPDFDate(invoice.issueDate), metaCardX + metaCardW - 4, 25, { align: "right" });

  // Meta row 3: Valid Until
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("VALID UNTIL", metaCardX + 4, 30.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(formatPDFDate(invoice.dueDate), metaCardX + metaCardW - 4, 30.5, { align: "right" });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, 39, rightMarginX, 39);

  // Address Blocks: FROM / PREPARED FOR
  const col1X = margin;
  const col2X = margin + 92;

  // FROM
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("FROM", col1X, 45);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(compName, col1X, 50.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(address, col1X, 55.5);
  doc.text(phone, col1X, 60.5);
  doc.text(officialEmail, col1X, 65.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.text(website, col1X, 70.5);

  // PREPARED FOR
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("PREPARED FOR", col2X, 45);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.client.company || invoice.client.name, col2X, 50.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Attn: ${invoice.client.name}`, col2X, 55.5);

  const clientAddress = invoice.client.address || "Client Address on Record";
  const addressLines = doc.splitTextToSize(clientAddress, 85);
  doc.text(addressLines, col2X, 60.5);

  let clientMetaY = 60.5 + addressLines.length * 4.5;
  doc.text(invoice.client.email, col2X, clientMetaY);
  if (invoice.client.phone) {
    clientMetaY += 4.5;
    doc.text(invoice.client.phone, col2X, clientMetaY);
  }

  // Section 1: PROJECT BADGE
  const projectSectionY = Math.max(77, clientMetaY + 6);
  doc.setFillColor(37, 99, 235); // Electric Blue #2563EB
  doc.roundedRect(margin, projectSectionY, 22, 5.5, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("PROJECT", margin + 11, projectSectionY + 3.8, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const projectName = invoice.project?.name || invoice.description || "Enterprise Technical Architecture & Delivery";
  doc.text(projectName, margin + 26, projectSectionY + 4.2);

  // Deliverables Phase Table Header
  const tableY = projectSectionY + 8;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, tableY, contentWidth, 7, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("#", margin + 5, tableY + 4.8);
  doc.text("DESCRIPTION", margin + 20, tableY + 4.8);
  doc.text("AMOUNT (INR)", rightMarginX - 4, tableY + 4.8, { align: "right" });

  // Items Body
  const items = invoice.items && invoice.items.length > 0
    ? invoice.items
    : [{ description: invoice.description || "Enterprise IT Deliverables & Architecture", quantity: 1, unitPrice: invoice.amount, amount: invoice.amount }];

  let currentY = tableY + 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  for (let i = 0; i < items.length; i++) {
    const itm = items[i];
    const phaseIndex = String(i + 1).padStart(2, "0");
    const descLines = doc.splitTextToSize(itm.description, 135);
    const rowHeight = Math.max(7, descLines.length * 4.5 + 3);

    currentY += rowHeight;

    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY - rowHeight, contentWidth, rowHeight, "F");
    }

    // Numbering in Electric Blue
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(`# ${phaseIndex}`, margin + 5, currentY - rowHeight + 4.6);

    // Description
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(descLines, margin + 20, currentY - rowHeight + 4.6);

    // Amount
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrencyINR(itm.amount), rightMarginX - 4, currentY - rowHeight + 4.6, { align: "right" });

    // Row separator
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, currentY, rightMarginX, currentY);
  }

  // Summary & Highlighted Total Block
  let summaryY = currentY + 6;
  const totalsLabelX = rightMarginX - 70;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Subtotal:", totalsLabelX, summaryY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrencyINR(invoice.amount), rightMarginX - 4, summaryY, { align: "right" });

  summaryY += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  if (invoice.tax > 0) {
    doc.text("GST (18%):", totalsLabelX, summaryY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrencyINR(invoice.tax), rightMarginX - 4, summaryY, { align: "right" });
  } else {
    doc.text("GST (0%):", totalsLabelX, summaryY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("INR 0.00", rightMarginX - 4, summaryY, { align: "right" });
  }

  // Highlighted Total Box
  summaryY += 4;
  const totalBoxW = 72;
  const totalBoxH = 9.5;
  const totalBoxX = rightMarginX - totalBoxW;

  doc.setFillColor(15, 23, 42); // slate-900 Midnight Navy
  doc.roundedRect(totalBoxX, summaryY, totalBoxW, totalBoxH, 1.2, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL:", totalBoxX + 4, summaryY + 6.2);
  doc.setFontSize(10.5);
  doc.text(formatCurrencyINR(invoice.totalAmount), rightMarginX - 4, summaryY + 6.2, { align: "right" });

  // Section 2: TERMS BADGE
  const termsSectionY = Math.max(summaryY + 16, 178);
  doc.setFillColor(37, 99, 235); // Electric Blue
  doc.roundedRect(margin, termsSectionY, 18, 5, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("TERMS", margin + 9, termsSectionY + 3.6, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const terms = [
    "1. 50% advance on project kickoff, balance 50% upon final acceptance & deployment.",
    "2. Quote remains valid for 30 calendar days from the date of issuance.",
    "3. Additional features or scope modifications will be billed separately under mutual agreement."
  ];

  let termItemY = termsSectionY + 7;
  terms.forEach(t => {
    doc.text(t, margin, termItemY);
    termItemY += 4.2;
  });

  // Section 3: ACCEPTANCE BADGE
  const acceptSectionY = termItemY + 3;
  doc.setFillColor(2, 132, 199); // Sky / Cyan #0284C7
  doc.roundedRect(margin, acceptSectionY, 28, 5, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("ACCEPTANCE", margin + 14, acceptSectionY + 3.6, { align: "center" });

  // Dual Boxed Signatory Stamps
  const stampBoxY = acceptSectionY + 7.5;
  const stampBoxW = 86;
  const stampBoxH = 31;

  // Box 1 (Left - Exocross):
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, stampBoxY, stampBoxW, stampBoxH, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("For Exocross", margin + 4, stampBoxY + 5.5);

  // Digital verification stamp badge
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin + 4, stampBoxY + 8, 54, 5, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(5, 150, 105);
  doc.text("AUTHENTICATED & ISSUED", margin + 31, stampBoxY + 11.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Authorised Signatory", margin + 4, stampBoxY + 20);
  doc.text(`Date: ${formatPDFDate(invoice.issueDate)}`, margin + 4, stampBoxY + 25.5);

  // Box 2 (Right - Client Acceptance):
  const rightBoxX = rightMarginX - stampBoxW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightBoxX, stampBoxY, stampBoxW, stampBoxH, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Client Acceptance", rightBoxX + 4, stampBoxY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature / Name: _______________________", rightBoxX + 4, stampBoxY + 12);
  doc.text("Designation: ___________________________", rightBoxX + 4, stampBoxY + 18);
  doc.text("Date: __________________________________", rightBoxX + 4, stampBoxY + 24);

  // Modern Footer
  const footerY = 282;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY, rightMarginX, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${compName}  •  Innovative IT Solutions & Custom Future Products  •  ${website}`,
    pageWidth / 2,
    footerY + 4.5,
    { align: "center" }
  );

  doc.save(`EXOCROSS_Modern_Quote_${invoice.invoiceNumber}.pdf`);
}

/**
 * Main Invoice PDF Dispatcher
 * Allows selecting either modern tech template or corporate classic template.
 */
export function downloadInvoicePDF(
  invoice: InvoicePDFData,
  org?: any,
  template: InvoicePDFTemplate = "modern_tech"
) {
  if (template === "classic_corporate") {
    generateClassicCorporatePDF(invoice, org);
  } else {
    generateModernTechPDF(invoice, org);
  }
}


