import { NextRequest, NextResponse } from "next/server";
import {
  getContacts,
  updateContact,
  deleteContact,
} from "@/lib/google-sheets";
import type { Contact } from "@/types";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Contact;

    const contacts = await getContacts();
    const existing = contacts.find((c) => c.id === id);
    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const updated = await updateContact({ ...body, rowIndex: existing.rowIndex });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contacts = await getContacts();
    const existing = contacts.find((c) => c.id === id);
    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    await deleteContact(existing);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
