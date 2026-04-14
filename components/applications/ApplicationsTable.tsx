"use client";

import { useState, useMemo } from "react";
import { ExternalLink, Users, Trash2, Pencil, AlertTriangle, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { TierBadge, StatusBadge } from "@/components/ui/Badge";
import { FollowUpBadge, urgencyBorderClass } from "@/components/ui/FollowUpBadge";
import { Select } from "@/components/ui/Select";
import { formatDate, urgencySortScore } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Application, Tier, ApplicationStatus } from "@/types";

interface ApplicationsTableProps {
  applications: Application[];
  onRowClick: (app: Application) => void;
  onEdit: (app: Application) => void;
  onDelete: (app: Application) => void;
  onViewContacts: (companyName: string) => void;
  contactCountByCompany: Record<string, number>;
}

const TIER_FILTER_OPTIONS = [
  { value: "all", label: "All Tiers" },
  { value: "1", label: "Tier 1" },
  { value: "2", label: "Tier 2" },
  { value: "3", label: "Tier 3" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "deadend", label: "Dead Ends" },
  { value: "offer", label: "Offers" },
];

type SortKey = "urgency" | "company" | "role" | "tier" | "status" | "dateApplied";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={11} className="opacity-30 ml-0.5" />;
  return dir === "asc"
    ? <ChevronUp size={11} className="opacity-70 ml-0.5" />
    : <ChevronDown size={11} className="opacity-70 ml-0.5" />;
}

const ACTIVE_STATUSES = new Set(["Exploring", "Networking", "Applied", "Phone Screen", "Interview", "Response"]);
const DEAD_STATUSES = new Set(["Ghosted", "Rejected", "Move On", "On Hold", "No Response", "Withdrew"]);

export function ApplicationsTable({
  applications,
  onRowClick,
  onEdit,
  onDelete,
  onViewContacts,
  contactCountByCompany,
}: ApplicationsTableProps) {
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("urgency");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const base = applications.filter((app) => {
      if (tierFilter !== "all" && String(app.tier) !== tierFilter) return false;
      if (statusFilter === "active" && !ACTIVE_STATUSES.has(app.status)) return false;
      if (statusFilter === "deadend" && !DEAD_STATUSES.has(app.status)) return false;
      if (statusFilter === "offer" && !["Offer", "Accepted"].includes(app.status)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !app.companyName.toLowerCase().includes(q) &&
          !app.roleTitle.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });

    return [...base].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "urgency": {
          const sa = urgencySortScore(a.followUpDate);
          const sb = urgencySortScore(b.followUpDate);
          if (sa !== sb) return sa - sb;
          // Within overdue bucket: oldest first; future bucket: soonest first; none: alpha
          if (sa === 0 || sa === 3) {
            const da = a.followUpDate ?? "";
            const db = b.followUpDate ?? "";
            return da < db ? -1 : da > db ? 1 : 0;
          }
          if (sa === 4) return a.companyName.localeCompare(b.companyName);
          return 0;
        }
        case "company":
          return dir * a.companyName.localeCompare(b.companyName);
        case "role":
          return dir * a.roleTitle.localeCompare(b.roleTitle);
        case "tier":
          return dir * (a.tier - b.tier);
        case "status":
          return dir * a.status.localeCompare(b.status);
        case "dateApplied": {
          const da = a.dateApplied ?? "";
          const db = b.dateApplied ?? "";
          return dir * (da < db ? -1 : da > db ? 1 : 0);
        }
        default:
          return 0;
      }
    });
  }, [applications, tierFilter, statusFilter, search, sortKey, sortDir]);

  function th(label: string, key: SortKey) {
    return (
      <th
        className="table-header text-left cursor-pointer select-none"
        onClick={() => handleSort(key)}
      >
        <span className="inline-flex items-center gap-0.5">
          {label}
          <SortIcon active={sortKey === key} dir={sortDir} />
        </span>
      </th>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="input-base flex-1 min-w-[160px]"
          placeholder="Search company or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="w-36">
          <Select
            value={tierFilter}
            onValueChange={setTierFilter}
            options={TIER_FILTER_OPTIONS}
          />
        </div>
        <div className="w-40">
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {th("Company", "company")}
                {th("Role", "role")}
                {th("Tier", "tier")}
                {th("Status", "status")}
                {th("Applied", "dateApplied")}
                {th("Follow-up", "urgency")}
                <th className="table-header text-left">Contacts</th>
                <th className="table-header text-right"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="table-cell text-center text-[#4b5563] py-10"
                  >
                    No applications match these filters.
                  </td>
                </tr>
              )}
              {sorted.map((app) => {
                const contactCount =
                  contactCountByCompany[app.companyName.toLowerCase()] ?? 0;

                return (
                  <tr
                    key={app.id}
                    className="table-row"
                    onClick={() => onRowClick(app)}
                  >
                    {/* First cell carries the urgency left-border accent */}
                    <td className={cn("table-cell", urgencyBorderClass(app.followUpDate))}>
                      <div className="flex items-center gap-1.5">
                        {app.blacklisted && (
                          <AlertTriangle
                            size={12}
                            className="text-orange-400 shrink-0"
                            aria-label="Blacklisted"
                          />
                        )}
                        <span className="font-medium text-[#e8e8e8]">
                          {app.companyName}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell text-[#9ca3af]">
                      <div className="flex items-center gap-1">
                        {app.roleTitle}
                        {app.jdUrl && (
                          <a
                            href={app.jdUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#4b5563] hover:text-[#3b82f6] transition-colors"
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <TierBadge tier={app.tier} />
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="table-cell text-[#6b7280] text-xs">
                      {formatDate(app.dateApplied)}
                    </td>
                    <td className="table-cell">
                      <FollowUpBadge dateStr={app.followUpDate} />
                    </td>
                    <td className="table-cell">
                      {contactCount > 0 ? (
                        <button
                          className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-blue-300 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewContacts(app.companyName);
                          }}
                        >
                          <Users size={12} />
                          {contactCount}
                        </button>
                      ) : (
                        <span className="text-[#3a3a3a]">—</span>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      <div
                        className="flex items-center gap-1 justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="btn-ghost p-1.5"
                          onClick={() => onEdit(app)}
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="btn-ghost p-1.5 hover:text-red-400"
                          onClick={() => onDelete(app)}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[#4b5563]">
        {sorted.length} of {applications.length} applications
      </p>
    </div>
  );
}
