import { NextRequest, NextResponse } from "next/server";
import { analyzeJobDescription } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { jdText, resumeSummary } = await req.json();
    if (!jdText) {
      return NextResponse.json(
        { error: "jdText is required" },
        { status: 400 }
      );
    }
    const analysis = await analyzeJobDescription(jdText, resumeSummary);
    return NextResponse.json({ data: analysis });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
