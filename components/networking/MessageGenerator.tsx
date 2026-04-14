"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Contact, Application } from "@/types";
import type {
  MessageType,
  ResearchResult,
  CacheInfo,
} from "@/app/api/networking/generate-message/route";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Variant {
  subject?: string;
  body: string;
}

interface GenerateResult {
  research: ResearchResult;
  variants: { A: Variant; B: Variant; C: Variant };
  messageType: MessageType;
  channel: "LinkedIn DM" | "Email";
  cacheInfo?: CacheInfo;
}

// Connection requests have a 200-char limit (per writing style guide)
const CHAR_LIMIT: Record<MessageType, number | null> = {
  connection_request: 200,
  first_dm: null,
  followup: null,
  conversation_continuation: null,
  confirmation: null,
  thank_you_referral: null,
  final_nudge: null,
};

function charCount(v: Variant): number {
  return v.body.length + (v.subject ? v.subject.length + 2 : 0);
}

// ─── Single variant box ───────────────────────────────────────────────────────

function VariantBox({
  label,
  variant,
  messageType,
  isEmail,
  onChange,
  onCopy,
  copied,
}: {
  label: "A" | "B" | "C";
  variant: Variant;
  messageType: MessageType;
  isEmail: boolean;
  onChange: (v: Variant) => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const limit = CHAR_LIMIT[messageType];
  const chars = charCount(variant);
  const overLimit = limit !== null && chars > limit;

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-widest">
          {label}
        </span>
        <span
          className={cn(
            "text-[10px] font-mono tabular-nums",
            overLimit ? "text-red-400 font-medium" : "text-[#4b5563]"
          )}
        >
          {chars}{limit !== null ? `/${limit}` : ""}
        </span>
      </div>

      {/* Subject line for email */}
      {isEmail && (
        <input
          className="input-base text-xs py-1.5 px-2.5"
          placeholder="Subject line..."
          value={variant.subject ?? ""}
          onChange={(e) => onChange({ ...variant, subject: e.target.value })}
        />
      )}

      {/* Body textarea */}
      <textarea
        className={cn(
          "input-base text-xs leading-relaxed resize-none",
          overLimit && "border-red-500/40 focus:ring-red-500/50"
        )}
        rows={isEmail ? 7 : 6}
        value={variant.body}
        onChange={(e) => onChange({ ...variant, body: e.target.value })}
      />

      {/* Copy button */}
      <button
        className={cn(
          "self-start flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded border transition-colors",
          copied
            ? "border-green-500/40 text-green-400 bg-green-500/8"
            : "border-[#2a2a2a] text-[#6b7280] hover:text-[#e8e8e8] hover:border-[#3a3a3a]"
        )}
        onClick={onCopy}
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

// ─── MessageGenerator ─────────────────────────────────────────────────────────

interface MessageGeneratorProps {
  contact: Contact;
  application?: Application | null;
  onContactUpdate: (updated: Contact) => void;
}

export function MessageGenerator({
  contact,
  application,
  onContactUpdate,
}: MessageGeneratorProps) {
  type Phase = "loading" | "ready" | "error";
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadingMsg, setLoadingMsg] = useState(`Researching ${contact.contactName}...`);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Channel toggle — defaults to contact's outreach type when applicable
  const initChannel: "LinkedIn DM" | "Email" =
    contact.outreachType === "Email" ? "Email" : "LinkedIn DM";
  const [channel, setChannel] = useState<"LinkedIn DM" | "Email">(initChannel);

  // User-editable variants (separate from original generated text)
  const [edited, setEdited] = useState<{ A: Variant; B: Variant; C: Variant } | null>(null);
  const originalGenerated = useRef<{ A: Variant; B: Variant; C: Variant } | null>(null);

  // Research card collapse
  const [researchOpen, setResearchOpen] = useState(true);

  // Copy feedback per variant
  const [copiedVariant, setCopiedVariant] = useState<"A" | "B" | "C" | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch: research + generate ──────────────────────────────────────────
  const generate = useCallback(
    async (opts?: {
      cachedResearch?: ResearchResult;
      forceRefresh?: boolean;
      /** When true: keep existing variants visible, only update research card */
      isRefresh?: boolean;
    }) => {
      if (opts?.isRefresh) {
        setIsRefreshing(true);
      } else {
        setPhase("loading");
        setLoadingMsg(
          opts?.cachedResearch
            ? `Generating messages for ${contact.contactName}...`
            : `Researching ${contact.contactName}...`
        );
        setError(null);
      }

      try {
        const res = await fetch("/api/networking/generate-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact,
            application,
            channel,
            cachedResearch: opts?.cachedResearch,
            forceRefresh: opts?.forceRefresh,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Generation failed");

        const data = json.data as GenerateResult;
        setResult(data);
        setCacheInfo(data.cacheInfo ?? null);
        const v = {
          A: { ...data.variants.A },
          B: { ...data.variants.B },
          C: { ...data.variants.C },
        };
        setEdited(v);
        originalGenerated.current = { A: { ...v.A }, B: { ...v.B }, C: { ...v.C } };

        if (opts?.isRefresh) {
          setIsRefreshing(false);
        } else {
          setPhase("ready");
        }
      } catch (e) {
        if (opts?.isRefresh) {
          setIsRefreshing(false);
        } else {
          setError(e instanceof Error ? e.message : "Generation failed");
          setPhase("error");
        }
      }
    },
    [contact, application, channel]
  );

  // Auto-run on mount
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-generate when channel changes (use cached research to skip web search)
  const prevChannel = useRef(channel);
  useEffect(() => {
    if (prevChannel.current !== channel) {
      prevChannel.current = channel;
      if (result) generate({ cachedResearch: result.research });
    }
  }, [channel, result, generate]);

  // ── Copy handler ────────────────────────────────────────────────────────
  async function handleCopy(variant: "A" | "B" | "C") {
    if (!edited || !result) return;
    const v = edited[variant];
    const text = v.subject ? `${v.subject}\n\n${v.body}` : v.body;
    await navigator.clipboard.writeText(text);

    if (copyTimer.current) clearTimeout(copyTimer.current);
    setCopiedVariant(variant);
    copyTimer.current = setTimeout(() => setCopiedVariant(null), 2500);

    // Background: update contact status + writing style auto-learn
    try {
      const orig = originalGenerated.current?.[variant];
      const res = await fetch("/api/networking/update-after-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          messageType: result.messageType,
          originalText: orig?.body ?? "",
          copiedText: v.body,
          channel,
          context: `${contact.contactName} @ ${contact.companyName}`,
        }),
      });
      const json = await res.json();
      if (json.data?.contact) onContactUpdate(json.data.contact);
    } catch {
      // Non-critical — copy already succeeded
    }
  }

  function setVariant(label: "A" | "B" | "C", v: Variant) {
    setEdited((prev) => (prev ? { ...prev, [label]: v } : null));
  }

  // ── Render: loading ─────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex items-center gap-2.5 px-6 py-4 text-[#6b7280]">
        <Loader2 size={13} className="animate-spin shrink-0" />
        <span className="text-xs">{loadingMsg}</span>
      </div>
    );
  }

  // ── Render: error ───────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="flex items-center justify-between px-6 py-3 gap-3">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle size={13} className="shrink-0" />
          <span className="text-xs">{error}</span>
        </div>
        <button
          className="btn-ghost text-xs py-1 px-2.5 shrink-0"
          onClick={() => generate()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!result || !edited) return null;

  const isEmail = channel === "Email";

  return (
    <div className="bg-[#161616] border-t border-[#2a2a2a] px-6 py-4 space-y-4">
      {/* Research summary card */}
      <div className="rounded-md border border-[#252525] bg-[#1a1a1a] overflow-hidden text-xs">
        <button
          className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#1e1e1e] transition-colors"
          onClick={() => setResearchOpen((v) => !v)}
        >
          {researchOpen ? (
            <ChevronDown size={11} className="text-[#4b5563] shrink-0" />
          ) : (
            <ChevronRight size={11} className="text-[#4b5563] shrink-0" />
          )}
          <span className="text-[11px] font-medium text-[#6b7280]">
            Research: {contact.contactName}
          </span>
        </button>
        {researchOpen && (
          <>
            <ul className="px-4 pb-2 space-y-1.5">
              {result.research.bulletPoints.map((bp, i) => (
                <li key={i} className="flex gap-2 text-[#9ca3af] leading-relaxed">
                  <span className="text-[#3b82f6] shrink-0 mt-0.5">·</span>
                  {bp}
                </li>
              ))}
            </ul>
            <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
              {isRefreshing ? (
                <span className="text-[10px] text-[#6b7280] flex items-center gap-1.5">
                  <Loader2 size={10} className="animate-spin" />
                  Re-researching {contact.contactName}...
                </span>
              ) : cacheInfo ? (
                <>
                  <span className="text-[10px] text-[#4b5563]">
                    Researched {formatDate(cacheInfo.cachedAt)}
                  </span>
                  {cacheInfo.isStale && (
                    <span className="text-[10px] text-yellow-500/70">· Research may be stale</span>
                  )}
                  <span className="text-[10px] text-[#4b5563] mx-0.5">·</span>
                  <button
                    className="text-[10px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
                    onClick={() => generate({ forceRefresh: true, isRefresh: true })}
                  >
                    Refresh
                  </button>
                </>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Channel toggle + Regenerate */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 bg-[#1a1a1a] border border-[#252525] rounded-md p-0.5">
          {(["LinkedIn DM", "Email"] as const).map((ch) => (
            <button
              key={ch}
              className={cn(
                "text-[11px] font-medium px-3 py-1 rounded transition-colors",
                channel === ch
                  ? "bg-[#2a2a2a] text-[#e8e8e8]"
                  : "text-[#6b7280] hover:text-[#9ca3af]"
              )}
              onClick={() => setChannel(ch)}
            >
              {ch}
            </button>
          ))}
        </div>
        <button
          className="flex items-center gap-1.5 btn-ghost text-xs py-1 px-2.5"
          onClick={() => generate(result.research)}
        >
          <RefreshCw size={11} />
          Regenerate
        </button>
      </div>

      {/* Three variant boxes side-by-side */}
      <div className="flex gap-3 items-start">
        {(["A", "B", "C"] as const).map((label) => (
          <VariantBox
            key={label}
            label={label}
            variant={edited[label]}
            messageType={result.messageType}
            isEmail={isEmail}
            onChange={(v) => setVariant(label, v)}
            onCopy={() => handleCopy(label)}
            copied={copiedVariant === label}
          />
        ))}
      </div>
    </div>
  );
}
