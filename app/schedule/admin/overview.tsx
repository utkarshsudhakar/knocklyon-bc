import Link from "next/link";
import { getSupabase } from "../_lib/supabase";

type Props = {
  teams: { id: string; name: string }[];
  show: "all" | "attention";
  query: string;
};

type ClubRow = {
  id: string;
  name: string;
  team_name: string | null;
  secretary_email: string;
  knocklyon_team_id: string | null;
  invite_sent_at: string | null;
  competition: string | null;
};
type FixtureRow = {
  id: string;
  opponent_club_id: string;
  is_knocklyon_home: boolean;
  status: string;
  confirmed_slot_id: string | null;
  confirmed_date: string | null;
  match_time: string | null;
  proposed_dates: unknown;
  secretary_confirmed_at: string | null;
};

type Tone = "ok" | "warn" | "bad";
type Cell = { tone: Tone; label: string; detail?: string; done: boolean };

const TONE_CLASS: Record<Tone, string> = {
  ok: "text-green-700",
  warn: "text-amber-700",
  bad: "text-red-700",
};
const DOT_CLASS: Record<Tone, string> = {
  ok: "bg-green-600",
  warn: "bg-amber-500",
  bad: "bg-red-600",
};

function formatDay(date: string, time: string | null): string {
  const d = new Date(`${date}T12:00:00`);
  const day = d.toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return time ? `${day}, ${time.slice(0, 5)}` : day;
}

function relative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return "today";
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function fixtureCell(
  f: FixtureRow | undefined,
  club: ClubRow,
  dateOf: (f: FixtureRow) => string | null
): Cell | null {
  if (!f) return null;
  const isCupHome = club.competition === "cup" && f.is_knocklyon_home;
  if (f.status === "confirmed") {
    const date = dateOf(f);
    const detail = date ? formatDay(date, f.match_time) : undefined;
    if (isCupHome && !f.secretary_confirmed_at) {
      return { tone: "warn", label: "Awaiting secretary", detail, done: false };
    }
    return { tone: "ok", label: "Confirmed", detail, done: true };
  }
  const proposed = Array.isArray(f.proposed_dates) ? f.proposed_dates.length : 0;
  if (proposed > 0) {
    return {
      tone: "warn",
      label: "Proposed",
      detail: `${proposed} date${proposed === 1 ? "" : "s"} offered`,
      done: false,
    };
  }
  return {
    tone: "bad",
    label: "Awaiting date",
    detail: club.invite_sent_at
      ? `invited ${relative(club.invite_sent_at)}`
      : "not invited",
    done: false,
  };
}

function StatusCell({ cell }: { cell: Cell | null }) {
  if (!cell) return <span className="text-zinc-400">&ndash;</span>;
  return (
    <div>
      <span
        className={`inline-flex items-center gap-1.5 text-sm font-semibold ${TONE_CLASS[cell.tone]}`}
      >
        <span className={`h-2 w-2 rounded-full ${DOT_CLASS[cell.tone]}`} />
        {cell.label}
      </span>
      {cell.detail && (
        <div className="ml-3.5 text-xs text-zinc-500">{cell.detail}</div>
      )}
    </div>
  );
}

export default async function Overview({ teams, show, query }: Props) {
  const supabase = getSupabase();
  const [{ data: clubData }, { data: fixtureData }] = await Promise.all([
    supabase
      .from("clubs")
      .select(
        "id, name, team_name, secretary_email, knocklyon_team_id, invite_sent_at, competition"
      )
      .order("name"),
    supabase.from("fixtures").select("*"),
  ]);
  const clubs = (clubData ?? []) as ClubRow[];
  const fixtures = (fixtureData ?? []) as FixtureRow[];

  const slotIds = [
    ...new Set(
      fixtures
        .map((f) => f.confirmed_slot_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const slotDate = new Map<string, string>();
  if (slotIds.length > 0) {
    const { data: slots } = await supabase
      .from("home_slots")
      .select("id, slot_date")
      .in("id", slotIds);
    for (const s of (slots ?? []) as { id: string; slot_date: string }[]) {
      slotDate.set(s.id, s.slot_date);
    }
  }
  const dateOf = (f: FixtureRow) =>
    f.is_knocklyon_home
      ? f.confirmed_slot_id
        ? (slotDate.get(f.confirmed_slot_id) ?? null)
        : null
      : f.confirmed_date;

  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  type Matchup = {
    club: ClubRow;
    home: Cell | null;
    away: Cell | null;
    pending: number;
    total: number;
  };
  const matchups: Matchup[] = clubs.map((club) => {
    const own = fixtures.filter((f) => f.opponent_club_id === club.id);
    const home = fixtureCell(own.find((f) => f.is_knocklyon_home), club, dateOf);
    const away = fixtureCell(own.find((f) => !f.is_knocklyon_home), club, dateOf);
    const cells = [home, away].filter((c): c is Cell => c !== null);
    return {
      club,
      home,
      away,
      total: cells.length,
      pending: cells.filter((c) => !c.done).length,
    };
  });

  const totalMatches = matchups.reduce((n, m) => n + m.total, 0);
  const totalPending = matchups.reduce((n, m) => n + m.pending, 0);

  const groups = new Map<string, Matchup[]>();
  for (const m of matchups) {
    const key = m.club.name.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const q = query.trim().toLowerCase();
  const visible = [...groups.values()]
    .map((rows) => ({
      name: rows[0].club.name,
      rows: rows.sort((a, b) => b.pending - a.pending),
      pending: rows.reduce((n, r) => n + r.pending, 0),
      confirmed: rows.reduce((n, r) => n + (r.total - r.pending), 0),
    }))
    .filter((g) => !q || g.name.toLowerCase().includes(q))
    .filter((g) => show === "all" || g.pending > 0)
    .sort((a, b) => (b.pending > 0 ? 1 : 0) - (a.pending > 0 ? 1 : 0) || a.name.localeCompare(b.name));
  const attentionCount = [...groups.values()].filter((rows) =>
    rows.some((r) => r.pending > 0)
  ).length;

  const seg = (active: boolean) =>
    `px-3 py-1.5 text-sm ${active ? "bg-forest text-white" : "bg-white text-zinc-700 hover:bg-zinc-50"}`;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Overview</h2>
          <p className="text-sm text-zinc-500">
            {totalMatches - totalPending} of {totalMatches} matches scheduled
            &middot; {totalPending} pending
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-zinc-200">
            <Link
              href={`/schedule/admin?show=attention${q ? `&q=${encodeURIComponent(query)}` : ""}`}
              className={seg(show === "attention")}
            >
              Needs attention ({attentionCount})
            </Link>
            <Link
              href={`/schedule/admin?show=all${q ? `&q=${encodeURIComponent(query)}` : ""}`}
              className={seg(show === "all")}
            >
              All
            </Link>
          </div>
          <form method="get" action="/schedule/admin" className="flex gap-2">
            <input type="hidden" name="show" value={show} />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search club…"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
          </form>
        </div>
      </div>

      {visible.length === 0 && (
        <p className="text-sm italic text-zinc-500">
          {show === "attention" && !q
            ? "Nothing needs attention. Every match has a confirmed date."
            : "No clubs match."}
        </p>
      )}

      {visible.map((g) => (
        <details
          key={g.name}
          open={g.pending > 0}
          className="group overflow-hidden rounded-xl border border-zinc-200 bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-green-50/60 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-zinc-900">{g.name}</span>
              {g.pending > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                  {g.pending} pending
                </span>
              )}
              {g.confirmed > 0 && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                  {g.pending === 0 ? "All confirmed" : `${g.confirmed} confirmed`}
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500 group-open:hidden">Expand</span>
            <span className="hidden text-xs text-zinc-500 group-open:inline">Collapse</span>
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-2 font-medium">Their team</th>
                  <th className="px-4 py-2 font-medium">Our team</th>
                  <th className="px-4 py-2 font-medium">Home (at ours)</th>
                  <th className="px-4 py-2 font-medium">Away (at theirs)</th>
                  <th className="px-4 py-2 font-medium">Secretary</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {g.rows.map((m) => (
                  <tr
                    key={m.club.id}
                    className={`border-t border-zinc-100 align-top ${m.pending === 0 ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      {m.club.team_name ?? <span className="text-zinc-400">&ndash;</span>}
                      {m.club.competition === "cup" && (
                        <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-800">
                          Cup
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(m.club.knocklyon_team_id && teamName.get(m.club.knocklyon_team_id)) || "?"}
                    </td>
                    <td className="px-4 py-3"><StatusCell cell={m.home} /></td>
                    <td className="px-4 py-3"><StatusCell cell={m.away} /></td>
                    <td className="px-4 py-3 text-zinc-700">{m.club.secretary_email}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {m.club.knocklyon_team_id && (
                        <Link
                          href={`/schedule/admin?team=${m.club.knocklyon_team_id}`}
                          className="text-xs text-forest hover:underline"
                        >
                          Open tab &rarr;
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </section>
  );
}
