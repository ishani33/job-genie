import { NextRequest, NextResponse } from "next/server";
import { draftOutreachMessage } from "@/lib/claude";
import type { Contact, Application } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { contact, application, type } = await req.json() as {
      contact: Contact;
      application?: Application;
      type?: "initial" | "followup" | "referral-ask" | "thank-you";
    };

    if (!contact) {
      return NextResponse.json(
        { error: "contact is required" },
        { status: 400 }
      );
    }

    const draft = await draftOutreachMessage(contact, application, type);
    return NextResponse.json({ data: draft });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
