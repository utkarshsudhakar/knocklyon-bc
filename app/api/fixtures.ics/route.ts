import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Reads fixture JSON files directly — no Tina server required, works at build-time too.
function readFixtures() {
  const dir = path.join(process.cwd(), "content", "fixtures");
  const results: any[] = [];

  function walk(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".json")) {
        try {
          const raw = JSON.parse(fs.readFileSync(full, "utf8"));
          // Use the filename (without extension) as a stable UID
          results.push({ ...raw, _uid: entry.name.replace(/\.json$/, "") });
        } catch {
          // skip malformed files
        }
      }
    }
  }

  walk(dir);
  return results;
}

// Format a JS Date to iCal DATE-TIME (UTC): 20260915T193000Z
function icalDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Fold long iCal lines at 75 chars (RFC 5545)
function fold(line: string): string {
  if (line.length <= 75) return line;
  let out = "";
  while (line.length > 75) {
    out += line.slice(0, 75) + "\r\n ";
    line = line.slice(75);
  }
  return out + line;
}

// Escape iCal text values
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamFilter = searchParams.get("team");

  const all = readFixtures();
  const fixtures = teamFilter
    ? all.filter((f) => f.home_team === teamFilter)
    : all;

  const eventLines = fixtures
    .filter((f) => f.date)
    .map((f) => {
      const start = new Date(f.date);
      const end = new Date(start.getTime() + 90 * 60 * 1000); // default 90-min duration
      const summary = `${f.home_team ?? "KBC"} vs ${f.opponent ?? "TBD"}`;
      const description = [
        f.venue ? `${f.venue} fixture` : "",
        f.result ? `Result: ${f.result}` : "",
        f.map_link ? `Directions: ${f.map_link}` : "",
      ]
        .filter(Boolean)
        .join("\\n");

      const lines = [
        "BEGIN:VEVENT",
        fold(`UID:${f._uid}@knocklyonbc.ie`),
        fold(`DTSTART:${icalDate(start)}`),
        fold(`DTEND:${icalDate(end)}`),
        fold(`SUMMARY:${esc(summary)}`),
        description ? fold(`DESCRIPTION:${description}`) : "",
        // LOCATION: venue name — calendar apps show this as the event location
        f.location ? fold(`LOCATION:${esc(f.location)}`) : "",
        // URL: map link — Apple Calendar & Google Calendar surface this as a tappable link
        f.map_link ? fold(`URL:${f.map_link}`) : "",
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n");

      return lines;
    })
    .join("\r\n");

  const cal = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Knocklyon Badminton Club//Fixtures//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${teamFilter ? `KBC ${teamFilter} Fixtures` : "Knocklyon BC Fixtures"}`,
    `X-WR-CALDESC:${teamFilter ? `${teamFilter} fixtures` : "All fixtures"} for Knocklyon Badminton Club`,
    "X-WR-TIMEZONE:Europe/Dublin",
    eventLines,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(cal, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="knocklyon-bc-fixtures.ics"',
      "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600",
    },
  });
}
