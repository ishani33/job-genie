"use client";

import { FileText, Sparkles } from "lucide-react";
import type { MatchResult } from "@/types/resume-matcher";
import type { Tier } from "@/types";

interface MatchResultCardProps {
  match: MatchResult;
  tier: Tier;
  onReuseAsIs: () => void;
  onCustomize: () => void;
  loadingSuggestions?: boolean;
}

export function MatchResultCard({
  match,
  tier,
  onReuseAsIs,
  onCustomize,
  loadingSuggestions,
}: MatchResultCardProps) {
  return (
    <div className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-[#3b82f6]/10 flex items-center justify-center shrink-0">
          <Sparkles size={14} className="text-[#3b82f6]" />
        </div>
        <div>
          <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider">
            Best Match
          </p>
          <p className="text-sm font-semibold text-[#e8e8e8]">
            {match.companyFolder} / CHAUHAN_ISHANI_RESUME.docx
          </p>
        </div>
      </div>

      {/* Reasoning */}
      <p className="text-sm text-[#9ca3af] leading-relaxed border-l-2 border-[#3b82f6]/30 pl-3">
        {match.reasoning}
      </p>

      {/* Action buttons */}
      {tier === 1 ? (
        // T1: auto-proceed to suggestions (shown via loading state)
        <div className="flex items-center gap-2 text-xs text-[#6b7280]">
          {loadingSuggestions ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin shrink-0" />
              Generating bullet suggestions...
            </>
          ) : (
            <span className="text-[#4b5563]">Suggestions ready below ↓</span>
          )}
        </div>
      ) : (
        // T2: two choices
        <div className="flex gap-2 pt-1">
          <button
            className="btn-secondary flex-1 flex items-center justify-center gap-1.5"
            onClick={onReuseAsIs}
          >
            <FileText size={13} />
            Reuse As-Is
          </button>
          <button
            className="btn-primary flex-1 flex items-center justify-center gap-1.5"
            onClick={onCustomize}
            disabled={loadingSuggestions}
          >
            {loadingSuggestions ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={13} />
                Customize
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
