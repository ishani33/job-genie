import { addDays, todayISO } from "@/lib/utils";
import { FOLLOW_UP_RULES } from "@/lib/constants";
import type { Contact, AttentionItem, Application } from "@/types";

/**
 * Compute the suggested follow-up date and any status transition
 * when a contact's outreach status changes.
 */
export function computeContactFollowUp(
  contact: Contact,
  newStatus: Contact["outreachStatus"]
): { followUpDate: string; followUpCount: number; warning?: string } {
  const today = todayISO();
  let followUpDate = contact.followUpDate;
  let followUpCount = contact.followUpCount;
  let warning: string | undefined;

  switch (newStatus) {
    case "Outreach Sent":
      followUpDate = addDays(today, FOLLOW_UP_RULES.OUTREACH_SENT_DAYS);
      break;

    case "Connected/Accepted":
      // Clear follow-up, wait for reply
      followUpDate = addDays(today, FOLLOW_UP_RULES.OUTREACH_SENT_DAYS);
      break;

    case "Replied":
      // Clear follow-up date — user should schedule meeting
      followUpDate = "";
      warning = "Great! Schedule a meeting while the momentum is there.";
      break;

    case "Meeting Done":
      followUpDate = addDays(today, 1); // within 24h
      warning =
        "Send a thank-you note and ask for a referral within 24 hours.";
      break;

    case "Asked for Referral":
      followUpDate = addDays(today, FOLLOW_UP_RULES.REFERRAL_NUDGE_DAYS);
      warning =
        "If no response in 2 days, send one final nudge then move on.";
      break;

    case "Referred":
    case "Ghosted":
    case "Move On":
      followUpDate = "";
      break;

    default:
      break;
  }

  // If status was already "Outreach Sent" and we're logging another follow-up
  if (
    contact.outreachStatus === "Outreach Sent" &&
    newStatus === "Outreach Sent"
  ) {
    followUpCount += 1;
    if (followUpCount >= FOLLOW_UP_RULES.CONSIDER_MOVING_ON_COUNT) {
      warning = "Consider Moving On — no reply after multiple follow-ups.";
      followUpDate = "";
    } else {
      followUpDate = addDays(today, FOLLOW_UP_RULES.FOLLOW_UP_SENT_DAYS);
    }
  }

  return { followUpDate, followUpCount, warning };
}

/**
 * Build the prioritized "Needs Attention Today" queue.
 * Priority:
 *   1 — Overdue follow-ups (past Follow-up Date)
 *   2 — Meeting Done but referral not yet asked
 *   3 — Due today
 *   4 — Upcoming in next 2 days
 */
export function buildAttentionQueue(
  applications: Application[],
  contacts: Contact[]
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const today = todayISO();
  const soonDate = addDays(today, FOLLOW_UP_RULES.UPCOMING_DAYS_WINDOW);

  // Applications
  for (const app of applications) {
    if (!app.followUpDate) continue;
    if (app.followUpDate < today) {
      items.push({
        id: app.id,
        type: "application",
        priority: 1,
        label: `${app.companyName} — ${app.roleTitle}`,
        reason: `Follow-up overdue since ${app.followUpDate}`,
        data: app,
      });
    } else if (app.followUpDate === today) {
      items.push({
        id: app.id,
        type: "application",
        priority: 3,
        label: `${app.companyName} — ${app.roleTitle}`,
        reason: "Follow-up due today",
        data: app,
      });
    } else if (app.followUpDate <= soonDate) {
      items.push({
        id: app.id,
        type: "application",
        priority: 4,
        label: `${app.companyName} — ${app.roleTitle}`,
        reason: `Follow-up due ${app.followUpDate}`,
        data: app,
      });
    }
  }

  // Contacts
  for (const contact of contacts) {
    // Priority 2: Meeting Done, referral not yet asked
    if (contact.outreachStatus === "Meeting Done") {
      items.push({
        id: contact.id,
        type: "contact",
        priority: 2,
        label: `${contact.contactName} @ ${contact.companyName}`,
        reason: "Meeting done — have you asked for a referral yet?",
        data: contact,
      });
      continue;
    }

    if (!contact.followUpDate) continue;

    if (contact.followUpDate < today) {
      items.push({
        id: contact.id,
        type: "contact",
        priority: 1,
        label: `${contact.contactName} @ ${contact.companyName}`,
        reason: `Follow-up overdue since ${contact.followUpDate}`,
        data: contact,
      });
    } else if (contact.followUpDate === today) {
      items.push({
        id: contact.id,
        type: "contact",
        priority: 3,
        label: `${contact.contactName} @ ${contact.companyName}`,
        reason: "Follow-up due today",
        data: contact,
      });
    } else if (contact.followUpDate <= soonDate) {
      items.push({
        id: contact.id,
        type: "contact",
        priority: 4,
        label: `${contact.contactName} @ ${contact.companyName}`,
        reason: `Follow-up due ${contact.followUpDate}`,
        data: contact,
      });
    }
  }

  // Sort: priority ASC, then by date ASC
  return items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const aDate =
      a.type === "application"
        ? (a.data as Application).followUpDate
        : (a.data as Contact).followUpDate;
    const bDate =
      b.type === "application"
        ? (b.data as Application).followUpDate
        : (b.data as Contact).followUpDate;
    return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
  });
}

/**
 * Check if a company should be blacklisted based on past rejections.
 */
export function checkBlacklistThreshold(
  companyName: string,
  applications: Application[]
): number {
  const deadEnds = new Set(["Rejected", "Move On"]);
  return applications.filter(
    (a) =>
      a.companyName.toLowerCase() === companyName.toLowerCase() &&
      deadEnds.has(a.status)
  ).length;
}
