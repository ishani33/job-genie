"use client";

import { useMemo } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { buildAttentionQueue } from "@/lib/follow-up-rules";
import { PriorityBadge } from "@/components/ui/Badge";
import type { Application, Contact, AttentionItem } from "@/types";

interface NeedsAttentionQueueProps {
  applications: Application[];
  contacts: Contact[];
  onClickItem?: (item: AttentionItem) => void;
}

export function NeedsAttentionQueue({
  applications,
  contacts,
  onClickItem,
}: NeedsAttentionQueueProps) {
  const queue = useMemo(
    () => buildAttentionQueue(applications, contacts),
    [applications, contacts]
  );

  if (queue.length === 0) {
    return (
      <div className="card px-4 py-6 text-center">
        <div className="text-[#4b5563] text-sm flex flex-col items-center gap-2">
          <Clock size={20} className="opacity-50" />
          <span>All clear — nothing needs attention today.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
        <AlertCircle size={14} className="text-orange-400" />
        <span className="text-sm font-medium text-[#e8e8e8]">
          Needs Attention
        </span>
        <span className="text-xs text-[#6b7280] ml-auto">
          {queue.length} item{queue.length !== 1 ? "s" : ""}
        </span>
      </div>
      <ul>
        {queue.map((item) => (
          <li
            key={`${item.type}-${item.id}`}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-[#2a2a2a] last:border-0
                       hover:bg-[#1e1e1e] cursor-pointer transition-colors"
            onClick={() => onClickItem?.(item)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#e8e8e8] truncate">{item.label}</p>
              <p className="text-xs text-[#6b7280] truncate">{item.reason}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-[#4b5563] uppercase tracking-wider">
                {item.type}
              </span>
              <PriorityBadge priority={item.priority} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
