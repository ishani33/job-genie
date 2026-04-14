import { NextRequest, NextResponse } from "next/server";
import {
  getApplications,
  createApplication,
} from "@/lib/google-sheets";
import { checkBlacklistThreshold } from "@/lib/follow-up-rules";
import { FOLLOW_UP_RULES } from "@/lib/constants";
import type { Application } from "@/types";

export async function GET() {
  try {
    const applications = await getApplications();
    return NextResponse.json({ data: applications });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Omit<
      Application,
      "id" | "rowIndex" | "dateAdded"
    >;

    // Check blacklist threshold before creating
    const allApps = await getApplications();
    const rejectionCount = checkBlacklistThreshold(
      body.companyName,
      allApps
    );

    let blacklistWarning: string | undefined;
    if (rejectionCount >= FOLLOW_UP_RULES.BLACKLIST_REJECTION_THRESHOLD) {
      blacklistWarning = `You've been rejected or moved on from ${body.companyName} ${rejectionCount} time(s). Consider adding them to the blacklist.`;
    }

    const application = await createApplication(body);

    return NextResponse.json({
      data: application,
      ...(blacklistWarning && { blacklistWarning }),
    });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
