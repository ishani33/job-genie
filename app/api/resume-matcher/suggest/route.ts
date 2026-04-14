import { NextRequest, NextResponse } from "next/server";
import { getFullText } from "@/lib/resume-parser";
import { suggestBulletEdits } from "@/lib/resume-matcher-ai";

export async function POST(req: NextRequest) {
  try {
    const { jdText, filePath } = await req.json() as {
      jdText: string;
      filePath: string;
    };

    if (!jdText?.trim() || !filePath?.trim()) {
      return NextResponse.json(
        { error: "jdText and filePath are required" },
        { status: 400 }
      );
    }

    const fullText = await getFullText(filePath);
    const { suggestions, atsKeywords } = await suggestBulletEdits(jdText, fullText);

    return NextResponse.json({ data: { suggestions, atsKeywords, fullText } });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
