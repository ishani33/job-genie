"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type {
  BulletSuggestion,
  ATSKeyword,
} from "@/types/resume-matcher";

// ─── Word-Diff Algorithm ──────────────────────────────────────────────────────

type DiffOp = { type: "equal" | "delete" | "insert"; word: string };

function computeWordDiff(original: string, suggested: string): DiffOp[] {
  const origWords = original.trim().split(/\s+/).filter(Boolean);
  const suggWords = suggested.trim().split(/\s+/).filter(Boolean);

  const m = origWords.length;
  const n = suggWords.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1].toLowerCase() === suggWords[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const ops: DiffOp[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      origWords[i - 1].toLowerCase() === suggWords[j - 1].toLowerCase()
    ) {
      ops.unshift({ type: "equal", word: suggWords[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "insert", word: suggWords[j - 1] });
      j--;
    } else {
      ops.unshift({ type: "delete", word: origWords[i - 1] });
      i--;
    }
  }
  return ops;
}

// >40% of total tokens changed → line-level mode
function shouldUseLineMode(ops: DiffOp[]): boolean {
  if (ops.length === 0) return false;
  const changed = ops.filter((op) => op.type !== "equal").length;
  return changed / ops.length > 0.4;
}

// ─── BulletDiff ───────────────────────────────────────────────────────────────

interface BulletDiffProps {
  suggestion: BulletSuggestion;
  onAccept: () => void;
  onReject: () => void;
  onUpdate: (value: string) => void;
  onUnlock: () => void;
}

function BulletDiff({
  suggestion,
  onAccept,
  onReject,
  onUpdate,
  onUnlock,
}: BulletDiffProps) {
  const { status, action, original } = suggestion;
  const displayText =
    suggestion.editedValue || suggestion.suggested || original;

  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(displayText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync draft when parent updates editedValue (e.g. after Accept All)
  useEffect(() => {
    setDraftValue(suggestion.editedValue || suggestion.suggested || original);
  }, [suggestion.editedValue, suggestion.suggested, original]);

  const ops = useMemo(() => {
    if (action !== "modify" || !original) return [];
    return computeWordDiff(original, displayText);
  }, [action, original, displayText]);

  const lineMode = useMemo(() => shouldUseLineMode(ops), [ops]);

  const handleClickToEdit = () => {
    if (status === "accepted" || status === "rejected") {
      onUnlock();
      return;
    }
    if (action === "keep") return;
    setIsEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 0);
  };

  const commitEdit = () => {
    onUpdate(draftValue);
    setIsEditing(false);
  };

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) {
      onUpdate(draftValue);
      setIsEditing(false);
    }
    onAccept();
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    onReject();
  };

  // ── Keep bullets — auto-accepted, shown as static ──
  if (action === "keep") {
    return (
      <div className="rounded border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2">
        <div className="flex items-start gap-2">
          <span className="text-green-700 text-[10px] mt-0.5 shrink-0 font-semibold">✓</span>
          <p className="text-xs text-[#9ca3af] leading-relaxed">{original}</p>
        </div>
      </div>
    );
  }

  // ── Accepted ──
  if (status === "accepted") {
    return (
      <div
        className="rounded border border-green-500/30 bg-green-500/5 px-3 py-2 cursor-pointer group"
        onClick={onUnlock}
        title="Click to unlock and re-edit"
      >
        <div className="flex items-start gap-2">
          <span className="text-green-500 text-xs mt-0.5 shrink-0 font-semibold">+</span>
          <p className="text-xs text-green-400 leading-relaxed flex-1">
            {displayText}
          </p>
          <span className="text-[10px] text-green-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            unlock
          </span>
        </div>
      </div>
    );
  }

  // ── Rejected ──
  if (status === "rejected") {
    return (
      <div
        className="rounded border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 cursor-pointer group opacity-50"
        onClick={onUnlock}
        title="Click to unlock and re-edit"
      >
        <div className="flex items-start gap-2">
          <span className="text-[#4b5563] text-xs mt-0.5 shrink-0">-</span>
          <p className="text-xs text-[#6b7280] leading-relaxed line-through flex-1">
            {action === "add" ? displayText : original}
          </p>
          <span className="text-[10px] text-[#4b5563] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            unlock
          </span>
        </div>
      </div>
    );
  }

  // ── Pending ──
  return (
    <div className="rounded border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 space-y-2">
      {/* Diff display or editing textarea */}
      {isEditing ? (
        <div className="space-y-2">
          {action === "modify" && original && (
            <div>
              <p className="text-[10px] text-[#4b5563] mb-1">Original</p>
              <div className="rounded border border-[#252525] bg-[#111] px-2.5 py-2 text-xs text-[#6b7280] leading-relaxed select-text">
                {original}
              </div>
            </div>
          )}
          <div>
            {action === "modify" && original && (
              <p className="text-[10px] text-[#4b5563] mb-1">Suggested</p>
            )}
            <textarea
              ref={textareaRef}
              className="input-base w-full resize-none text-xs leading-relaxed"
              rows={3}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onBlur={commitEdit}
              placeholder="Edit the suggested bullet..."
            />
            {action === "modify" && original && (
              <div className="flex gap-3 mt-1.5">
                <button
                  type="button"
                  className="text-[10px] text-[#4b5563] hover:text-[#9ca3af] transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); setDraftValue(original); }}
                >
                  Reset to original
                </button>
                <button
                  type="button"
                  className="text-[10px] text-[#4b5563] hover:text-[#9ca3af] transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); setDraftValue(suggestion.suggested); }}
                >
                  Reset to suggestion
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "text-xs leading-relaxed rounded px-1 py-0.5 -mx-1 -my-0.5",
            "cursor-text hover:bg-[#222] transition-colors"
          )}
          onClick={handleClickToEdit}
          title="Click to edit"
        >
          {/* Add — fully green */}
          {action === "add" && (
            <span className="text-green-400">+ {displayText}</span>
          )}

          {/* Modify — inline or line-level diff */}
          {action === "modify" && (
            <>
              {lineMode ? (
                <div className="space-y-1">
                  <div className="rounded px-2 py-1 bg-red-500/10">
                    <span className="text-red-400 line-through leading-relaxed">
                      {original}
                    </span>
                  </div>
                  <div className="rounded px-2 py-1 bg-green-500/10">
                    <span className="text-green-400 leading-relaxed">
                      {displayText}
                    </span>
                  </div>
                </div>
              ) : (
                <span>
                  {ops.map((op, idx) => {
                    const space = idx < ops.length - 1 ? " " : "";
                    if (op.type === "equal")
                      return (
                        <span key={idx} className="text-[#e8e8e8]">
                          {op.word}{space}
                        </span>
                      );
                    if (op.type === "delete")
                      return (
                        <span key={idx} className="text-red-400 line-through">
                          {op.word}{space}
                        </span>
                      );
                    return (
                      <span key={idx} className="text-green-400">
                        {op.word}{space}
                      </span>
                    );
                  })}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Reasoning — shown below diff when not in edit mode */}
      {!isEditing && suggestion.reasoning && (
        <p className="text-[10px] italic text-[#4b5563] leading-relaxed -mt-0.5">
          {suggestion.reasoning}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        <button
          className="text-[11px] px-2 py-0.5 rounded border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-colors"
          onClick={handleAccept}
        >
          ✅ Accept
        </button>
        <button
          className="text-[11px] px-2 py-0.5 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
          onClick={handleReject}
        >
          ❌ Reject
        </button>
        <span className="text-[10px] text-[#4b5563] ml-auto">
          click text to edit
        </span>
      </div>
    </div>
  );
}

// ─── SuggestionsPanel ─────────────────────────────────────────────────────────

interface SuggestionsPanelProps {
  suggestions: BulletSuggestion[];
  atsKeywords: ATSKeyword[];
  onUpdateSuggestion: (index: number, editedValue: string) => void;
  onAcceptSuggestion: (index: number) => void;
  onRejectSuggestion: (index: number) => void;
  onUnlockSuggestion: (index: number) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export function SuggestionsPanel({
  suggestions,
  atsKeywords,
  onUpdateSuggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
  onUnlockSuggestion,
  onAcceptAll,
  onRejectAll,
}: SuggestionsPanelProps) {
  // Group by section
  const sections = useMemo(() => {
    const map = new Map<
      string,
      { suggestion: BulletSuggestion; index: number }[]
    >();
    suggestions.forEach((s, i) => {
      const key = s.section || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ suggestion: s, index: i });
    });
    return map;
  }, [suggestions]);

  // Only modify + add bullets count toward "reviewed"
  const reviewable = useMemo(
    () => suggestions.filter((s) => s.action !== "keep"),
    [suggestions]
  );
  const reviewed = useMemo(
    () => reviewable.filter((s) => s.status !== "pending"),
    [reviewable]
  );

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      {/* Progress + bulk actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#9ca3af]">
          {reviewed.length} of {reviewable.length} bullets reviewed
        </span>
        <div className="flex gap-1.5">
          <button
            className="text-[11px] px-2 py-0.5 rounded border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-colors"
            onClick={onAcceptAll}
          >
            Accept All
          </button>
          <button
            className="text-[11px] px-2 py-0.5 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
            onClick={onRejectAll}
          >
            Reject All
          </button>
        </div>
      </div>

      {/* Sections */}
      {Array.from(sections.entries()).map(([section, items]) => (
        <div key={section} className="space-y-2">
          <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider border-b border-[#2a2a2a] pb-1">
            {section}
          </h3>
          {items.map(({ suggestion, index }) => (
            <BulletDiff
              key={index}
              suggestion={suggestion}
              onAccept={() => onAcceptSuggestion(index)}
              onReject={() => onRejectSuggestion(index)}
              onUpdate={(v) => onUpdateSuggestion(index, v)}
              onUnlock={() => onUnlockSuggestion(index)}
            />
          ))}
        </div>
      ))}

      {/* ATS Keyword Coverage */}
      {atsKeywords.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider border-b border-[#2a2a2a] pb-1">
            ATS Keyword Coverage
          </h3>
          <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] divide-y divide-[#2a2a2a]">
            {atsKeywords.map((kw) => (
              <div key={kw.keyword} className="flex items-start gap-2 px-3 py-2">
                <span className="shrink-0 text-sm leading-none mt-0.5">
                  {kw.covered ? "✅" : "❌"}
                </span>
                <div className="min-w-0">
                  <span className="text-xs text-[#e8e8e8]">{kw.keyword}</span>
                  {!kw.covered && kw.addTo && (
                    <p className="text-[11px] text-[#6b7280] mt-0.5">
                      Add to: {kw.addTo}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
