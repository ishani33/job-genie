import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getContacts, updateContact as updateContactSheet } from "@/lib/google-sheets";
import { computeContactFollowUp } from "@/lib/follow-up-rules";
import { todayISO } from "@/lib/utils";
import type { Contact } from "@/types";
import type { MessageType } from "@/app/api/networking/generate-message/route";

const WRITING_STYLE_PATH = path.join(process.cwd(), "ishani-writing-style.md");

// ─── Word-change ratio (LCS-based) ───────────────────────────────────────────

function wordChangePct(original: string, modified: string): number {
  const orig = original.trim().split(/\s+/).filter(Boolean);
  const mod = modified.trim().split(/\s+/).filter(Boolean);
  if (!orig.length && !mod.length) return 0;
  const m = orig.length;
  const n = mod.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        orig[i - 1].toLowerCase() === mod[j - 1].toLowerCase()
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const lcs = dp[m][n];
  const total = Math.max(m, n);
  return total > 0 ? 1 - lcs / total : 0;
}

// ─── Writing style auto-learn ─────────────────────────────────────────────────

function appendToGoodExamples(entry: string): void {
  const content = fs.readFileSync(WRITING_STYLE_PATH, "utf-8");
  const avoidIdx = content.indexOf("## Avoid Log");
  const insertAt = avoidIdx > 0 ? avoidIdx : content.length;
  const newContent =
    content.slice(0, insertAt).trimEnd() +
    "\n\n" +
    entry.trim() +
    "\n\n" +
    content.slice(insertAt);
  fs.writeFileSync(WRITING_STYLE_PATH, newContent, "utf-8");
}

function appendToAvoidLog(entry: string): void {
  const content = fs.readFileSync(WRITING_STYLE_PATH, "utf-8");
  fs.writeFileSync(WRITING_STYLE_PATH, content.trimEnd() + "\n" + entry + "\n", "utf-8");
}

// ─── Status update rules after copy ──────────────────────────────────────────

function getStatusUpdate(messageType: MessageType, contact: Contact): Partial<Contact> {
  const today = todayISO();
  switch (messageType) {
    case "connection_request": {
      const { followUpDate, followUpCount } = computeContactFollowUp(contact, "Outreach Sent");
      return { outreachStatus: "Outreach Sent", followUpDate, followUpCount, lastOutreachDate: today };
    }
    case "followup":
    case "final_nudge": {
      const newCount = contact.followUpCount + 1;
      const { followUpDate } = computeContactFollowUp(
        { ...contact, followUpCount: newCount },
        "Outreach Sent"
      );
      return { followUpCount: newCount, followUpDate, lastOutreachDate: today };
    }
    case "thank_you_referral": {
      const { followUpDate, followUpCount } = computeContactFollowUp(contact, "Asked for Referral");
      return { outreachStatus: "Asked for Referral", followUpDate, followUpCount, lastOutreachDate: today };
    }
    case "first_dm":
    case "conversation_continuation":
    case "confirmation":
      return { lastOutreachDate: today };
    default:
      return {};
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { contactId, messageType, originalText, copiedText, channel, context } =
      (await req.json()) as {
        contactId: string;
        messageType: MessageType;
        originalText: string;
        copiedText: string;
        channel: string;
        context: string;
      };

    const contacts = await getContacts();
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // ── Writing style auto-learn ──────────────────────────────────────────
    try {
      const changePct = wordChangePct(originalText, copiedText);
      const today = todayISO();

      if (changePct < 0.3) {
        // Under 30% changed → log as a Good Example
        const exampleNum = (fs.readFileSync(WRITING_STYLE_PATH, "utf-8").match(/^### Example/gm) ?? []).length + 1;
        const preview = copiedText.length > 280 ? copiedText.slice(0, 280) + "…" : copiedText;
        const entry =
          `### Example ${exampleNum} — ${channel}, auto-logged ${today}\n` +
          `Context: ${context}\n` +
          `"${preview}"`;
        appendToGoodExamples(entry);
      } else {
        // Over 30% changed → Avoid Log note
        const origWords = originalText.split(/\s+/).filter(Boolean).length;
        const copyWords = copiedText.split(/\s+/).filter(Boolean).length;
        const pct = Math.round(changePct * 100);
        const entry =
          `<!-- ${today} | ${channel} | ~${pct}% changed | ${origWords}→${copyWords} words | ${context} -->`;
        appendToAvoidLog(entry);
      }
    } catch {
      // Writing style update is non-critical — don't fail the request
    }

    // ── Contact status update ────────────────────────────────────────────
    const patch = getStatusUpdate(messageType, contact);
    const updated: Contact = { ...contact, ...patch };
    await updateContactSheet(updated);

    return NextResponse.json({ data: { contact: updated } });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
