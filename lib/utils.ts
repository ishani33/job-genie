import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return "—";
    return format(d, "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const d = parseISO(dateStr);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return dateStr < todayISO();
}

export function isDueToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return dateStr === todayISO();
}

export function isDueSoon(dateStr: string | null | undefined, days = 2): boolean {
  if (!dateStr) return false;
  const today = todayISO();
  const future = addDays(today, days);
  return dateStr > today && dateStr <= future;
}

export type FollowUpUrgency = "overdue" | "today" | "soon" | "future" | "none";

export function getFollowUpUrgency(
  dateStr: string | null | undefined
): FollowUpUrgency {
  if (!dateStr) return "none";
  const today = todayISO();
  if (dateStr < today) return "overdue";
  if (dateStr === today) return "today";
  if (dateStr <= addDays(today, 2)) return "soon";
  return "future";
}

export function daysOverdue(dateStr: string): number {
  return Math.round(
    (parseISO(todayISO()).getTime() - parseISO(dateStr).getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

/** Numeric sort weight: overdue=0, today=1, soon=2, future=3, none=4 */
export function urgencySortScore(dateStr: string | null | undefined): number {
  switch (getFollowUpUrgency(dateStr)) {
    case "overdue": return 0;
    case "today":   return 1;
    case "soon":    return 2;
    case "future":  return 3;
    default:        return 4;
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
