import { NextRequest, NextResponse } from "next/server";
import { extractJDSkills } from "@/lib/resume-matcher-ai";

export async function POST(req: NextRequest) {
  try {
    const { jdText } = (await req.json()) as { jdText: string };
    if (!jdText?.trim()) {
      return NextResponse.json({ error: "jdText is required" }, { status: 400 });
    }
    const skills = await extractJDSkills(jdText);
    return NextResponse.json({ data: { skills } });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
