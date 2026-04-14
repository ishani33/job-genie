import { NextRequest, NextResponse } from "next/server";
import { getAllResumesWithBullets } from "@/lib/resume-parser";
import { matchResume } from "@/lib/resume-matcher-ai";

export async function POST(req: NextRequest) {
  try {
    const { jdText } = await req.json() as { jdText: string };

    if (!jdText?.trim()) {
      return NextResponse.json({ error: "jdText is required" }, { status: 400 });
    }

    const resumes = await getAllResumesWithBullets();
    if (resumes.length === 0) {
      return NextResponse.json(
        { error: "No resumes found in RESUMES_PATH" },
        { status: 404 }
      );
    }

    const match = await matchResume(jdText, resumes);
    return NextResponse.json({ data: match });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
