"use client";

import { useState, useMemo, Fragment } from "react";
import {
  ExternalLink,
  Trash2,
  Pencil,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { StatusBadge, WarningBadge } from "@/components/ui/Badge";
import { FollowUpBadge, urgencyBorderClass } from "@/components/ui/FollowUpBadge";
import { Select } from "@/components/ui/Select";
import { MessageGenerator } from "@/components/networking/MessageGenerator";
import { formatDate, urgencySortScore } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { FOLLOW_UP_RULES } from "@/lib/constants";
import type { Contact, Application, OutreachStatus } from "@/types";

interface NetworkingTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onContactUpdate: (updated: Contact) => void;
  applications?: Application[];
}

const ALL_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  ...[
    "Identified",
    "Outreach Sent",
    "Connected/Accepted",
    "Replied",
    "Meeting Scheduled",
    "Meeting Done",
    "Asked for Referral",
    "Referred",
    "Ghosted",
    "Move On",
  ].map((s) => ({ value: s, label: s })),
];

type SortKey = "urgency" | "name" | "company" | "status" | "lastOutreach";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={11} className="opacity-30 ml-0.5" />;
  return dir === "asc" ? (
    <ChevronUp size={11} className="opacity-70 ml-0.5" />
  ) : (
    <ChevronDown size={11} className="opacity-70 ml-0.5" />
  );
}

const COL_SPAN = 8;

export function NetworkingTable({
  contacts,
  onEdit,
  onDelete,
  onContactUpdate,
  applications = [],
}: NetworkingTableProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("urgency");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const companies = useMemo(() => {
    const set = new Set(contacts.map((c) => c.companyName));
    return Array.from(set).sort();
  }, [contacts]);

  const companyOptions = useMemo(
    () => [
      { value: "all", label: "All Companies" },
      ...companies.map((c) => ({ value: c, label: c })),
    ],
    [companies]
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const base = contacts.filter((c) => {
      if (companyFilter !== "all" && c.companyName !== companyFilter) return false;
      if (statusFilter !== "all" && c.outreachStatus !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.contactName.toLowerCase().includes(q) &&
          !c.companyName.toLowerCase().includes(q) &&
          !c.contactRole.toLowerCase().includes(q)
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
          if (sa === 0 || sa === 3) {
            const da = a.followUpDate ?? "", db = b.followUpDate ?? "";
            return da < db ? -1 : da > db ? 1 : 0;
          }
          if (sa === 4) return a.contactName.localeCompare(b.contactName);
          return 0;
        }
        case "name":
          return dir * a.contactName.localeCompare(b.contactName);
        case "company":
          return dir * a.companyName.localeCompare(b.companyName);
        case "status":
          return dir * a.outreachStatus.localeCompare(b.outreachStatus);
        case "lastOutreach": {
          const da = a.lastOutreachDate ?? "", db = b.lastOutreachDate ?? "";
          return dir * (da < db ? -1 : da > db ? 1 : 0);
        }
        default:
          return 0;
      }
    });
  }, [contacts, companyFilter, statusFilter, search, sortKey, sortDir]);

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

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="input-base flex-1 min-w-[160px]"
          placeholder="Search name, company, role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="w-44">
          <Select
            value={companyFilter}
            onValueChange={setCompanyFilter}
            options={companyOptions}
          />
        </div>
        <div className="w-48">
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={ALL_STATUS_OPTIONS}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {th("Contact", "name")}
                {th("Company", "company")}
                <th className="table-header text-left">Type</th>
                {th("Status", "status")}
                <th className="table-header text-left">Follow-ups</th>
                {th("Last Outreach", "lastOutreach")}
                {th("Follow-up Due", "urgency")}
                <th className="table-header text-right"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={COL_SPAN}
                    className="table-cell text-center text-[#4b5563] py-10"
                  >
                    No contacts match these filters.
                  </td>
                </tr>
              )}
              {sorted.map((contact) => {
                const expanded = expandedId === contact.id;
                const considerMovingOn =
                  contact.followUpCount >= FOLLOW_UP_RULES.CONSIDER_MOVING_ON_COUNT &&
                  !["Referred", "Ghosted", "Move On"].includes(contact.outreachStatus);
                const referralPrompt = contact.outreachStatus === "Meeting Done";

                // Find a linked application for the same company (optional context)
                const linkedApp =
                  applications.find(
                    (a) =>
                      a.companyName.toLowerCase() === contact.companyName.toLowerCase()
                  ) ?? null;

                return (
                  <Fragment key={contact.id}>
                    {/* ── Contact row ─────────────────────────────── */}
                    <tr
                      className={cn(
                        "table-row",
                        expanded && "bg-[#1e1e1e]"
                      )}
                    >
                      {/* First cell: urgency left-border accent */}
                      <td className={cn("table-cell", urgencyBorderClass(contact.followUpDate))}>
                        <div className="flex items-center gap-1.5">
                          <div>
                            <p className="font-medium text-[#e8e8e8]">
                              {contact.contactName}
                            </p>
                            <p className="text-xs text-[#6b7280]">
                              {contact.contactRole}
                            </p>
                          </div>
                          {contact.channelUrl && (
                            <a
                              href={contact.channelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#4b5563] hover:text-[#3b82f6] transition-colors"
                            >
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="table-cell text-[#9ca3af]">
                        {contact.companyName}
                      </td>
                      <td className="table-cell">
                        <span className="text-xs text-[#6b7280] bg-[#1e1e1e] border border-[#2a2a2a] px-2 py-0.5 rounded">
                          {contact.outreachType}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-col gap-1">
                          <StatusBadge
                            status={contact.outreachStatus}
                            variant="networking"
                          />
                          {considerMovingOn && (
                            <WarningBadge label="Consider Moving On" />
                          )}
                          {referralPrompt && (
                            <span className="text-[10px] text-orange-400">
                              👋 Ask for referral?
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell text-center">
                        <span
                          className={cn(
                            "text-xs font-mono",
                            contact.followUpCount >= FOLLOW_UP_RULES.CONSIDER_MOVING_ON_COUNT
                              ? "text-orange-400"
                              : "text-[#6b7280]"
                          )}
                        >
                          {contact.followUpCount}
                        </span>
                      </td>
                      <td className="table-cell text-[#6b7280] text-xs">
                        {formatDate(contact.lastOutreachDate)}
                      </td>
                      <td className="table-cell">
                        <FollowUpBadge dateStr={contact.followUpDate} />
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center gap-0.5 justify-end">
                          {/* Generate Message button */}
                          <button
                            className={cn(
                              "btn-ghost p-1.5 transition-colors",
                              expanded
                                ? "text-[#3b82f6]"
                                : "text-[#4b5563] hover:text-[#9ca3af]"
                            )}
                            onClick={() => toggleExpand(contact.id)}
                            title={expanded ? "Close message generator" : "Generate message"}
                          >
                            <MessageSquare size={13} />
                          </button>
                          <button
                            className="btn-ghost p-1.5"
                            onClick={() => onEdit(contact)}
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="btn-ghost p-1.5 hover:text-red-400"
                            onClick={() => onDelete(contact)}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Inline message generator panel ──────────── */}
                    {expanded && (
                      <tr>
                        <td colSpan={COL_SPAN} className="p-0">
                          <MessageGenerator
                            contact={contact}
                            application={linkedApp}
                            onContactUpdate={onContactUpdate}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[#4b5563]">
        {sorted.length} of {contacts.length} contacts
      </p>
    </div>
  );
}
