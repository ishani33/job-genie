// ─── Resume Matcher Module Types ──────────────────────────────────────────────

export type JDInputMode = "paste" | "url";

export type BulletAction = "keep" | "modify" | "add";

export type BulletStatus = "pending" | "accepted" | "rejected";

export interface BulletSuggestion {
  section: string;          // "Phyllo", "Amazon", "Education", etc.
  action: BulletAction;
  original: string;         // original bullet text; empty string for "add"
  suggested: string;        // suggested rewrite or new bullet; empty for "keep"
  editedValue: string;      // user-editable copy of suggested (starts = suggested)
  status: BulletStatus;     // "keep" bullets start as "accepted"; others start "pending"
  reasoning?: string;       // 1-2 lines explaining why this change was suggested (omitted for "keep")
}

export interface MatchResult {
  companyFolder: string;    // e.g. "Stripe" — the subfolder name
  filePath: string;         // absolute path to the .docx
  reasoning: string;        // 2-3 sentence explanation from Claude
}

export interface ResumeFolder {
  companyFolder: string;    // subfolder name
  filePath: string;         // absolute path to .docx
  mtime?: string;           // ISO timestamp of last file modification
}

export type MatcherStep =
  | "input"              // Step 1 — JD + tier + company
  | "extracting-skills"  // Lightweight skill extraction before any matching
  | "pick-path"          // User chooses AI match or manual browse
  | "matching"           // Running matching API call
  | "matched"            // Match result shown (T2 shows two buttons here)
  | "t3-pick"            // Tier 3 — folder dropdown (kept for safety)
  | "suggesting"         // Running suggestion API call
  | "suggestions"        // Two-panel layout shown
  | "saving"             // Save in progress
  | "done";              // Saved and logged

export interface ATSKeyword {
  keyword: string;
  covered: boolean;
  addTo: string; // empty string when covered; hint on where to add when not covered
}

export interface JDSkill {
  skill: string;
  explanation: string;
}

export interface SaveResult {
  docxPath: string;
  pdfPath: string | null;
  companyFolder: string;
  alreadyExisted: boolean;
  libreofficeMessage?: string | null;
}
