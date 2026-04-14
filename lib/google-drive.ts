/**
 * Google Drive helper for resume file uploads.
 * Files are stored in GOOGLE_DRIVE_FOLDER_ID.
 */

import { google } from "googleapis";
import { Readable } from "stream";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const key = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  return new google.auth.JWT(email, undefined, key, [
    "https://www.googleapis.com/auth/drive.file",
  ]);
}

function getDriveClient() {
  return google.drive({ version: "v3", auth: getAuth() });
}

const FOLDER_ID = () => process.env.GOOGLE_DRIVE_FOLDER_ID!;

export interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
  createdTime: string;
}

/**
 * Upload a resume PDF/DOCX buffer to Drive.
 * Returns the file metadata including a shareable view link.
 */
export async function uploadResume(
  buffer: Buffer,
  fileName: string,
  mimeType = "application/pdf"
): Promise<DriveFile> {
  const drive = getDriveClient();

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [FOLDER_ID()],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id,name,webViewLink,createdTime",
  });

  const file = res.data;
  if (!file.id) throw new Error("Drive upload failed");

  // Make it readable by anyone with the link
  await drive.permissions.create({
    fileId: file.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    id: file.id,
    name: file.name ?? fileName,
    webViewLink: file.webViewLink ?? "",
    createdTime: file.createdTime ?? "",
  };
}

/**
 * List all resume files in the configured Drive folder.
 */
export async function listResumes(): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${FOLDER_ID()}' in parents and trashed=false`,
    fields: "files(id,name,webViewLink,createdTime)",
    orderBy: "createdTime desc",
  });
  return (res.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name!,
    webViewLink: f.webViewLink ?? "",
    createdTime: f.createdTime ?? "",
  }));
}

/**
 * Delete a resume file from Drive.
 */
export async function deleteResume(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}
