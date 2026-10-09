/**
 * Standardized Date Formatting Utility
 * Enforces DD-MM-YYYY format across all EC HYBRID enterprise modules
 */

export function formatDate(date: string | number | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}

export function formatDateTime(date: string | number | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";

  const datePart = formatDate(d);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");

  return `${datePart} ${hours}:${mins}`;
}

export function toInputDateFormat(date: string | number | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${year}-${month}-${day}`;
}
