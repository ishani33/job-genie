/**
 * Resume parser — reads .docx files from ~/OneDrive/Resumes/ subfolders.
 *
 * Uses mammoth to extract structured text.
 * Bullet extractions are cached in a module-level Map for the lifetime of the
 * dev server process (never re-parsed in the same session).
 *
 * Directory layout assumed:
 *   ~/OneDrive/Resumes/
 *     CompanyA/CHAUHAN_ISHANI_RESUME.docx
 *     CompanyB/CHAUHAN_ISHANI_RESUME.docx
 *     ...
 */

import fs from "fs";
import path from "path";
// @ts-expect-error mammoth has no bundled types
import mammoth from "mammoth";
import type { ResumeFolder } from "@/types/resume-matcher";

const RESUME_FILENAME = "CHAUHAN_ISHANI_RESUME.docx";

export function getResumesRoot(): string {
  const resumesPath = process.env.RESUMES_PATH;
  if (!resumesPath) throw new Error("RESUMES_PATH environment variable is not set");
  return resumesPath;
}

// ─── Session cache ────────────────────────────────────────────────────────────

interface ParsedResume {
  bulletText: string;
  fullText: string;
}

const cache = new Map<string, ParsedResume>();

// ─── Folder scanning ──────────────────────────────────────────────────────────

export function listResumeFolders(): ResumeFolder[] {
  const root = getResumesRoot();
  if (!fs.existsSync(root)) return [];

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const folders: ResumeFolder[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const filePath = path.join(root, entry.name, RESUME_FILENAME);
    if (fs.existsSync(filePath)) {
      folders.push({ companyFolder: entry.name, filePath });
    }
  }

  return folders.sort((a, b) =>
    a.companyFolder.localeCompare(b.companyFolder)
  );
}

// ─── Text extraction ──────────────────────────────────────────────────────────

async function extractFullText(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value as string;
}

/**
 * Extract bullet-only content from a resume.
 * Uses mammoth's HTML output to pull <li> elements (actual Word list items),
 * plus heuristic line filtering as a fallback.
 */
async function extractBullets(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);

  // Get HTML — list items are wrapped in <li>
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const html: string = htmlResult.value;

  // Extract all <li> content (strip inner tags)
  const liMatches = html.match(/<li>([\s\S]*?)<\/li>/g) ?? [];
  const liText = liMatches
    .map((m) => m.replace(/<[^>]+>/g, "").trim())
    .filter((l) => l.length > 15);

  if (liText.length > 0) {
    return liText.join("\n");
  }

  // Fallback: heuristic line filter on raw text
  const rawResult = await mammoth.extractRawText({ buffer });
  const lines: string[] = (rawResult.value as string)
    .split("\n")
    .map((l: string) => l.trim());

  const bullets = lines.filter((line: string) => {
    if (line.length < 20) return false;
    // Skip contact info patterns
    if (/^[\w.+-]+@[\w.]+\.\w+/.test(line)) return false;
    if (/^\+?[\d\s()-]{10,}$/.test(line)) return false;
    if (/linkedin\.com|github\.com/i.test(line)) return false;
    // Skip section headers (all caps, short)
    if (/^[A-Z\s&/]+$/.test(line) && line.length < 40) return false;
    // Skip lines that are just years / date ranges
    if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})/i.test(line))
      return false;
    return true;
  });

  return bullets.join("\n");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get bullet-only text for a resume (cached).
 */
export async function getBulletText(filePath: string): Promise<string> {
  if (cache.has(filePath)) return cache.get(filePath)!.bulletText;
  const [bulletText, fullText] = await Promise.all([
    extractBullets(filePath),
    extractFullText(filePath),
  ]);
  cache.set(filePath, { bulletText, fullText });
  return bulletText;
}

/**
 * Get full resume text (cached).
 */
export async function getFullText(filePath: string): Promise<string> {
  if (cache.has(filePath)) return cache.get(filePath)!.fullText;
  const [bulletText, fullText] = await Promise.all([
    extractBullets(filePath),
    extractFullText(filePath),
  ]);
  cache.set(filePath, { bulletText, fullText });
  return fullText;
}

/**
 * Get all resumes with their bullet extractions in one pass (cached).
 */
export async function getAllResumesWithBullets(): Promise<
  Array<ResumeFolder & { bulletText: string }>
> {
  const folders = listResumeFolders();
  return Promise.all(
    folders.map(async (folder) => ({
      ...folder,
      bulletText: await getBulletText(folder.filePath),
    }))
  );
}

/**
 * Clear the session cache (useful for testing).
 */
export function clearCache(): void {
  cache.clear();
}
