"use client";

import { X, ExternalLink, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { Contact } from "@/types";

interface CompanyContactsPanelProps {
  companyName: string;
  contacts: Contact[];
  onClose: () => void;
}

export function CompanyContactsPanel({
  companyName,
  contacts,
  onClose,
}: CompanyContactsPanelProps) {
  return (
    <div className="w-80 shrink-0 border-l border-[#2a2a2a] bg-[#111111] flex flex-col animate-slide-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[#6b7280]" />
          <span className="text-sm font-medium text-[#e8e8e8] truncate">
            {companyName}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-[#252525] text-[#6b7280] hover:text-[#e8e8e8] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Contacts list */}
      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="px-4 py-8 text-center text-[#4b5563] text-xs">
            No contacts at {companyName} yet.
          </div>
        ) : (
          <ul className="divide-y divide-[#2a2a2a]">
            {contacts.map((contact) => (
              <li key={contact.id} className="px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#e8e8e8] truncate">
                      {contact.contactName}
                    </p>
                    <p className="text-xs text-[#6b7280] truncate">
                      {contact.contactRole}
                    </p>
                  </div>
                  {contact.channelUrl && (
                    <a
                      href={contact.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded hover:bg-[#252525] text-[#6b7280] hover:text-[#3b82f6] transition-colors shrink-0"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <StatusBadge
                    status={contact.outreachStatus}
                    variant="networking"
                  />
                  {contact.lastOutreachDate && (
                    <span className="text-[10px] text-[#4b5563]">
                      Last: {formatDate(contact.lastOutreachDate)}
                    </span>
                  )}
                </div>
                {contact.followUpCount >= 3 &&
                  !["Referred", "Ghosted", "Move On"].includes(
                    contact.outreachStatus
                  ) && (
                    <p className="mt-1 text-[10px] text-orange-400">
                      ⚠ Consider moving on
                    </p>
                  )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
