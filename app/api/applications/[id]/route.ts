import { NextRequest, NextResponse } from "next/server";
import {
  getApplications,
  updateApplication,
  deleteApplication,
} from "@/lib/google-sheets";
import type { Application } from "@/types";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Application;

    // Find rowIndex from the sheet
    const apps = await getApplications();
    const existing = apps.find((a) => a.id === id);
    if (!existing) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const updated = await updateApplication({ ...body, rowIndex: existing.rowIndex });
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
    const apps = await getApplications();
    const existing = apps.find((a) => a.id === id);
    if (!existing) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    await deleteApplication(existing);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
