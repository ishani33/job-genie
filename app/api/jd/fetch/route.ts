import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch a job description URL and extract plain text.
 * Strips HTML tags, collapses whitespace, returns readable text.
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json() as { url: string };

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (${res.status})` },
        { status: 422 }
      );
    }

    const html = await res.text();

    // Strip script/style blocks first
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<head[\s\S]*?<\/head>/gi, " ");

    // Convert common block elements to newlines
    text = text
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(p|div|h[1-6]|li|tr|section|article)[^>]*>/gi, "\n");

    // Strip all remaining tags
    text = text.replace(/<[^>]+>/g, " ");

    // Decode common HTML entities
    text = text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");

    // Collapse whitespace
    text = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join("\n");

    // Deduplicate consecutive blank lines
    text = text.replace(/\n{3,}/g, "\n\n");

    // Limit to 12,000 chars to keep token usage reasonable
    if (text.length > 12_000) {
      text = text.slice(0, 12_000) + "\n\n[...truncated]";
    }

    return NextResponse.json({ data: { text } });
  } catch (error) {
    console.error(error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
