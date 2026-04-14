import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const RESUME_FILENAME = "CHAUHAN_ISHANI_RESUME.docx";
const PDF_FILENAME = "CHAUHAN_ISHANI_RESUME.pdf";

function expandHome(p: string): string {
  if (p.startsWith("~/")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

// Derive ~/OneDrive/Resumes/ from the existing RESUMES_PATH env (same OneDrive root)
function getOutputBase(): string {
  const resumesPath = process.env.RESUMES_PATH;
  if (resumesPath) {
    return path.join(path.dirname(resumesPath), "Resumes");
  }
  return path.join(os.homedir(), "OneDrive", "Resumes");
}

interface AcceptedBullet {
  section: string;
  action: string;
  original: string;
  editedValue: string;
}

export async function POST(req: NextRequest) {
  try {
    const { companyName, acceptedBullets, overwrite } =
      (await req.json()) as {
        companyName: string;
        acceptedBullets: AcceptedBullet[];
        overwrite?: boolean;
      };

    if (!companyName) {
      return NextResponse.json(
        { error: "companyName is required" },
        { status: 400 }
      );
    }

    // ── Resolve template path ──────────────────────────────────────────────
    const templateEnv = process.env.RESUME_TEMPLATE_PATH;
    if (!templateEnv) {
      return NextResponse.json(
        { error: "RESUME_TEMPLATE_PATH not set in .env.local" },
        { status: 500 }
      );
    }
    const templatePath = expandHome(templateEnv);
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Master template not found: ${templatePath}` },
        { status: 404 }
      );
    }

    // ── Resolve output paths ───────────────────────────────────────────────
    const outputDir = path.join(getOutputBase(), companyName);
    const docxPath = path.join(outputDir, RESUME_FILENAME);
    const pdfPath = path.join(outputDir, PDF_FILENAME);

    const alreadyExisted = fs.existsSync(outputDir);
    if (alreadyExisted && !overwrite) {
      return NextResponse.json({
        data: {
          alreadyExisted: true,
          docxPath,
          pdfPath: null,
          companyFolder: companyName,
        },
      });
    }

    fs.mkdirSync(outputDir, { recursive: true });

    // ── Write edits to temp JSON ───────────────────────────────────────────
    const tmpJson = path.join(
      os.tmpdir(),
      `resume_edits_${Date.now()}.json`
    );
    fs.writeFileSync(tmpJson, JSON.stringify(acceptedBullets ?? []));

    // ── Apply edits via Python script ──────────────────────────────────────
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "apply_resume_edits.py"
    );
    if (!fs.existsSync(scriptPath)) {
      fs.unlinkSync(tmpJson);
      return NextResponse.json(
        { error: `Python script not found: ${scriptPath}` },
        { status: 500 }
      );
    }

    try {
      await execAsync(
        `python3 "${scriptPath}" "${templatePath}" "${docxPath}" "${tmpJson}"`
      );
    } catch (pyErr) {
      const msg = pyErr instanceof Error ? pyErr.message : String(pyErr);
      return NextResponse.json(
        { error: `python-docx failed: ${msg}` },
        { status: 500 }
      );
    } finally {
      try { fs.unlinkSync(tmpJson); } catch { /* ignore */ }
    }

    // ── PDF via LibreOffice ────────────────────────────────────────────────
    let pdfGenerated = false;
    let libreofficeMessage: string | null = null;
    try {
      await execAsync(
        `soffice --headless --convert-to pdf --outdir "${outputDir}" "${docxPath}"`,
        { timeout: 60_000 }
      );
      pdfGenerated = fs.existsSync(pdfPath);
    } catch {
      libreofficeMessage =
        "Install LibreOffice for PDF export: brew install libreoffice";
    }

    return NextResponse.json({
      data: {
        alreadyExisted: false,
        docxPath,
        pdfPath: pdfGenerated ? pdfPath : null,
        companyFolder: companyName,
        libreofficeMessage,
      },
    });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      { error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
