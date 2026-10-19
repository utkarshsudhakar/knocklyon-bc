import { readFile } from "node:fs/promises";
import path from "node:path";

export const HOME_DEFAULT_TIME = "20:00";
const AWAY_DEFAULT_TIME = "19:00";

export type ExportJson = {
  date: string;
  home_team: string;
  opponent: string;
  competition: "league" | "cup";
  venue: "Home" | "Away";
  location: string;
  map_link: string;
  result: string;
  notes: string;
};

export type ExportItem = {
  id: string;
  filename: string;
  json: ExportJson;
  hasLocation: boolean;
};

type ExportClub = {
  name: string;
  team_name: string | null;
  venue_location: string | null;
  venue_map_link: string | null;
  competition?: string | null;
};

export function slugify(s: string): string {
  return s
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Cup home ties only count once the opposing secretary has confirmed the date.
export function isExportable(
  f: {
    status: string;
    is_knocklyon_home: boolean;
    secretary_confirmed_at?: string | null;
  },
  club: { competition?: string | null } | undefined
): boolean {
  if (f.status !== "confirmed") return false;
  if (club?.competition === "cup" && f.is_knocklyon_home) {
    return Boolean(f.secretary_confirmed_at);
  }
  return true;
}

function dublinOffsetMinutes(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Dublin",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return Math.round((asUtc - utcMs) / 60000);
}

// Converts an Irish wall-clock date and time to a UTC ISO string, independent
// of the server's own timezone (Vercel runs in UTC).
export function irishLocalToUtcIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.slice(0, 5).split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let utc = guess - dublinOffsetMinutes(guess) * 60000;
  const corrected = guess - dublinOffsetMinutes(utc) * 60000;
  if (corrected !== utc) utc = corrected;
  return new Date(utc).toISOString();
}

export function buildExportItem(input: {
  fixtureId: string;
  isHome: boolean;
  matchTime: string | null;
  date: string | null;
  club: ExportClub | undefined;
  teamDisplayName: string;
}): ExportItem {
  const { club, isHome } = input;
  const isCupTie = club?.competition === "cup";
  const opponentLabel = club
    ? club.team_name
      ? `${club.name} ${club.team_name}`
      : club.name
    : "?";

  const time =
    input.matchTime ?? (isHome ? HOME_DEFAULT_TIME : AWAY_DEFAULT_TIME);
  const isoDate = input.date ? irishLocalToUtcIso(input.date, time) : "";

  const location = isHome
    ? process.env.KNOCKLYON_LOCATION ?? "Knocklyon Community Centre"
    : club?.venue_location ?? "";
  const mapLink = isHome
    ? process.env.KNOCKLYON_MAP_LINK ?? ""
    : club?.venue_map_link ?? "";

  const stem = club
    ? `${slugify(club.name)}-${slugify(club.team_name ?? "")}`.replace(
        /-+$/,
        ""
      )
    : "fixture";
  const filename = `${stem}${isCupTie ? "-CUP" : ""}-${isHome ? "H" : "A"}.json`;

  return {
    id: input.fixtureId,
    filename,
    hasLocation: Boolean(location),
    json: {
      date: isoDate,
      home_team: input.teamDisplayName,
      opponent: opponentLabel,
      competition: isCupTie ? "cup" : "league",
      venue: isHome ? "Home" : "Away",
      location,
      map_link: mapLink,
      result: "",
      notes: "",
    },
  };
}

export async function readCurrentSeasonFolder(): Promise<string | null> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "content", "settings", "site.json"),
      "utf-8"
    );
    const settings = JSON.parse(raw) as { current_season?: string };
    if (settings.current_season) {
      return settings.current_season.replace("/", "-");
    }
  } catch {
    // caller shows a warning when this is null
  }
  return null;
}

// new: no file yet. changed: file exists with a different date. live: file
// exists with the same date. clash: two fixtures would write the same file.
export type PublishStatus = "new" | "changed" | "live" | "clash";

export type PublishItem = ExportItem & {
  teamName: string;
  status: PublishStatus;
  previousDate: string | null;
  // File content to write: new items as exported, changed items are the
  // existing file with only the date replaced so results, notes and any
  // manual edits survive.
  output: Record<string, unknown>;
};

export async function classifyExports(
  items: Array<ExportItem & { teamName: string }>,
  folder: string
): Promise<PublishItem[]> {
  const counts = new Map<string, number>();
  for (const i of items) {
    counts.set(i.filename, (counts.get(i.filename) ?? 0) + 1);
  }

  const dir = path.join(process.cwd(), "content", "fixtures", folder);
  const out: PublishItem[] = [];

  for (const item of items) {
    const base = { ...item, previousDate: null as string | null };

    if ((counts.get(item.filename) ?? 0) > 1) {
      out.push({ ...base, status: "clash", output: { ...item.json } });
      continue;
    }

    let existing: Record<string, unknown> | null = null;
    let fileExists = true;
    try {
      const raw = await readFile(path.join(dir, item.filename), "utf-8");
      existing = JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") fileExists = false;
    }

    if (!fileExists) {
      out.push({ ...base, status: "new", output: { ...item.json } });
      continue;
    }

    const prev = typeof existing?.date === "string" ? existing.date : null;
    const same =
      prev !== null &&
      new Date(prev).getTime() === new Date(item.json.date).getTime();

    if (same) {
      out.push({ ...base, previousDate: prev, status: "live", output: existing! });
    } else {
      out.push({
        ...base,
        previousDate: prev,
        status: "changed",
        output: { ...(existing ?? item.json), date: item.json.date },
      });
    }
  }

  return out;
}
