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
    range: `${sheetName}!A2:Z`,
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
    range: `${sheetName}!A1`,
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
    range: `${sheetName}!A${row}`,
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
  // rowIndex is 1-based data index; actual sheet row = rowIndex+1 (header)
  // batchUpdate uses 0-based startIndex for data row = rowIndex (0-based data) + 1 (header)
  await deleteRow(APP_SHEET_ID(), SHEETS.APPLICATIONS, app.rowIndex + 1);
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
  return rows.map((row, i) => rowToContact(row, i + 1));
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
  await deleteRow(NET_SHEET_ID(), SHEETS.NETWORKING, contact.rowIndex + 1);
}

// ─── Initialize sheets (create header rows if missing) ────────────────────────

export async function initSheets(): Promise<void> {
  const sheets = getSheetsClient();

  async function ensureHeader(
    sheetId: string,
    sheetName: string,
    headers: string[]
  ) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:Z1`,
    });
    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    }
  }

  await ensureHeader(
    APP_SHEET_ID(),
    SHEETS.APPLICATIONS,
    [...APP_COLS]
  );
  await ensureHeader(
    NET_SHEET_ID(),
    SHEETS.NETWORKING,
    [...NET_COLS]
  );
}
