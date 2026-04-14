"use client";

import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  getFollowUpUrgency,
  daysOverdue,
  addDays,
  todayISO,
} from "@/lib/utils";

function shortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}

interface FollowUpBadgeProps {
  dateStr: string | null | undefined;
  className?: string;
}

export function FollowUpBadge({ dateStr, className }: FollowUpBadgeProps) {
  if (!dateStr) {
    return <span className={cn("text-[#3a3a3a] text-xs", className)}>—</span>;
  }

  const urgency = getFollowUpUrgency(dateStr);

  let label: string;
  let styles: string;

  switch (urgency) {
    case "overdue": {
      const d = daysOverdue(dateStr);
      label = `Overdue ${d}d`;
      styles = "bg-red-500/12 text-red-400 border-red-500/25";
      break;
    }
    case "today":
      label = "Today";
      styles = "bg-orange-500/12 text-orange-400 border-orange-500/25";
      break;
    case "soon": {
      const tomorrowISO = addDays(todayISO(), 1);
      label = dateStr === tomorrowISO ? "Tomorrow" : "In 2d";
      styles = "bg-yellow-500/12 text-yellow-400 border-yellow-500/25";
      break;
    }
    case "future":
      label = shortDate(dateStr);
      styles = "bg-transparent text-[#6b7280] border-transparent";
      break;
    default:
      return <span className={cn("text-[#3a3a3a] text-xs", className)}>—</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap",
        styles,
        className
      )}
    >
      {label}
    </span>
  );
}

/** Left-border class for a table row's first <td> based on urgency. */
export function urgencyBorderClass(dateStr: string | null | undefined): string {
  const urgency = getFollowUpUrgency(dateStr);
  switch (urgency) {
    case "overdue": return "border-l-[3px] border-red-500/60";
    case "today":   return "border-l-[3px] border-orange-500/55";
    case "soon":    return "border-l-[3px] border-yellow-500/50";
    default:        return "border-l-[3px] border-transparent";
  }
}
