import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

// Only serve files within expected output directories to limit filesystem exposure
function isAllowedPath(filePath: string): boolean {
  const home = os.homedir();
  const allowed = [
    path.join(home, "Library", "CloudStorage"), // OneDrive on macOS
    path.join(home, "OneDrive"),
    os.tmpdir(),
  ];
  return allowed.some((dir) => filePath.startsWith(dir));
}

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");

  if (!filePath) {
    return new NextResponse("Missing path parameter", { status: 400 });
  }

  const resolved = path.resolve(filePath);

  if (!isAllowedPath(resolved)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!fs.existsSync(resolved)) {
    return new NextResponse("File not found", { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType =
    ext === ".pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const content = fs.readFileSync(resolved);
  const filename = path.basename(resolved);

  return new NextResponse(content, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(content.length),
    },
  });
}
