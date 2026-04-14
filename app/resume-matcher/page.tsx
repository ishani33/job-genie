"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RotateCcw, Save, Check, Loader2, Download } from "lucide-react";
import { JDInput } from "@/components/resume-matcher/JDInput";
import { MatchResultCard } from "@/components/resume-matcher/MatchResultCard";
import { SuggestionsPanel } from "@/components/resume-matcher/SuggestionsPanel";
import { ResumePreviewPanel } from "@/components/resume-matcher/ResumePreviewPanel";
import { Tier3Picker } from "@/components/resume-matcher/Tier3Picker";
import { formatDate } from "@/lib/utils";
import type { Tier } from "@/types";
import type {
  MatcherStep,
  MatchResult,
  BulletSuggestion,
  BulletStatus,
  ATSKeyword,
  ResumeFolder,
  JDSkill,
} from "@/types/resume-matcher";

// ─── SkillChips ───────────────────────────────────────────────────────────────

function SkillChips({ skills }: { skills: JDSkill[] }) {
  if (skills.length === 0) return null;
  return (
    <div className="px-6 py-2 border-b border-[#2a2a2a] bg-[#0f0f0f] flex items-center gap-2 flex-wrap shrink-0">
      <span className="text-[10px] text-[#4b5563] font-medium uppercase tracking-wider shrink-0 mr-1">
        Key Skills
      </span>
      {skills.map((s, i) => (
        <div
          key={i}
          className="flex items-center gap-1 bg-[#1a1a1a] border border-[#252525] rounded-full px-2.5 py-1 text-[11px] text-[#9ca3af]"
          title={s.explanation}
        >
          <span className="text-[10px]">🔑</span>
          <span>{s.skill}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Inner page (uses useSearchParams) ───────────────────────────────────────

function ResumeMatcherInner() {
  const params = useSearchParams();

  // State machine
  const [step, setStep] = useState<MatcherStep>("input");

  // Inputs
  const [jdText, setJdText] = useState("");
  const [tier, setTier] = useState<Tier>(1);
  const [companyName, setCompanyName] = useState(params.get("company") ?? "");

  // Skill chips (extracted after JD submit, persist through entire flow)
  const [jdSkills, setJDSkills] = useState<JDSkill[]>([]);

  // Pick-path state: manual browse
  const [showFolderBrowse, setShowFolderBrowse] = useState(false);
  const [resumeFolders, setResumeFolders] = useState<ResumeFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);

  // Results
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [suggestions, setSuggestions] = useState<BulletSuggestion[]>([]);
  const [atsKeywords, setAtsKeywords] = useState<ATSKeyword[]>([]);
  const [fullResumeText, setFullResumeText] = useState("");

  // Loading + errors
  const [matchError, setMatchError] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Save
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "confirm-overwrite" | "done"
  >("idle");
  const [savedFolder, setSavedFolder] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFiles, setSavedFiles] = useState<{
    docxPath: string;
    pdfPath: string | null;
    libreofficeMessage: string | null;
  } | null>(null);

  // ─── Step 1: JD submit → extract skills → pick-path ────────────────────────

  async function handleInputSubmit({
    jdText: text,
    tier: t,
    companyName: cn,
  }: {
    jdText: string;
    tier: Tier;
    companyName: string;
  }) {
    setJdText(text);
    setTier(t);
    setCompanyName(cn);
    setMatchError(null);
    setStep("extracting-skills");

    try {
      const res = await fetch("/api/resume-matcher/extract-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText: text }),
      });
      const json = await res.json();
      if (res.ok) setJDSkills((json.data.skills as JDSkill[]) ?? []);
    } catch {
      // Non-blocking — proceed to pick-path even without skills
    }

    setStep("pick-path");
  }

  // ─── Path 1: AI Match ───────────────────────────────────────────────────────

  async function handleAIMatch() {
    setMatchError(null);
    setStep("matching");

    try {
      const res = await fetch("/api/resume-matcher/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Matching failed");

      setMatchResult(json.data as MatchResult);

      if (tier === 1) {
        setStep("matched");
        await runSuggestions(jdText, json.data as MatchResult);
      } else {
        setStep("matched");
      }
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Unknown error");
      setStep("pick-path");
    }
  }

  // ─── Path 2: Manual browse ──────────────────────────────────────────────────

  async function handleBrowseResumes() {
    setShowFolderBrowse(true);
    if (resumeFolders.length > 0) return;
    setFoldersLoading(true);
    try {
      const res = await fetch("/api/resume-matcher/list-folders");
      const json = await res.json();
      setResumeFolders((json.data as ResumeFolder[]) ?? []);
    } catch {
      // Silent failure — grid stays empty with no crash
    } finally {
      setFoldersLoading(false);
    }
  }

  async function handleManualFolderSelect(folder: ResumeFolder) {
    const match: MatchResult = {
      companyFolder: folder.companyFolder,
      filePath: folder.filePath,
      reasoning: "Manually selected",
    };
    setMatchResult(match);
    await runSuggestions(jdText, match);
  }

  // ─── Suggestion step ────────────────────────────────────────────────────────

  const runSuggestions = useCallback(
    async (jd: string, match: MatchResult) => {
      setLoadingSuggestions(true);
      setSuggestError(null);
      try {
        const res = await fetch("/api/resume-matcher/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jdText: jd, filePath: match.filePath }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Suggestion failed");

        // Initialize status: "keep" → auto-accepted, others → pending
        const withStatus = (
          json.data.suggestions as BulletSuggestion[]
        ).map((s) => ({
          ...s,
          editedValue: s.editedValue || s.suggested,
          status: (s.action === "keep" ? "accepted" : "pending") as BulletStatus,
        }));

        setSuggestions(withStatus);
        setAtsKeywords(json.data.atsKeywords as ATSKeyword[]);
        setFullResumeText(json.data.fullText as string);
        setStep("suggestions");
      } catch (err) {
        setSuggestError(err instanceof Error ? err.message : "Unknown error");
        setStep("matched");
      } finally {
        setLoadingSuggestions(false);
      }
    },
    []
  );

  function handleT2Customize() {
    if (matchResult) runSuggestions(jdText, matchResult);
  }

  function handleT2ReuseAsIs() {
    setSavedFolder(matchResult?.companyFolder ?? null);
    setStep("done");
  }

  // ─── T3 picker (legacy path — kept for safety) ──────────────────────────────

  function handleT3Select(folder: ResumeFolder) {
    setSavedFolder(folder.companyFolder);
    setStep("done");
  }

  // ─── Bullet review handlers ─────────────────────────────────────────────────

  function handleUpdateSuggestion(index: number, editedValue: string) {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, editedValue } : s))
    );
  }

  function handleAcceptSuggestion(index: number) {
    setSuggestions((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, status: "accepted" as BulletStatus } : s
      )
    );
  }

  function handleRejectSuggestion(index: number) {
    setSuggestions((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, status: "rejected" as BulletStatus } : s
      )
    );
  }

  function handleUnlockSuggestion(index: number) {
    setSuggestions((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, status: "pending" as BulletStatus } : s
      )
    );
  }

  function handleAcceptAll() {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.action === "keep" ? s : { ...s, status: "accepted" as BulletStatus }
      )
    );
  }

  function handleRejectAll() {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.action === "keep" ? s : { ...s, status: "rejected" as BulletStatus }
      )
    );
  }

  // All modify/add bullets must be actioned before Save is shown
  const allActioned =
    suggestions.length > 0 &&
    suggestions
      .filter((s) => s.action !== "keep")
      .every((s) => s.status !== "pending");

  // ─── Save ───────────────────────────────────────────────────────────────────

  async function handleSave(overwrite = false) {
    if (!matchResult) return;
    setSaveStatus("saving");
    setSaveError(null);

    // Collect accepted bullets only (skip "keep" — no changes needed)
    const acceptedBullets = suggestions
      .filter((s) => s.status === "accepted" && s.action !== "keep")
      .map((s) => ({
        section: s.section,
        action: s.action,
        original: s.original,
        editedValue: s.editedValue || s.suggested,
      }));

    try {
      const res = await fetch("/api/resume-matcher/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName || matchResult.companyFolder,
          acceptedBullets,
          overwrite,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");

      const result = json.data;
      if (result.alreadyExisted && !overwrite) {
        setSaveStatus("confirm-overwrite");
        return;
      }

      setSavedFiles({
        docxPath: result.docxPath,
        pdfPath: result.pdfPath,
        libreofficeMessage: result.libreofficeMessage ?? null,
      });
      setSavedFolder(result.companyFolder);
      setSaveStatus("done");
      setStep("done");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
      setSaveStatus("idle");
    }
  }

  function handleReset() {
    setStep("input");
    setMatchResult(null);
    setSuggestions([]);
    setAtsKeywords([]);
    setFullResumeText("");
    setMatchError(null);
    setSuggestError(null);
    setSaveStatus("idle");
    setSavedFolder(null);
    setSavedFiles(null);
    setJDSkills([]);
    setShowFolderBrowse(false);
    setResumeFolders([]);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-[#e8e8e8]">
            Resume Matcher
          </h1>
          <p className="text-xs text-[#6b7280] mt-0.5">
            Match, tailor, and save your resume for each application
          </p>
        </div>
        {step !== "input" && (
          <button
            className="btn-ghost flex items-center gap-1.5 text-xs"
            onClick={handleReset}
          >
            <RotateCcw size={13} />
            Start over
          </button>
        )}
      </div>

      {/* Skill chips banner — visible once extracted, throughout entire flow */}
      {jdSkills.length > 0 &&
        step !== "input" &&
        step !== "extracting-skills" && <SkillChips skills={jdSkills} />}

      <div className="flex-1 overflow-hidden flex">
        {/* ── Step: input ─────────────────────────────────────────── */}
        {step === "input" && (
          <div className="flex-1 overflow-y-auto px-6 py-5 max-w-2xl">
            {matchError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-md">
                {matchError}
              </div>
            )}
            <JDInput
              onSubmit={handleInputSubmit}
              defaultTier={tier}
              defaultCompany={companyName}
              defaultJdUrl={params.get("jdUrl") ?? ""}
            />
          </div>
        )}

        {/* ── Step: extracting-skills (loading) ────────────────────── */}
        {step === "extracting-skills" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-[#3b82f6] mx-auto" />
              <p className="text-sm text-[#9ca3af]">Extracting key skills...</p>
            </div>
          </div>
        )}

        {/* ── Step: pick-path ──────────────────────────────────────── */}
        {step === "pick-path" && (
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <p className="text-sm text-[#9ca3af] mb-6">
              How would you like to select a resume?
            </p>
            {matchError && (
              <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-md">
                {matchError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 mb-8 max-w-2xl">
              {/* Path 1: AI Match */}
              <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#e8e8e8] mb-1.5">
                    Find Best Match with AI
                  </h3>
                  <p className="text-xs text-[#6b7280] leading-relaxed">
                    Claude scans all your saved resumes and picks the one with
                    the strongest alignment to this JD.
                  </p>
                </div>
                <button className="btn-primary self-start" onClick={handleAIMatch}>
                  Find Best Match with AI
                </button>
              </div>

              {/* Path 2: Manual Browse */}
              <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#e8e8e8] mb-1.5">
                    Browse My Resumes
                  </h3>
                  <p className="text-xs text-[#6b7280] leading-relaxed">
                    Pick a specific saved resume version to tailor — useful when
                    you already know which base to use.
                  </p>
                </div>
                <button
                  className="btn-secondary self-start"
                  onClick={handleBrowseResumes}
                >
                  Browse My Resumes
                </button>
              </div>
            </div>

            {/* Folder grid — shown after "Browse My Resumes" is clicked */}
            {showFolderBrowse && (
              <div className="max-w-2xl">
                <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
                  Select a resume
                </h3>
                {foldersLoading ? (
                  <div className="flex items-center gap-2 text-[#6b7280] text-xs">
                    <Loader2 size={13} className="animate-spin" />
                    Loading resumes...
                  </div>
                ) : resumeFolders.length === 0 ? (
                  <p className="text-xs text-[#4b5563]">No resumes found.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {resumeFolders.map((folder) => (
                      <button
                        key={folder.filePath}
                        className="rounded-md border border-[#2a2a2a] bg-[#161616] hover:border-[#3b82f6]/40 hover:bg-[#1a2233] px-3 py-3 text-left transition-colors group"
                        onClick={() => handleManualFolderSelect(folder)}
                      >
                        <p className="text-xs font-medium text-[#e8e8e8] group-hover:text-[#3b82f6] transition-colors truncate">
                          {folder.companyFolder}
                        </p>
                        {folder.mtime && (
                          <p className="text-[10px] text-[#4b5563] mt-0.5">
                            {formatDate(folder.mtime)}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step: matching (loading) ─────────────────────────────── */}
        {step === "matching" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-[#3b82f6] mx-auto" />
              <p className="text-sm text-[#9ca3af]">
                Finding your best resume match...
              </p>
              <p className="text-xs text-[#4b5563]">
                Reading bullet points from all resumes
              </p>
            </div>
          </div>
        )}

        {/* ── Step: matched (T2 shows buttons; T1 transitions fast) ── */}
        {step === "matched" && matchResult && (
          <div className="flex-1 overflow-y-auto px-6 py-5 max-w-2xl">
            {suggestError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-md">
                {suggestError}
              </div>
            )}
            <MatchResultCard
              match={matchResult}
              tier={tier}
              onReuseAsIs={handleT2ReuseAsIs}
              onCustomize={handleT2Customize}
              loadingSuggestions={loadingSuggestions}
            />
          </div>
        )}

        {/* ── Step: t3-pick (legacy) ───────────────────────────────── */}
        {step === "t3-pick" && (
          <div className="flex-1 overflow-y-auto px-6 py-5 max-w-xl">
            <Tier3Picker onSelect={handleT3Select} />
          </div>
        )}

        {/* ── Step: suggestions — two-panel layout ─────────────────── */}
        {step === "suggestions" && matchResult && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left panel — suggestions */}
            <div className="flex-1 overflow-y-auto px-6 py-5 border-r border-[#2a2a2a] min-w-0">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-sm font-semibold text-[#e8e8e8]">
                  AI Suggestions
                </h2>
                <div className="flex items-center gap-2">
                  {saveError && (
                    <p className="text-xs text-red-400">{saveError}</p>
                  )}
                  {saveStatus === "confirm-overwrite" && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-orange-400">
                        Folder exists —
                      </span>
                      <button
                        className="btn-secondary text-xs py-1 px-2"
                        onClick={() => handleSave(true)}
                      >
                        Overwrite
                      </button>
                    </div>
                  )}
                  {saveStatus !== "confirm-overwrite" && allActioned && (
                    <button
                      className="btn-primary flex items-center gap-1.5"
                      onClick={() => handleSave()}
                      disabled={saveStatus === "saving"}
                    >
                      {saveStatus === "saving" ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={13} />
                          Save New Version
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <SuggestionsPanel
                suggestions={suggestions}
                atsKeywords={atsKeywords}
                onUpdateSuggestion={handleUpdateSuggestion}
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectSuggestion={handleRejectSuggestion}
                onUnlockSuggestion={handleUnlockSuggestion}
                onAcceptAll={handleAcceptAll}
                onRejectAll={handleRejectAll}
              />
            </div>

            {/* Right panel — resume preview */}
            <div className="w-[42%] shrink-0 overflow-hidden px-6 py-5">
              <ResumePreviewPanel
                match={matchResult}
                fullResumeText={fullResumeText}
              />
            </div>
          </div>
        )}

        {/* ── Step: done ───────────────────────────────────────────── */}
        {step === "done" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-green-400/10 flex items-center justify-center mx-auto">
                <Check size={22} className="text-green-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-[#e8e8e8]">
                  Resume saved
                </p>
                {savedFolder && (
                  <p className="text-sm text-[#9ca3af] mt-1">
                    <span className="text-[#e8e8e8] font-medium">
                      {savedFolder}
                    </span>{" "}
                    / CHAUHAN_ISHANI_RESUME
                  </p>
                )}
                <p className="text-xs text-[#4b5563] mt-2">
                  Copy the folder name above and paste it into the Resume
                  Version Used field in the Applications tab.
                </p>
              </div>

              {/* Download buttons */}
              {savedFiles && (
                <div className="flex flex-col gap-2">
                  <a
                    href={`/api/resume-matcher/download?path=${encodeURIComponent(savedFiles.docxPath)}`}
                    download="CHAUHAN_ISHANI_RESUME.docx"
                    className="btn-secondary flex items-center justify-center gap-1.5 text-xs"
                  >
                    <Download size={12} />
                    Download .docx
                  </a>
                  {savedFiles.pdfPath ? (
                    <a
                      href={`/api/resume-matcher/download?path=${encodeURIComponent(savedFiles.pdfPath)}`}
                      download="CHAUHAN_ISHANI_RESUME.pdf"
                      className="btn-secondary flex items-center justify-center gap-1.5 text-xs"
                    >
                      <Download size={12} />
                      Download .pdf
                    </a>
                  ) : savedFiles.libreofficeMessage ? (
                    <p className="text-[11px] text-[#6b7280] px-2">
                      {savedFiles.libreofficeMessage}
                    </p>
                  ) : null}
                </div>
              )}

              <button className="btn-secondary" onClick={handleReset}>
                Match another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page wrapper (Suspense required for useSearchParams) ─────────────────────

export default function ResumeMatcherPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full text-[#4b5563] text-sm">
          Loading...
        </div>
      }
    >
      <ResumeMatcherInner />
    </Suspense>
  );
}
