import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { filePath } = await req.json() as { filePath: string };

    if (!filePath) {
      return NextResponse.json({ error: "filePath is required" }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `File not found: ${filePath}` },
        { status: 404 }
      );
    }

    await execAsync(`open "${filePath}"`);
    return NextResponse.json({ data: { opened: true } });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
