/**
 * Claude AI integration for smart job search features.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Application, Contact } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-6";

// ─── JD Analysis ──────────────────────────────────────────────────────────────

export interface JDAnalysis {
  suggestedTier: 1 | 2 | 3;
  tierReason: string;
  keySkills: string[];
  roleType: string;
  companySummary: string;
  fitNotes: string;
}

export async function analyzeJobDescription(
  jdText: string,
  resumeSummary?: string
): Promise<JDAnalysis> {
  const prompt = `Analyze this job description and return a JSON object.

Job Description:
${jdText}

${resumeSummary ? `Candidate Summary:\n${resumeSummary}` : ""}

Return ONLY valid JSON (no markdown) matching this TypeScript type:
{
  suggestedTier: 1 | 2 | 3,  // 1=Dream Fit, 2=Strong Match, 3=Spray
  tierReason: string,         // one sentence explanation
  keySkills: string[],        // top 5 required skills
  roleType: string,           // e.g. "Senior IC", "Manager", "IC - Mid"
  companySummary: string,     // 1-2 sentences about the company from the JD
  fitNotes: string            // brief notes on candidate fit
}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned) as JDAnalysis;
}

// ─── Networking message drafts ────────────────────────────────────────────────

export interface MessageDraft {
  subject?: string;
  body: string;
}

export async function draftOutreachMessage(
  contact: Contact,
  application?: Application,
  type: "initial" | "followup" | "referral-ask" | "thank-you" = "initial"
): Promise<MessageDraft> {
  const context = [
    `Contact: ${contact.contactName}, ${contact.contactRole} at ${contact.companyName}`,
    `Channel: ${contact.outreachType}`,
    application
      ? `Role I'm applying for: ${application.roleTitle} at ${application.companyName}`
      : "",
    contact.notes ? `Context: ${contact.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const typeInstructions: Record<typeof type, string> = {
    initial:
      "Write a concise, warm first outreach message. Keep it under 4 sentences. No generic platitudes.",
    followup:
      "Write a brief, friendly follow-up. Acknowledge you haven't heard back. Stay positive and concise.",
    "referral-ask":
      "Write a message asking for a referral. Be direct but gracious. Explain why you're excited about the role.",
    "thank-you":
      "Write a thank-you message after a conversation. Reference the meeting and reiterate interest.",
  };

  const prompt = `${typeInstructions[type]}

${context}

${contact.outreachType === "Email" ? "Include a subject line." : ""}

Return ONLY valid JSON (no markdown):
{
  ${contact.outreachType === "Email" ? '"subject": "string",' : ""}
  "body": "string"
}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "{}";
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned) as MessageDraft;
}

// ─── Application notes / next steps ──────────────────────────────────────────

export async function suggestNextSteps(app: Application): Promise<string> {
  const prompt = `Given this job application status, suggest 2-3 concrete next steps in plain text (no bullet points):
Company: ${app.companyName}
Role: ${app.roleTitle}
Tier: ${app.tier}
Status: ${app.status}
Notes: ${app.notes}
Days since applied: ${app.dateApplied ? Math.floor((Date.now() - new Date(app.dateApplied).getTime()) / 86400000) : "N/A"}

Keep it under 3 sentences.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}
