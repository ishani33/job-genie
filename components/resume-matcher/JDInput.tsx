"use client";

import { useState } from "react";
import { Loader2, Link2, FileText } from "lucide-react";
import { TierSelector } from "./TierSelector";
import { cn } from "@/lib/utils";
import type { Tier } from "@/types";
import type { JDInputMode } from "@/types/resume-matcher";

interface JDInputProps {
  onSubmit: (params: {
    jdText: string;
    tier: Tier;
    companyName: string;
  }) => void;
  defaultTier?: Tier;
  defaultCompany?: string;
  defaultJdUrl?: string;
}

export function JDInput({
  onSubmit,
  defaultTier = 1,
  defaultCompany = "",
  defaultJdUrl = "",
}: JDInputProps) {
  const [inputMode, setInputMode] = useState<JDInputMode>(
    defaultJdUrl ? "url" : "paste"
  );
  const [tier, setTier] = useState<Tier>(defaultTier);
  const [companyName, setCompanyName] = useState(defaultCompany);
  const [jdText, setJdText] = useState("");
  const [jdUrl, setJdUrl] = useState(defaultJdUrl);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let finalText = jdText.trim();

    if (inputMode === "url") {
      if (!jdUrl.trim()) return;
      setFetching(true);
      setFetchError(null);
      try {
        const res = await fetch("/api/jd/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: jdUrl.trim() }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to fetch JD");
        finalText = json.data.text;
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Fetch failed");
        setFetching(false);
        return;
      } finally {
        setFetching(false);
      }
    }

    if (!finalText) return;
    onSubmit({ jdText: finalText, tier, companyName });
  }

  const canSubmit = inputMode === "url" ? !!jdUrl.trim() : !!jdText.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Tier selector — prominent at top */}
      <div className="space-y-1.5">
        <label className="text-xs text-[#9ca3af] font-medium uppercase tracking-wider">
          Tier
        </label>
        <TierSelector value={tier} onChange={setTier} />
      </div>

      {/* Company name */}
      <div className="space-y-1.5">
        <label className="text-xs text-[#9ca3af] font-medium uppercase tracking-wider">
          Company Name
        </label>
        <input
          className="input-base w-full"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Stripe"
        />
        <p className="text-[11px] text-[#4b5563]">
          Used as the folder name when saving the tailored resume.
        </p>
      </div>

      {/* JD input toggle */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 p-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setInputMode("paste")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              inputMode === "paste"
                ? "bg-[#252525] text-[#e8e8e8]"
                : "text-[#6b7280] hover:text-[#9ca3af]"
            )}
          >
            <FileText size={12} />
            Paste JD text
          </button>
          <button
            type="button"
            onClick={() => setInputMode("url")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              inputMode === "url"
                ? "bg-[#252525] text-[#e8e8e8]"
                : "text-[#6b7280] hover:text-[#9ca3af]"
            )}
          >
            <Link2 size={12} />
            Enter URL
          </button>
        </div>

        {inputMode === "paste" ? (
          <textarea
            className="input-base w-full resize-none font-mono text-xs leading-relaxed"
            rows={10}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the full job description here..."
          />
        ) : (
          <div className="space-y-1.5">
            <input
              className="input-base w-full"
              type="url"
              value={jdUrl}
              onChange={(e) => setJdUrl(e.target.value)}
              placeholder="https://jobs.stripe.com/..."
            />
            {fetchError && (
              <p className="text-xs text-red-400">{fetchError}</p>
            )}
            <p className="text-[11px] text-[#4b5563]">
              The app fetches and extracts the JD text automatically.
            </p>
          </div>
        )}
      </div>

      <button
        type="submit"
        className="btn-primary w-full flex items-center justify-center gap-2"
        disabled={!canSubmit || fetching}
      >
        {fetching && <Loader2 size={14} className="animate-spin" />}
        {fetching
          ? "Fetching JD..."
          : tier === 3
          ? "Find Resumes"
          : "Find Best Match"}
      </button>
    </form>
  );
}
