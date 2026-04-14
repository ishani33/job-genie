"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { OUTREACH_STATUSES, OUTREACH_TYPES } from "@/lib/constants";
import { todayISO } from "@/lib/utils";
import { computeContactFollowUp } from "@/lib/follow-up-rules";
import type { Contact, OutreachStatus, OutreachType } from "@/types";

const OUTREACH_TYPE_OPTIONS = OUTREACH_TYPES.map((t) => ({
  value: t,
  label: t,
}));

const OUTREACH_STATUS_OPTIONS = OUTREACH_STATUSES.map((s) => ({
  value: s,
  label: s,
}));

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<Contact>;
  defaultCompany?: string;
  onSubmit: (data: Omit<Contact, "id" | "rowIndex">) => Promise<void>;
  mode?: "create" | "edit";
}

const EMPTY: Omit<Contact, "id" | "rowIndex"> = {
  companyName: "",
  contactName: "",
  contactRole: "",
  outreachType: "LinkedIn DM",
  outreachStatus: "Identified",
  followUpCount: 0,
  lastOutreachDate: "",
  followUpDate: "",
  notes: "",
  channelUrl: "",
};

export function ContactForm({
  open,
  onOpenChange,
  initial,
  defaultCompany,
  onSubmit,
  mode = "create",
}: ContactFormProps) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUpWarning, setFollowUpWarning] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY,
        lastOutreachDate: todayISO(),
        companyName: defaultCompany ?? "",
        ...initial,
      });
      setFollowUpWarning(null);
    }
  }, [open, initial, defaultCompany]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-compute follow-up when status changes
      if (key === "outreachStatus") {
        const existing = prev as Contact;
        const computed = computeContactFollowUp(
          { ...existing, id: "temp", rowIndex: 0 },
          value as OutreachStatus
        );
        setFollowUpWarning(computed.warning ?? null);
        return {
          ...next,
          followUpDate: computed.followUpDate,
          followUpCount: computed.followUpCount,
        };
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName || !form.contactName) {
      setError("Company name and contact name are required.");
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

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Add Contact" : "Edit Contact"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-md">
            {error}
          </div>
        )}
        {followUpWarning && (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs px-3 py-2 rounded-md">
            💡 {followUpWarning}
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
              Contact Name *
            </label>
            <input
              className="input-base w-full"
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[#9ca3af] font-medium">
            Contact Role / Title
          </label>
          <input
            className="input-base w-full"
            value={form.contactRole}
            onChange={(e) => set("contactRole", e.target.value)}
            placeholder="Senior Engineer"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-[#9ca3af] font-medium">
              Outreach Type
            </label>
            <Select
              value={form.outreachType}
              onValueChange={(v) => set("outreachType", v as OutreachType)}
              options={OUTREACH_TYPE_OPTIONS}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#9ca3af] font-medium">Status</label>
            <Select
              value={form.outreachStatus}
              onValueChange={(v) => set("outreachStatus", v as OutreachStatus)}
              options={OUTREACH_STATUS_OPTIONS}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-[#9ca3af] font-medium">
              Last Outreach Date
            </label>
            <input
              className="input-base w-full"
              type="date"
              value={form.lastOutreachDate}
              onChange={(e) => set("lastOutreachDate", e.target.value)}
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
            Channel URL
          </label>
          <input
            className="input-base w-full"
            value={form.channelUrl}
            onChange={(e) => set("channelUrl", e.target.value)}
            placeholder="https://linkedin.com/in/... or email"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[#9ca3af] font-medium">Notes</label>
          <textarea
            className="input-base w-full resize-none"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Met at YC meetup, works on infra team..."
          />
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
              ? "Add Contact"
              : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
