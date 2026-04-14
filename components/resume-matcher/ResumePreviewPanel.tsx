"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import type { MatchResult } from "@/types/resume-matcher";

interface ResumePreviewPanelProps {
  match: MatchResult;
  fullResumeText: string;
}

export function ResumePreviewPanel({
  match,
  fullResumeText,
}: ResumePreviewPanelProps) {
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  async function handleOpenInWord() {
    setOpening(true);
    setOpenError(null);
    try {
      const res = await fetch("/api/resume-matcher/open-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: match.filePath }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to open");
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : "Failed to open file");
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider">
            Matched Resume
          </p>
          <p className="text-sm text-[#9ca3af] mt-0.5">
            {match.companyFolder} / CHAUHAN_ISHANI_RESUME.docx
          </p>
        </div>
        <button
          className="btn-secondary flex items-center gap-1.5 shrink-0"
          onClick={handleOpenInWord}
          disabled={opening}
        >
          {opening ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <ExternalLink size={12} />
          )}
          Open in Word
        </button>
      </div>

      {openError && (
        <p className="text-xs text-red-400 mb-2">{openError}</p>
      )}

      {/* Resume text */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
        <pre className="text-xs text-[#9ca3af] leading-relaxed whitespace-pre-wrap font-sans">
          {fullResumeText}
        </pre>
      </div>
    </div>
  );
}
