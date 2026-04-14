import { NextRequest, NextResponse } from "next/server";
import { getContacts, createContact } from "@/lib/google-sheets";
import type { Contact } from "@/types";

export async function GET() {
  try {
    const contacts = await getContacts();
    return NextResponse.json({ data: contacts });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Omit<Contact, "id" | "rowIndex">;
    const contact = await createContact(body);
    return NextResponse.json({ data: contact });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
