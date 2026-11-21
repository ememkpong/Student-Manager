import type { Weekday } from "../types";

export const WEEKDAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const FULL_WEEKDAY_NAMES: Record<Weekday, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export function getWeekdayFromDate(date: Date): Weekday {
  const map: Weekday[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return map[date.getDay()];
}

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysToISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatISODate(dt);
}

export function getCurrentWeekDates(baseDate: Date = new Date()): Record<Weekday, string> {
  const dayIndex = baseDate.getDay(); // 0 Sun .. 6 Sat
  const diffToMonday = dayIndex === 0 ? -6 : 1 - dayIndex;
  const monday = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + diffToMonday);
  const result = {} as Record<Weekday, string>;
  WEEKDAYS.forEach((wd, idx) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
    result[wd] = formatISODate(d);
  });
  return result;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesToDurationLabel(minutes: number): string {
  if (minutes < 0) return "0m";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatFriendlyDate(isoDate: string): string {
  if (!isoDate) return "";
  const today = formatISODate(new Date());
  const tomorrow = addDaysToISO(today, 1);
  if (isoDate === today) return "Today";
  if (isoDate === tomorrow) return "Tomorrow";
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `₦${(amount / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `₦${Math.round(amount)}`;
}

export function getCurrentMonthPrefix(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getPreviousMonthPrefix(date: Date = new Date()): string {
  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthPrefix: string): string {
  const [y, m] = monthPrefix.split("-").map(Number);
  if (!y || !m) return monthPrefix;
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function getDaysRemainingInMonth(date: Date = new Date()): number {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Math.max(1, lastDay - date.getDate() + 1);
}
