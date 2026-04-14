import { NextResponse } from "next/server";
import { listResumeFolders } from "@/lib/resume-parser";

export async function GET() {
  try {
    const folders = listResumeFolders();
    return NextResponse.json({ data: folders });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
