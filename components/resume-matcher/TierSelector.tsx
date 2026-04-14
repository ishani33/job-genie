"use client";

import { cn } from "@/lib/utils";
import type { Tier } from "@/types";

interface TierSelectorProps {
  value: Tier;
  onChange: (tier: Tier) => void;
}

const TIERS: { value: Tier; label: string; desc: string; color: string }[] = [
  {
    value: 1,
    label: "T1",
    desc: "Full match + bullet suggestions",
    color: "border-tier1 bg-tier1-light text-tier1-text",
  },
  {
    value: 2,
    label: "T2",
    desc: "Match + optional customization",
    color: "border-tier2 bg-tier2-light text-tier2-text",
  },
  {
    value: 3,
    label: "T3",
    desc: "Manual pick — no AI",
    color: "border-tier3 bg-tier3-light text-tier3-text",
  },
];

export function TierSelector({ value, onChange }: TierSelectorProps) {
  return (
    <div className="flex gap-2">
      {TIERS.map((tier) => (
        <button
          key={tier.value}
          type="button"
          onClick={() => onChange(tier.value)}
          className={cn(
            "flex-1 rounded-lg border-2 px-3 py-2.5 text-left transition-all",
            value === tier.value
              ? tier.color + " border-opacity-100"
              : "border-[#2a2a2a] bg-[#1a1a1a] text-[#6b7280] hover:border-[#3a3a3a] hover:text-[#9ca3af]"
          )}
        >
          <p className="text-sm font-semibold">{tier.label}</p>
          <p className="text-[11px] mt-0.5 leading-tight">{tier.desc}</p>
        </button>
      ))}
    </div>
  );
}
