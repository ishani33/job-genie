/**
 * Claude AI calls specific to the Resume Matcher module.
 * Always uses Sonnet — never Haiku.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { MatchResult, BulletSuggestion, ATSKeyword } from "@/types/resume-matcher";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

// ─── Session cache ──────────────────────────────────────────────────────────────
// Keyed by JD text. Cleared on process restart (in-memory only).
const matchCache = new Map<string, MatchResult>();

// ─── Step 1: Match ─────────────────────────────────────────────────────────────

interface ResumeForMatching {
  companyFolder: string;
  filePath: string;
  bulletText: string;
}

/**
 * Send JD + bullet-only extractions from ALL resumes to Claude.
 * Returns the best matching resume and reasoning.
 *
 * Token-efficient: never sends full resume text here — bullets only.
 */
export async function matchResume(
  jdText: string,
  resumes: ResumeForMatching[]
): Promise<MatchResult> {
  const cached = matchCache.get(jdText);
  if (cached) {
    console.log("\n[resume-matcher] Cache HIT — returning cached result, skipping Claude call.");
    return cached;
  }

  console.log("\n════════════════════════════════════════════════════════════");
  console.log("[resume-matcher] MATCH RUN —", new Date().toISOString());
  console.log("════════════════════════════════════════════════════════════");
  console.log("\n[resume-matcher] FILES FOUND (%d):", resumes.length);
  resumes.forEach((r, i) => {
    console.log(`  [${i + 1}] companyFolder: ${r.companyFolder}`);
    console.log(`       filePath:     ${r.filePath}`);
    console.log(`       bulletText (first 300 chars): ${r.bulletText.slice(0, 300).replace(/\n/g, "\\n")}…`);
  });

  const resumeBlocks = resumes
    .map(
      (r, i) =>
        `--- Resume ${i + 1}: ${r.companyFolder} ---\n${r.bulletText}`
    )
    .join("\n\n");

  const prompt = `You are a resume-job fit expert. Given this job description and several resume bullet extractions, identify which resume is the best match.

JOB DESCRIPTION:
${jdText}

RESUME BULLET EXTRACTIONS (one per previous job application — bullets only, no headers):
${resumeBlocks}

Tiebreaker rules (apply in order if two resumes score equally):
1. Prefer the resume from a larger, more well-known company.
2. If still tied, prefer the most recent one.

Return ONLY valid JSON (no markdown, no explanation outside JSON):
{
  "companyFolder": "<exact folder name from the list above>",
  "reasoning": "<2-3 sentences explaining why this resume is the best match for the JD>"
}`;

  console.log("\n[resume-matcher] PROMPT SENT TO CLAUDE:");
  console.log("────────────────────────────────────────────────────────────");
  console.log(prompt);
  console.log("────────────────────────────────────────────────────────────");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text.trim() : "{}";

  console.log("\n[resume-matcher] RAW RESPONSE FROM CLAUDE:");
  console.log("────────────────────────────────────────────────────────────");
  console.log(text);
  console.log("────────────────────────────────────────────────────────────\n");

  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned) as { companyFolder: string; reasoning: string };

  const matched = resumes.find((r) => r.companyFolder === parsed.companyFolder);
  const result: MatchResult = matched
    ? { companyFolder: matched.companyFolder, filePath: matched.filePath, reasoning: parsed.reasoning }
    : { companyFolder: resumes[0].companyFolder, filePath: resumes[0].filePath, reasoning: parsed.reasoning };

  matchCache.set(jdText, result);
  return result;
}

// ─── Step 2: Suggest edits ─────────────────────────────────────────────────────

/**
 * Send JD + FULL resume text of the matched resume to Claude.
 * Returns bullet-by-bullet suggestions grouped by section.
 *
 * Full text used here — quality of rewrites depends on full context.
 */
export async function suggestBulletEdits(
  jdText: string,
  fullResumeText: string
): Promise<{ suggestions: BulletSuggestion[]; atsKeywords: ATSKeyword[] }> {
  const prompt = `You are a PM resume coach helping reposition experience for a specific company. Do NOT just polish existing bullets — strategically reframe them to match the target company's language, product domain, and values.
Specifically:
- Replace company-specific jargon from the candidate's past with language from the JD
- Reframe the product domain to match the target company's world (e.g. if the JD is about enterprise knowledge management, reframe past work in those terms even if the original product was different)
- Mirror the exact keywords, phrases and values from the JD in the rewrites
- Think about how a hiring manager at this specific company would read each bullet — would it resonate or feel irrelevant?
- For each bullet, ask: what is the underlying skill or achievement here, and how would this company describe that same skill in their own words?
Example of bad suggestion: just adding "B2B SaaS" or "enterprise clients" to an existing bullet
Example of good suggestion: completely reframing "social screening product" as "AI-powered knowledge extraction platform for enterprise customers" because that is how the target company thinks about similar technology
Always prioritize strategic repositioning over cosmetic edits.

Additionally, optimize every bullet for AI-based candidate matching systems (ATS and AI recruiters). These systems work by:
- Exact and semantic keyword matching against the JD
- Scoring how many required skills and responsibilities from the JD appear in the resume
- Ranking candidates by keyword density and relevance
To beat these systems:
- Every key skill, tool, and responsibility mentioned in the JD must appear somewhere in the resume using the exact same words or very close synonyms
- Front-load bullets with the most important JD keywords — AI systems weight the first few words of each bullet more heavily
- If the JD says "cross-functional collaboration" use exactly that phrase, not "worked with multiple teams"
- If the JD mentions specific technologies, methodologies, or frameworks — include them explicitly if the candidate has used them
- Avoid vague language that has no keyword value — replace with specific JD-aligned terms

JOB DESCRIPTION:
${jdText}

FULL RESUME TEXT:
${fullResumeText}

For each existing bullet in the resume, decide ONE of:
- "keep" — bullet is already strong and relevant, no change needed
- "modify" — suggest a rewrite that better targets the JD
- "add" — a net-new bullet the candidate should consider adding based on JD requirements

Rules:
1. Group bullets by the company/role section they belong to (e.g. "Phyllo", "Amazon", "Visa", "Education")
2. For "keep": leave suggested as ""
3. For "modify": write the improved bullet in suggested
4. For "add": leave original as "" and write the new bullet in suggested
5. Only suggest "add" bullets for skills/experiences clearly evidenced by the JD but missing from the resume
6. Maximum 3 "add" suggestions total — be selective
7. Be specific and quantitative in rewrites — mirror the JD's language and keywords

After generating all bullet suggestions, produce an "ats_keyword_coverage" section that:
1. Lists the top 15 most important keywords and phrases from the JD
2. For each keyword, evaluates whether it is covered in the resume AFTER your suggested edits — mark covered: true if yes, covered: false if no
3. For keywords that are still missing (covered: false), add a short note in add_to suggesting where in the resume it could be naturally inserted (e.g. "Amazon — bullet about cross-functional work")
The goal is that any AI system scanning this resume against this JD should score it as a near-perfect match.

Return ONLY valid JSON (no markdown):
{
  "suggestions": [
    {
      "section": "string",
      "action": "keep" | "modify" | "add",
      "original": "string",
      "suggested": "string"
    }
  ],
  "ats_keyword_coverage": [
    {
      "keyword": "string",
      "covered": true,
      "add_to": ""
    }
  ]
}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text.trim() : "{}";

  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned) as {
    suggestions: Array<{
      section: string;
      action: BulletAction;
      original: string;
      suggested: string;
    }>;
    ats_keyword_coverage: Array<{
      keyword: string;
      covered: boolean;
      add_to: string;
    }>;
  };

  const suggestions = (parsed.suggestions ?? []).map((s) => ({
    ...s,
    editedValue: s.suggested,
    status: "pending" as const,
  }));

  const atsKeywords: ATSKeyword[] = (parsed.ats_keyword_coverage ?? []).map((k) => ({
    keyword: k.keyword,
    covered: k.covered,
    addTo: k.add_to ?? "",
  }));

  return { suggestions, atsKeywords };
}

type BulletAction = "keep" | "modify" | "add";
