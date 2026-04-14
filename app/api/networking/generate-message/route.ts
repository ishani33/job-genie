import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { todayISO } from "@/lib/utils";
import type { Contact, Application } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";
const WRITING_STYLE_PATH = path.join(process.cwd(), "ishani-writing-style.md");

// ─── Message type detection (silent, never surfaced in UI) ───────────────────

export type MessageType =
  | "connection_request"
  | "first_dm"
  | "followup"
  | "conversation_continuation"
  | "confirmation"
  | "thank_you_referral"
  | "final_nudge";

function detectMessageType(contact: Contact): MessageType {
  const today = todayISO();
  const daysSince = contact.lastOutreachDate
    ? Math.floor(
        (new Date(today).getTime() - new Date(contact.lastOutreachDate).getTime()) /
          86_400_000
      )
    : 0;

  switch (contact.outreachStatus) {
    case "Identified":
      return "connection_request";
    case "Outreach Sent":
      return daysSince >= 3 ? "followup" : "connection_request";
    case "Connected/Accepted":
      return "first_dm";
    case "Replied":
      return "conversation_continuation";
    case "Meeting Scheduled":
      return "confirmation";
    case "Meeting Done":
      return "thank_you_referral";
    case "Asked for Referral":
      return daysSince >= 3 ? "final_nudge" : "thank_you_referral";
    default:
      return "followup";
  }
}

const MESSAGE_TYPE_TASK: Record<MessageType, string> = {
  connection_request:
    "LinkedIn connection request, strictly under 200 characters. Pattern: [Hook] + [1-line credential] + [Soft ask to connect]. No request for a chat yet.",
  first_dm:
    "First DM after connecting, 3-4 lines max. Pattern: [Specific hook about their work] + [Brief credential relevant to their world] + [Single low-friction ask].",
  followup:
    "Follow-up with no reply, 2-3 lines max. Light bump, one line why still relevant, same ask. Never say 'just following up'.",
  conversation_continuation:
    "Continue the conversation — acknowledge their reply, build on it, gently move toward a meeting.",
  confirmation:
    "Meeting confirmation with a brief genuine prep note showing knowledge of their work.",
  thank_you_referral:
    "Thank-you note + natural referral ask within 24hrs of meeting. Specific reference to something from the conversation, then work in the referral ask organically — never transactionally.",
  final_nudge:
    "Final gentle nudge on an unanswered referral ask. 2 lines max. Zero pressure, easy to decline, graceful exit if needed.",
};

// ─── Research step ────────────────────────────────────────────────────────────

export interface ResearchResult {
  bulletPoints: string[];
  rawFindings: string;
}

async function researchContact(contact: Contact): Promise<ResearchResult> {
  const { contactName, contactRole, companyName, channelUrl } = contact;

  const profileSearch = channelUrl
    ? `Search this LinkedIn profile URL to find their background: ${channelUrl}`
    : `Search: "${contactName} ${companyName} ${contactRole} LinkedIn"`;

  const prompt = `Research this person for networking message context. Do 2-3 searches.

1. ${profileSearch}
2. Search: "${companyName} recent news product launch funding 2025 2026"

Person: ${contactName}, ${contactRole} at ${companyName}

Extract:
- Current role and team, how long they have been at the company
- Any recent posts, articles, or notable work
- Company recent milestones, product launches, or funding rounds
- Any connection to: Chicago Booth, VIT, Visa, Amazon, Phyllo, India, Bay Area, Chicago

Return ONLY valid JSON (no markdown):
{
  "bulletPoints": ["2-3 short lines, each 1 sentence, about this person and their company"],
  "rawFindings": "Detailed paragraph of all findings, to be used as message generation context"
}`;

  try {
    const msg = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: 1500,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
          } as unknown as Anthropic.Tool,
        ],
        messages: [{ role: "user", content: prompt }],
      },
      { headers: { "anthropic-beta": "web-search-2025-03-05" } } as Parameters<typeof anthropic.messages.create>[1]
    );

    // The response contains a mix of tool_use and text blocks.
    // We want the last text block — the model's final synthesis.
    const content = msg.content as Array<{ type: string; text?: string }>;
    const lastText = [...content].reverse().find((b) => b.type === "text")?.text ?? "";
    const cleaned = lastText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    if (cleaned.startsWith("{")) {
      const parsed = JSON.parse(cleaned) as ResearchResult;
      return {
        bulletPoints: (parsed.bulletPoints ?? []).slice(0, 3),
        rawFindings: parsed.rawFindings ?? "",
      };
    }
  } catch {
    // Web search unavailable or failed — use fallback below
  }

  // Fallback: construct from known data
  return {
    bulletPoints: [
      `${contactName} is a ${contactRole} at ${companyName}`,
      contact.notes ? `Context: ${contact.notes}` : `Outreach channel: ${contact.outreachType}`,
    ].filter(Boolean),
    rawFindings: `${contactName} works as ${contactRole} at ${companyName}. Notes: ${contact.notes || "none"}. No additional web research data available.`,
  };
}

// ─── Generation step ──────────────────────────────────────────────────────────

interface Variant {
  subject?: string;
  body: string;
}

async function generateVariants(
  contact: Contact,
  application: Application | null,
  research: ResearchResult,
  channel: "LinkedIn DM" | "Email",
  messageType: MessageType
): Promise<{ A: Variant; B: Variant; C: Variant }> {
  const writingStyle = fs.readFileSync(WRITING_STYLE_PATH, "utf-8");
  const isEmail = channel === "Email";
  const firstName = contact.contactName.split(" ")[0];

  const channelRules = isEmail
    ? `EMAIL RULES: Always include a specific subject line (e.g. "PM Roles at ${contact.companyName}" not "Reaching Out"). Short paragraphs. Greeting: "Hi ${firstName},". Sign off: Ishani Chauhan + ichauhan@ChicagoBooth.edu`
    : `LINKEDIN DM RULES: No subject line. Connection request under 200 chars. Other DMs: 3-4 lines max. Sign off as "Ishani" only.`;

  const variantShape = isEmail
    ? '{ "subject": "...", "body": "..." }'
    : '{ "body": "..." }';

  const prompt = `Generate 3 networking message variants labeled A, B, C.

CONTACT: ${contact.contactName}, ${contact.contactRole} at ${contact.companyName}
CHANNEL: ${channel}
NOTES / PRIOR CONTEXT: ${contact.notes || "None"}
FOLLOW-UP COUNT: ${contact.followUpCount}
${application ? `TARGET ROLE: ${application.roleTitle} at ${application.companyName}` : ""}

RESEARCH FINDINGS:
${research.rawFindings}

MESSAGE TASK: ${MESSAGE_TYPE_TASK[messageType]}

${channelRules}

ALL 3 VARIANTS MUST:
- Use distinctly different hooks and approaches — not synonym swaps of the same angle
- Follow every rule in the writing style guide (system prompt)
- Contain no em dashes anywhere — use a comma, period, or new sentence
- For connection requests: if over 200 chars, append "(X chars — over limit)" at the end

Return ONLY valid JSON (no markdown):
{
  "A": ${variantShape},
  "B": ${variantShape},
  "C": ${variantShape}
}`;

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    temperature: 0.7,
    system: writingStyle,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned) as { A: Variant; B: Variant; C: Variant };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { contact, application, channel, cachedResearch } =
      (await req.json()) as {
        contact: Contact;
        application?: Application;
        channel: "LinkedIn DM" | "Email";
        /** Pass cached research to skip the web search step (for Regenerate). */
        cachedResearch?: ResearchResult;
      };

    if (!contact) {
      return NextResponse.json({ error: "contact is required" }, { status: 400 });
    }

    const effectiveChannel =
      channel ?? (contact.outreachType === "Email" ? "Email" : "LinkedIn DM");

    const messageType = detectMessageType(contact);

    const research = cachedResearch ?? (await researchContact(contact));

    const variants = await generateVariants(
      contact,
      application ?? null,
      research,
      effectiveChannel,
      messageType
    );

    return NextResponse.json({
      data: { research, variants, messageType, channel: effectiveChannel },
    });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
