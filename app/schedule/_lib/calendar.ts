// Calendar helpers: .ics generator + Google Calendar deep-link builder.
// Times are entered as Dublin local ("HH:MM" 24-hour). The .ics uses TZID
// with a minimal VTIMEZONE block for cross-client compatibility. The Google
// link needs UTC, so we convert Dublin -> UTC using the IANA timezone database
// (via Intl) so DST is handled correctly.

const DEFAULT_DURATION_MIN = 150; // 2h 30m — typical badminton team match

export type CalendarEvent = {
  uid: string;                     // globally-unique-ish id
  title: string;                   // "Knocklyon M1 vs ABC M1"
  date: string;                    // "2026-09-15"
  time: string;                    // "19:00" (Dublin local, 24h)
  durationMin?: number;            // default 150
  location?: string;               // "Knocklyon Community Centre"
  description?: string;            // freeform
};

/**
 * Return the UTC Date instant corresponding to the given Dublin-local date/time.
 * Handles DST via the IANA tz database.
 */
function toDublinUtc(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  const [h, mi] = timeStr.split(":").map((n) => parseInt(n, 10));

  // Anchor: pretend the local values ARE UTC.
  const naive = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));

  // What does that instant look like in Dublin?
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Dublin",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(naive)) parts[p.type] = p.value;

  // Rebuild that Dublin representation as if it were UTC, then diff.
  const dublinAsUtc = new Date(
    Date.UTC(
      parseInt(parts.year, 10),
      parseInt(parts.month, 10) - 1,
      parseInt(parts.day, 10),
      parseInt(parts.hour, 10),
      parseInt(parts.minute, 10),
      parseInt(parts.second, 10)
    )
  );

  // The offset Dublin was using at that instant:
  const offsetMs = naive.getTime() - dublinAsUtc.getTime();

  // Apply it in reverse to move naive back to the correct UTC.
  return new Date(naive.getTime() + offsetMs);
}

function toIcsLocal(dateStr: string, timeStr: string): string {
  // Dublin-local, expressed as ICS "floating" tied to TZID=Europe/Dublin:
  //   "20260915T190000"
  const [y, mo, d] = dateStr.split("-");
  const [h, mi] = timeStr.split(":");
  return `${y}${mo}${d}T${h}${mi}00`;
}

function toIcsUtcStamp(d: Date): string {
  // "20260902T120000Z"
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function addMinutesToLocal(
  dateStr: string,
  timeStr: string,
  mins: number
): { date: string; time: string } {
  // Add minutes in Dublin-local space by round-tripping through Date arithmetic.
  const [y, mo, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  const [h, mi] = timeStr.split(":").map((n) => parseInt(n, 10));
  // Work in UTC-agnostic "naive" values — pure arithmetic on the calendar,
  // no timezone involved (assumes no DST change during the match).
  const base = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
  const end = new Date(base.getTime() + mins * 60_000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    date: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`,
    time: `${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}`,
  };
}

function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Build a single .ics file containing all given events. Uses TZID=Europe/Dublin.
 * `now` is the DTSTAMP value (kept as a param so tests / callers stay pure).
 */
export function generateIcs(events: CalendarEvent[], now: Date): string {
  const stamp = toIcsUtcStamp(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Knocklyon Badminton Club//Fixture Scheduling//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    // Minimal VTIMEZONE for Europe/Dublin — most clients recognise this
    // without needing us to pre-compute every DST transition.
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Dublin",
    "BEGIN:STANDARD",
    "DTSTART:19701025T020000",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0000",
    "TZNAME:GMT",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700329T010000",
    "TZOFFSETFROM:+0000",
    "TZOFFSETTO:+0100",
    "TZNAME:IST",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
  ];

  for (const ev of events) {
    const dur = ev.durationMin ?? DEFAULT_DURATION_MIN;
    const end = addMinutesToLocal(ev.date, ev.time, dur);
    const dtStart = toIcsLocal(ev.date, ev.time);
    const dtEnd = toIcsLocal(end.date, end.time);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;TZID=Europe/Dublin:${dtStart}`);
    lines.push(`DTEND;TZID=Europe/Dublin:${dtEnd}`);
    lines.push(`SUMMARY:${icsEscape(ev.title)}`);
    if (ev.location) lines.push(`LOCATION:${icsEscape(ev.location)}`);
    if (ev.description)
      lines.push(`DESCRIPTION:${icsEscape(ev.description)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // RFC 5545 requires CRLF line endings.
  return lines.join("\r\n");
}

/**
 * Build a Google Calendar "Add event" URL. Times are converted from Dublin
 * local to UTC because the `dates` param expects UTC (…Z suffix) OR a naive
 * form + a `ctz` param. Using UTC keeps things simple.
 */
export function googleCalendarLink(ev: CalendarEvent): string {
  const dur = ev.durationMin ?? DEFAULT_DURATION_MIN;
  const start = toDublinUtc(ev.date, ev.time);
  const end = new Date(start.getTime() + dur * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${toIcsUtcStamp(start)}/${toIcsUtcStamp(end)}`,
    ctz: "Europe/Dublin",
  });
  if (ev.description) params.set("details", ev.description);
  if (ev.location) params.set("location", ev.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
