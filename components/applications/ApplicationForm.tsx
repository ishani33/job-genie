"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  TIER1_STATUSES,
  TIER2_STATUSES,
  TIER3_STATUSES,
} from "@/lib/constants";
import { todayISO } from "@/lib/utils";
import type { Application, Tier } from "@/types";

const TIER_OPTIONS = [
  { value: "1", label: "Tier 1 — Dream Fit" },
  { value: "2", label: "Tier 2 — Strong Match" },
  { value: "3", label: "Tier 3 — Spray" },
];

function getStatusOptions(tier: Tier) {
  const statuses =
    tier === 1 ? TIER1_STATUSES : tier === 2 ? TIER2_STATUSES : TIER3_STATUSES;
  return statuses.map((s) => ({ value: s, label: s }));
}

interface ApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<Application>;
  onSubmit: (
    data: Omit<Application, "id" | "rowIndex" | "dateAdded">
  ) => Promise<void>;
  mode?: "create" | "edit";
}

const EMPTY: Omit<Application, "id" | "rowIndex" | "dateAdded"> = {
  companyName: "",
  roleTitle: "",
  jdUrl: "",
  tier: 3,
  status: "Applied",
  dateApplied: "",
  resumeVersionUsed: "",
  followUpDate: "",
  notes: "",
  blacklisted: false,
};

export function ApplicationForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
  mode = "create",
}: ApplicationFormProps) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) setForm({ ...EMPTY, dateAdded: todayISO(), ...initial });
  }, [open, initial]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Reset status when tier changes
    if (key === "tier") {
      const statuses =
        value === 1
          ? TIER1_STATUSES
          : value === 2
          ? TIER2_STATUSES
          : TIER3_STATUSES;
      setForm((prev) => ({ ...prev, tier: value as Tier, status: statuses[0] }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName || !form.roleTitle) {
      setError("Company name and role title are required.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onSubmit(form);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const statusOptions = getStatusOptions(form.tier);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Add Application" : "Edit Application"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-[#9ca3af] font-medium">
              Company Name *
            </label>
            <input
              className="input-base w-full"
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="Stripe"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#9ca3af] font-medium">
              Role Title *
            </label>
            <input
              className="input-base w-full"
              value={form.roleTitle}
              onChange={(e) => set("roleTitle", e.target.value)}
              placeholder="Senior Software Engineer"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[#9ca3af] font-medium">JD URL</label>
          <input
            className="input-base w-full"
            value={form.jdUrl}
            onChange={(e) => set("jdUrl", e.target.value)}
            placeholder="https://..."
            type="url"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-[#9ca3af] font-medium">Tier</label>
            <Select
              value={String(form.tier)}
              onValueChange={(v) => set("tier", Number(v) as Tier)}
              options={TIER_OPTIONS}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#9ca3af] font-medium">Status</label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                set("status", v as Application["status"])
              }
              options={statusOptions}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-[#9ca3af] font-medium">
              Date Applied
            </label>
            <input
              className="input-base w-full"
              type="date"
              value={form.dateApplied}
              onChange={(e) => set("dateApplied", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#9ca3af] font-medium">
              Follow-up Date
            </label>
            <input
              className="input-base w-full"
              type="date"
              value={form.followUpDate}
              onChange={(e) => set("followUpDate", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[#9ca3af] font-medium">
            Resume Version
          </label>
          <div className="flex gap-2">
            <input
              className="input-base flex-1"
              value={form.resumeVersionUsed}
              onChange={(e) => set("resumeVersionUsed", e.target.value)}
              placeholder="e.g. Stripe (folder name)"
            />
            <button
              type="button"
              title="Open Resume Matcher"
              className="btn-secondary flex items-center gap-1.5 shrink-0 px-3"
              onClick={() => {
                const params = new URLSearchParams();
                if (form.companyName) params.set("company", form.companyName);
                if (form.jdUrl) params.set("jdUrl", form.jdUrl);
                router.push(`/resume-matcher?${params.toString()}`);
              }}
            >
              <Wand2 size={13} />
              Match
            </button>
          </div>
          <p className="text-[11px] text-[#4b5563]">
            Enter the company folder name from ~/OneDrive/Resumes/, or use Match to find the best resume.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[#9ca3af] font-medium">Notes</label>
          <textarea
            className="input-base w-full resize-none"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Any notes about this role..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="blacklisted"
            checked={form.blacklisted}
            onChange={(e) => set("blacklisted", e.target.checked)}
            className="rounded border-[#2a2a2a] bg-[#1e1e1e]"
          />
          <label htmlFor="blacklisted" className="text-xs text-[#9ca3af]">
            Blacklist this company
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2a2a]">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? "Saving..."
              : mode === "create"
              ? "Add Application"
              : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
