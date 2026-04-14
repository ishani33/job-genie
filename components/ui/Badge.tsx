"use client";

import { cn } from "@/lib/utils";
import {
  STATUS_CATEGORY,
  NETWORKING_STATUS_CATEGORY,
  TIER_LABELS,
} from "@/lib/constants";
import type { Tier, ApplicationStatus, OutreachStatus } from "@/types";

// ─── Tier Badge ───────────────────────────────────────────────────────────────

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

const TIER_STYLES: Record<Tier, string> = {
  1: "bg-tier1-light text-tier1-text border-tier1/30",
  2: "bg-tier2-light text-tier2-text border-tier2/30",
  3: "bg-tier3-light text-tier3-text border-tier3/30",
};

export function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        TIER_STYLES[tier],
        className
      )}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: ApplicationStatus | OutreachStatus | string;
  variant?: "application" | "networking";
  className?: string;
}

const CATEGORY_STYLES = {
  active: "bg-status-active-light text-status-active border-status-active/30",
  deadend:
    "bg-status-deadend-light text-status-deadend border-status-deadend/30",
  offer: "bg-status-offer-light text-status-offer border-status-offer/30",
  neutral: "bg-[#1e1e1e] text-[#9ca3af] border-[#2a2a2a]",
};

export function StatusBadge({
  status,
  variant = "application",
  className,
}: StatusBadgeProps) {
  const categoryMap =
    variant === "networking" ? NETWORKING_STATUS_CATEGORY : STATUS_CATEGORY;
  const category =
    (categoryMap as Record<string, string>)[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        CATEGORY_STYLES[category as keyof typeof CATEGORY_STYLES],
        className
      )}
    >
      {status}
    </span>
  );
}

// ─── Warning Badge ────────────────────────────────────────────────────────────

interface WarningBadgeProps {
  label: string;
  className?: string;
}

export function WarningBadge({ label, className }: WarningBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
        "bg-orange-500/10 text-orange-400 border border-orange-500/20",
        className
      )}
    >
      ⚠ {label}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

interface PriorityBadgeProps {
  priority: 1 | 2 | 3 | 4;
  className?: string;
}

const PRIORITY_STYLES: Record<number, string> = {
  1: "bg-red-500/10 text-red-400 border-red-500/20",
  2: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  3: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  4: "bg-[#1e1e1e] text-[#9ca3af] border-[#2a2a2a]",
};

const PRIORITY_LABELS: Record<number, string> = {
  1: "Overdue",
  2: "Action needed",
  3: "Due today",
  4: "Coming up",
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        PRIORITY_STYLES[priority],
        className
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
