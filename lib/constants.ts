import type {
  Tier1Status,
  Tier2Status,
  Tier3Status,
  StatusCategory,
  OutreachStatus,
} from "@/types";

// ─── Tier pipeline statuses ───────────────────────────────────────────────────

export const TIER1_STATUSES: Tier1Status[] = [
  "Exploring",
  "Networking",
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Accepted",
  "Ghosted",
  "Rejected",
  "Move On",
  "On Hold",
];

export const TIER2_STATUSES: Tier2Status[] = [
  "Exploring",
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Accepted",
  "Ghosted",
  "Rejected",
  "Move On",
  "Withdrew",
];

export const TIER3_STATUSES: Tier3Status[] = [
  "Applied",
  "Response",
  "No Response",
  "Rejected",
  "Move On",
];

export const DEAD_END_STATUSES = new Set([
  "Ghosted",
  "Rejected",
  "Move On",
  "On Hold",
  "No Response",
  "Withdrew",
]);

export const OFFER_STATUSES = new Set(["Offer", "Accepted"]);

export const IN_FLIGHT_STATUSES = new Set([
  "Exploring",
  "Networking",
  "Applied",
  "Phone Screen",
  "Interview",
  "Response",
]);

// ─── Status → visual category ─────────────────────────────────────────────────

export const STATUS_CATEGORY: Record<string, StatusCategory> = {
  // active
  Exploring: "active",
  Networking: "active",
  Applied: "active",
  "Phone Screen": "active",
  Interview: "active",
  Response: "active",
  // offer
  Offer: "offer",
  Accepted: "offer",
  // dead end
  Ghosted: "deadend",
  Rejected: "deadend",
  "Move On": "deadend",
  "On Hold": "deadend",
  "No Response": "deadend",
  Withdrew: "deadend",
};

// ─── Networking pipelines ─────────────────────────────────────────────────────

export const OUTREACH_STATUSES: OutreachStatus[] = [
  "Identified",
  "Outreach Sent",
  "Connected/Accepted",
  "Replied",
  "Meeting Scheduled",
  "Meeting Done",
  "Asked for Referral",
  "Referred",
  "Ghosted",
  "Move On",
];

export const NETWORKING_DEAD_ENDS = new Set<OutreachStatus>([
  "Ghosted",
  "Move On",
]);

export const NETWORKING_STATUS_CATEGORY: Record<OutreachStatus, StatusCategory> = {
  Identified: "neutral",
  "Outreach Sent": "active",
  "Connected/Accepted": "active",
  Replied: "active",
  "Meeting Scheduled": "active",
  "Meeting Done": "active",
  "Asked for Referral": "offer",
  Referred: "offer",
  Ghosted: "deadend",
  "Move On": "deadend",
};

// ─── Outreach types ────────────────────────────────────────────────────────────

export const OUTREACH_TYPES = [
  "LinkedIn DM",
  "Email",
  "In-Person",
  "Event",
  "Mutual Intro",
  "Other",
] as const;

// ─── Tier labels ──────────────────────────────────────────────────────────────

export const TIER_LABELS: Record<number, string> = {
  1: "T1 · Dream Fit",
  2: "T2 · Strong Match",
  3: "T3 · Spray",
};

// ─── Google Sheets tab names ──────────────────────────────────────────────────

export const SHEETS = {
  APPLICATIONS: "Applications",
  NETWORKING: "Networking",
  RESEARCH_CACHE: "Research Cache",
} as const;

// ─── Follow-up timing rules (in days) ────────────────────────────────────────

export const FOLLOW_UP_RULES = {
  OUTREACH_SENT_DAYS: 2,
  FOLLOW_UP_SENT_DAYS: 2,
  MEETING_DONE_HOURS: 24,
  REFERRAL_NUDGE_DAYS: 2,
  CONSIDER_MOVING_ON_COUNT: 3,
  UPCOMING_DAYS_WINDOW: 2,
  BLACKLIST_REJECTION_THRESHOLD: 2,
} as const;
