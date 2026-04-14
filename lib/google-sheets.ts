/**
 * Google Sheets data layer.
 * Uses a service account — no OAuth flow needed.
 *
 * Each module has its own spreadsheet (set via env vars), with a single tab
 * matching the SHEETS constants. All rows have a generated "id" as column A.
 */

import { google } from "googleapis";
import { SHEETS } from "@/lib/constants";
import { generateId, todayISO } from "@/lib/utils";
import type { Application, Contact } from "@/types";

export interface ResearchCacheEntry {
  contactName: string;
  company: string;
  role: string;
  linkedinUrl: string;
  researchSummary: string[];  // bullet points
  fullResearchData: string;   // JSON-stringified ResearchResult
  researchedAt: string;       // ISO timestamp
  rowIndex?: number;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const key = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  return new google.auth.JWT(email, undefined, key, [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
  ]);
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// ─── Application sheet helpers ────────────────────────────────────────────────

const APP_SHEET_ID = () => process.env.APPLICATIONS_SHEET_ID!;
const NET_SHEET_ID = () => process.env.NETWORKING_SHEET_ID!;

// Column order for Applications sheet
const APP_COLS = [
  "id",
  "companyName",
  "roleTitle",
  "jdUrl",
  "tier",
  "status",
  "dateAdded",
  "dateApplied",
  "resumeVersionUsed",
  "followUpDate",
  "notes",
  "blacklisted",
] as const;

// Column order for Networking sheet
const NET_COLS = [
  "id",
  "companyName",
  "contactName",
  "contactRole",
  "outreachType",
  "outreachStatus",
  "followUpCount",
  "lastOutreachDate",
  "followUpDate",
  "notes",
  "channelUrl",
] as const;

// ─── Generic helpers ──────────────────────────────────────────────────────────

async function getRows(
  sheetId: string,
  sheetName: string
): Promise<string[][]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${sheetName}'!A2:Z`,
  });
  return (res.data.values as string[][]) ?? [];
}

async function appendRow(
  sheetId: string,
  sheetName: string,
  values: string[]
): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}

async function updateRow(
  sheetId: string,
  sheetName: string,
  rowIndex: number, // 1-based, header is row 1 so data starts at row 2
  values: string[]
): Promise<void> {
  const sheets = getSheetsClient();
  const row = rowIndex + 1; // +1 because row 1 is header
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${sheetName}'!A${row}`,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}

async function deleteRow(
  sheetId: string,
  sheetName: string,
  rowIndex: number
): Promise<void> {
  const sheets = getSheetsClient();

  // Get sheet ID (not spreadsheet ID) for batchUpdate
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
  });
  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  const sheetGid = sheet?.properties?.sheetId ?? 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetGid,
              dimension: "ROWS",
              startIndex: rowIndex, // 0-based in batchUpdate
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}

// ─── Applications CRUD ────────────────────────────────────────────────────────

function rowToApplication(row: string[], rowIndex: number): Application {
  return {
    id: row[0] ?? generateId(),
    companyName: row[1] ?? "",
    roleTitle: row[2] ?? "",
    jdUrl: row[3] ?? "",
    tier: (Number(row[4]) as 1 | 2 | 3) ?? 3,
    status: (row[5] as Application["status"]) ?? "Exploring",
    dateAdded: row[6] ?? "",
    dateApplied: row[7] ?? "",
    resumeVersionUsed: row[8] ?? "",
    followUpDate: row[9] ?? "",
    notes: row[10] ?? "",
    blacklisted: row[11] === "true",
    rowIndex,
  };
}

function applicationToRow(app: Omit<Application, "rowIndex">): string[] {
  return [
    app.id,
    app.companyName,
    app.roleTitle,
    app.jdUrl,
    String(app.tier),
    app.status,
    app.dateAdded,
    app.dateApplied,
    app.resumeVersionUsed,
    app.followUpDate,
    app.notes,
    String(app.blacklisted),
  ];
}

export async function getApplications(): Promise<Application[]> {
  const rows = await getRows(APP_SHEET_ID(), SHEETS.APPLICATIONS);
  return rows.map((row, i) => rowToApplication(row, i + 1));
}

export async function createApplication(
  data: Omit<Application, "id" | "rowIndex" | "dateAdded">
): Promise<Application> {
  const app: Application = {
    ...data,
    id: generateId(),
    dateAdded: todayISO(),
  };
  await appendRow(APP_SHEET_ID(), SHEETS.APPLICATIONS, applicationToRow(app));
  return app;
}

export async function updateApplication(
  app: Application
): Promise<Application> {
  if (app.rowIndex == null) throw new Error("rowIndex required for update");
  await updateRow(
    APP_SHEET_ID(),
    SHEETS.APPLICATIONS,
    app.rowIndex,
    applicationToRow(app)
  );
  return app;
}

export async function deleteApplication(app: Application): Promise<void> {
  if (app.rowIndex == null) throw new Error("rowIndex required for delete");
  // rowIndex is 1-based data index.  The batchUpdate API uses 0-based indices
  // where row 0 = header.  Data row N (1-based) sits at 0-based index N, so
  // we pass rowIndex directly — no +1.
  await deleteRow(APP_SHEET_ID(), SHEETS.APPLICATIONS, app.rowIndex);
}

// ─── Networking CRUD ──────────────────────────────────────────────────────────

function rowToContact(row: string[], rowIndex: number): Contact {
  return {
    id: row[0] ?? generateId(),
    companyName: row[1] ?? "",
    contactName: row[2] ?? "",
    contactRole: row[3] ?? "",
    outreachType: (row[4] as Contact["outreachType"]) ?? "LinkedIn DM",
    outreachStatus: (row[5] as Contact["outreachStatus"]) ?? "Identified",
    followUpCount: Number(row[6]) || 0,
    lastOutreachDate: row[7] ?? "",
    followUpDate: row[8] ?? "",
    notes: row[9] ?? "",
    channelUrl: row[10] ?? "",
    rowIndex,
  };
}

function contactToRow(contact: Omit<Contact, "rowIndex">): string[] {
  return [
    contact.id,
    contact.companyName,
    contact.contactName,
    contact.contactRole,
    contact.outreachType,
    contact.outreachStatus,
    String(contact.followUpCount),
    contact.lastOutreachDate,
    contact.followUpDate,
    contact.notes,
    contact.channelUrl,
  ];
}

export async function getContacts(): Promise<Contact[]> {
  const rows = await getRows(NET_SHEET_ID(), SHEETS.NETWORKING);
  console.log(`[getContacts] Fetched ${rows.length} row(s) from sheet`);

  const contacts: Contact[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = i + 1; // 1-based data index
    let contact: Contact;
    try {
      contact = rowToContact(row, rowIndex);
    } catch (err) {
      console.error(
        `[getContacts] Failed to parse sheet row ${rowIndex + 1} (data index ${rowIndex}):`,
        row,
        err
      );
      // Never skip a row — return it with available data and flag it
      contact = {
        id: row[0] ?? generateId(),
        companyName: row[1] ?? "",
        contactName: row[2] ?? `[Parse Error — Row ${rowIndex + 1}]`,
        contactRole: row[3] ?? "",
        outreachType: "Other",
        outreachStatus: "Identified",
        followUpCount: 0,
        lastOutreachDate: row[7] ?? "",
        followUpDate: row[8] ?? "",
        notes: `[Parse error: ${err instanceof Error ? err.message : String(err)}]`,
        channelUrl: "",
        rowIndex,
        parseError: true,
      };
    }

    // Detect duplicate IDs (e.g. a row was manually copied in the sheet).
    // React uses contact.id as a key; duplicates cause one row to be silently dropped.
    if (seenIds.has(contact.id)) {
      console.warn(
        `[getContacts] Duplicate ID "${contact.id}" at sheet row ${rowIndex + 1}. ` +
          `Assigning a new ID so the row renders correctly.`
      );
      contact = { ...contact, id: generateId() };
    }
    seenIds.add(contact.id);
    contacts.push(contact);
  }

  return contacts;
}

export async function createContact(
  data: Omit<Contact, "id" | "rowIndex">
): Promise<Contact> {
  const contact: Contact = { ...data, id: generateId() };
  await appendRow(
    NET_SHEET_ID(),
    SHEETS.NETWORKING,
    contactToRow(contact)
  );
  return contact;
}

export async function updateContact(contact: Contact): Promise<Contact> {
  if (contact.rowIndex == null) throw new Error("rowIndex required for update");
  await updateRow(
    NET_SHEET_ID(),
    SHEETS.NETWORKING,
    contact.rowIndex,
    contactToRow(contact)
  );
  return contact;
}

export async function deleteContact(contact: Contact): Promise<void> {
  if (contact.rowIndex == null) throw new Error("rowIndex required for delete");
  // rowIndex is 1-based data index.  batchUpdate uses 0-based indices where
  // row 0 = header, so data row N (1-based) = 0-based index N.  Pass directly.
  await deleteRow(NET_SHEET_ID(), SHEETS.NETWORKING, contact.rowIndex);
}

// ─── Research Cache CRUD ──────────────────────────────────────────────────────

const CACHE_COLS = [
  "contactName",
  "company",
  "role",
  "linkedinUrl",
  "researchSummary",
  "fullResearchData",
  "researchedAt",
] as const;

export async function getResearchCache(
  contactName: string,
  company: string
): Promise<ResearchCacheEntry | null> {
  try {
    const rows = await getRows(NET_SHEET_ID(), SHEETS.RESEARCH_CACHE);
    const idx = rows.findIndex(
      (r) =>
        r[0]?.toLowerCase() === contactName.toLowerCase() &&
        r[1]?.toLowerCase() === company.toLowerCase()
    );
    if (idx === -1) return null;
    const row = rows[idx];
    return {
      contactName: row[0] ?? "",
      company: row[1] ?? "",
      role: row[2] ?? "",
      linkedinUrl: row[3] ?? "",
      researchSummary: JSON.parse(row[4] ?? "[]") as string[],
      fullResearchData: row[5] ?? "{}",
      researchedAt: row[6] ?? "",
      rowIndex: idx + 1,
    };
  } catch {
    return null;
  }
}

export async function saveResearchCache(
  entry: Omit<ResearchCacheEntry, "rowIndex">
): Promise<void> {
  await appendRow(NET_SHEET_ID(), SHEETS.RESEARCH_CACHE, [
    entry.contactName,
    entry.company,
    entry.role,
    entry.linkedinUrl,
    JSON.stringify(entry.researchSummary),
    entry.fullResearchData,
    entry.researchedAt,
  ]);
}

export async function updateResearchCache(
  rowIndex: number,
  entry: Omit<ResearchCacheEntry, "rowIndex">
): Promise<void> {
  await updateRow(NET_SHEET_ID(), SHEETS.RESEARCH_CACHE, rowIndex, [
    entry.contactName,
    entry.company,
    entry.role,
    entry.linkedinUrl,
    JSON.stringify(entry.researchSummary),
    entry.fullResearchData,
    entry.researchedAt,
  ]);
}

// ─── Initialize sheets (create header rows if missing) ────────────────────────

export async function initSheets(): Promise<void> {
  const sheets = getSheetsClient();

  async function ensureTabExists(spreadsheetId: string, tabName: string) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = meta.data.sheets?.some(
      (s) => s.properties?.title === tabName
    );
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: tabName } } }],
        },
      });
    }
  }

  async function ensureHeader(
    sheetId: string,
    sheetName: string,
    headers: string[]
  ) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${sheetName}'!A1:Z1`,
    });
    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'${sheetName}'!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    }
  }

  await ensureHeader(APP_SHEET_ID(), SHEETS.APPLICATIONS, [...APP_COLS]);
  await ensureHeader(NET_SHEET_ID(), SHEETS.NETWORKING, [...NET_COLS]);

  // Research Cache lives as a tab on the Networking spreadsheet
  await ensureTabExists(NET_SHEET_ID(), SHEETS.RESEARCH_CACHE);
  await ensureHeader(NET_SHEET_ID(), SHEETS.RESEARCH_CACHE, [...CACHE_COLS]);
}
