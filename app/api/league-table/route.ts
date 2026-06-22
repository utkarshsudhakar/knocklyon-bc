import { NextResponse } from "next/server";

// Strip HTML tags and decode common entities
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract rows from a <table> HTML string → string[][]
function parseTable(tableHtml: string): string[][] {
  const rows: string[][] = [];
  const rowRe = /<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<t[dh][\s\S]*?>([\s\S]*?)<\/t[dh]>/gi;

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(tableHtml)) !== null) {
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    const rowHtml = rowMatch[1];
    const localCellRe = new RegExp(cellRe.source, "gi");
    while ((cellMatch = localCellRe.exec(rowHtml)) !== null) {
      cells.push(text(cellMatch[1]));
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  // Safety: only proxy Tournament Software URLs
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("tournamentsoftware.com")) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 1800 }, // cache for 30 min
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 },
      );
    }

    const html = await res.text();

    // Find the standings table — identified by having Pts/W/L headers
    const tableRe = /<table[\s\S]*?<\/table>/gi;
    let match: RegExpExecArray | null;
    let standingsHtml: string | null = null;

    while ((match = tableRe.exec(html)) !== null) {
      const t = match[0];
      if (
        (t.includes(">W<") || t.includes(">W </") || t.includes(">W\n")) &&
        (t.includes(">L<") || t.includes(">L </") || t.includes(">L\n")) &&
        (t.includes(">Pts<") || t.includes(">Pts ") || t.includes("Pts\n"))
      ) {
        standingsHtml = t;
        break;
      }
    }

    // Fallback: grab the largest table on the page
    if (!standingsHtml) {
      let largest = "";
      const re2 = /<table[\s\S]*?<\/table>/gi;
      let m2: RegExpExecArray | null;
      while ((m2 = re2.exec(html)) !== null) {
        if (m2[0].length > largest.length) largest = m2[0];
      }
      standingsHtml = largest || null;
    }

    if (!standingsHtml) {
      return NextResponse.json({ error: "No table found on page" }, { status: 404 });
    }

    const rows = parseTable(standingsHtml);

    return NextResponse.json({ rows, source: url });
  } catch (err) {
    console.error("[league-table]", err);
    return NextResponse.json({ error: "Failed to fetch table" }, { status: 500 });
  }
}
