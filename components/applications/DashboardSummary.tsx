"use client";

import { useMemo } from "react";
import type { Application } from "@/types";
import {
  IN_FLIGHT_STATUSES,
  OFFER_STATUSES,
  DEAD_END_STATUSES,
} from "@/lib/constants";

interface DashboardSummaryProps {
  applications: Application[];
}

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="card px-4 py-3 flex items-center justify-between">
      <span className="text-[#9ca3af] text-xs font-medium">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

export function DashboardSummary({ applications }: DashboardSummaryProps) {
  const stats = useMemo(() => {
    let t1 = 0, t2 = 0, t3 = 0, offers = 0, ghosted = 0;
    for (const app of applications) {
      if (IN_FLIGHT_STATUSES.has(app.status)) {
        if (app.tier === 1) t1++;
        else if (app.tier === 2) t2++;
        else t3++;
      }
      if (OFFER_STATUSES.has(app.status)) offers++;
      if (app.status === "Ghosted") ghosted++;
    }
    return { t1, t2, t3, offers, ghosted, total: applications.length };
  }, [applications]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      <StatCard label="Total" value={stats.total} color="text-[#e8e8e8]" />
      <StatCard label="T1 in flight" value={stats.t1} color="text-tier1" />
      <StatCard label="T2 in flight" value={stats.t2} color="text-tier2" />
      <StatCard label="T3 in flight" value={stats.t3} color="text-[#9ca3af]" />
      <StatCard label="Offers" value={stats.offers} color="text-status-offer" />
      <StatCard label="Ghosted" value={stats.ghosted} color="text-status-deadend" />
    </div>
  );
}
