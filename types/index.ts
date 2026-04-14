// ─── Tiers ────────────────────────────────────────────────────────────────────

export type Tier = 1 | 2 | 3;

// ─── Application ──────────────────────────────────────────────────────────────

export type Tier1Status =
  | "Exploring"
  | "Networking"
  | "Applied"
  | "Phone Screen"
  | "Interview"
  | "Offer"
  | "Accepted"
  | "Ghosted"
  | "Rejected"
  | "Move On"
  | "On Hold";

export type Tier2Status =
  | "Exploring"
  | "Applied"
  | "Phone Screen"
  | "Interview"
  | "Offer"
  | "Accepted"
  | "Ghosted"
  | "Rejected"
  | "Move On"
  | "Withdrew";

export type Tier3Status =
  | "Applied"
  | "Response"
  | "No Response"
  | "Rejected"
  | "Move On";

export type ApplicationStatus = Tier1Status | Tier2Status | Tier3Status;

export interface Application {
  id: string;
  companyName: string;
  roleTitle: string;
  jdUrl: string;
  tier: Tier;
  status: ApplicationStatus;
  dateAdded: string;        // ISO date string
  dateApplied: string;      // ISO date string
  resumeVersionUsed: string;
  followUpDate: string;     // ISO date string
  notes: string;
  blacklisted: boolean;
  // Computed / metadata
  rowIndex?: number;        // Google Sheets row index (for updates)
}

// ─── Networking ───────────────────────────────────────────────────────────────

export type OutreachType =
  | "LinkedIn DM"
  | "Email"
  | "In-Person"
  | "Event"
  | "Mutual Intro"
  | "Other";

export type OutreachStatus =
  | "Identified"
  | "Outreach Sent"
  | "Connected/Accepted"
  | "Replied"
  | "Meeting Scheduled"
  | "Meeting Done"
  | "Asked for Referral"
  | "Referred"
  | "Ghosted"
  | "Move On";

export interface Contact {
  id: string;
  companyName: string;
  contactName: string;
  contactRole: string;
  outreachType: OutreachType;
  outreachStatus: OutreachStatus;
  followUpCount: number;
  lastOutreachDate: string;   // ISO date string
  followUpDate: string;       // ISO date string
  notes: string;
  channelUrl: string;
  // Computed / metadata
  rowIndex?: number;
  /** Set to true when the row failed to parse; row is still shown but flagged in red. */
  parseError?: boolean;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface ApplicationSummary {
  tier1InFlight: number;
  tier2InFlight: number;
  tier3InFlight: number;
  offers: number;
  ghosted: number;
  needsAttentionToday: Application[];
}

export interface NetworkingSummary {
  needsFollowUpToday: Contact[];
  considerMovingOn: Contact[];
  referralNotYetAsked: Contact[];
}

// ─── Priority queue item ───────────────────────────────────────────────────────

export type AttentionPriority = 1 | 2 | 3 | 4;

export interface AttentionItem {
  id: string;
  type: "application" | "contact";
  priority: AttentionPriority;
  label: string;
  reason: string;
  data: Application | Contact;
}

// ─── Status metadata ──────────────────────────────────────────────────────────

export type StatusCategory = "active" | "deadend" | "offer" | "neutral";

export interface StatusMeta {
  label: string;
  category: StatusCategory;
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface BlacklistPrompt {
  companyName: string;
  rejectionCount: number;
}
