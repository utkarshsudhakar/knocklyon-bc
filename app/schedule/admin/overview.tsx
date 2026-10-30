import Link from "next/link";
import { getSupabase } from "../_lib/supabase";
import { MIN_GAP_DAYS, daysBetween } from "../_lib/gap";
import SubmitButton from "../_lib/submit-button";
import { sendReminderNow } from "./actions";
import {
  dublinToday,
  dueReminders,
  loadReminderCandidates,
  type ReminderCandidate,
} from "../_lib/reminders";

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

function StatusCell({
  cell,
  reminder,
  today,
}: {
  cell: Cell | null;
  reminder?: ReminderCandidate;
  today: string;
}) {
  if (!cell) return <span className="text-zinc-400">&ndash;</span>;
  const upcoming = reminder && reminder.date >= today ? reminder : undefined;
  const reminded = upcoming && upcoming.sentFor === upcoming.date;
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
      {upcoming && (
        <div className="ml-3.5 mt-1 flex flex-wrap items-center gap-2">
          {reminded && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-800">
              Reminder sent
            </span>
          )}
          <form action={sendReminderNow}>
            <input type="hidden" name="fixture_id" value={upcoming.fixtureId} />
            <SubmitButton
              className="text-xs text-forest hover:underline"
              pendingLabel="Sending…"
              confirmMessage={`Send a reminder email to ${upcoming.to}${upcoming.cc ? ` (cc ${upcoming.cc})` : ""} now?`}
            >
              {reminded ? "Resend reminder" : "Send reminder now"}
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}

export default async function Overview({ teams, show, query }: Props) {
  const supabase = getSupabase();
  const [{ data: clubData }, { data: fixtureData }, { data: conflictData }] = await Promise.all([
    supabase
      .from("clubs")
      .select(
        "id, name, team_name, secretary_email, knocklyon_team_id, invite_sent_at, competition"
      )
      .order("name"),
    supabase.from("fixtures").select("*"),
    supabase.from("team_conflicts").select("team_a, team_b"),
  ]);
  const clubs = (clubData ?? []) as ClubRow[];
  const fixtures = (fixtureData ?? []) as FixtureRow[];

  const today = dublinToday();
  let reminderCandidates: ReminderCandidate[] = [];
  try {
    reminderCandidates = await loadReminderCandidates();
  } catch (err) {
    console.error("[Overview] reminders unavailable (has schema-reminders.sql been run?):", err);
  }
  const reminderByFixture = new Map(reminderCandidates.map((c) => [c.fixtureId, c]));
  const dueNow = dueReminders(reminderCandidates, today);

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

  type Played = {
    fixtureId: string;
    teamId: string;
    date: string;
    home: boolean;
    opponent: string;
  };
  const played: Played[] = [];
  for (const f of fixtures) {
    const club = clubs.find((c) => c.id === f.opponent_club_id);
    if (!club?.knocklyon_team_id || f.status !== "confirmed") continue;
    if (club.competition === "cup" && f.is_knocklyon_home && !f.secretary_confirmed_at) continue;
    const date = dateOf(f);
    if (!date) continue;
    played.push({
      fixtureId: f.id,
      teamId: club.knocklyon_team_id,
      date,
      home: f.is_knocklyon_home,
      opponent: club.team_name ? `${club.name} ${club.team_name}` : club.name,
    });
  }
  const linkedPairs = new Set(
    ((conflictData ?? []) as { team_a: string; team_b: string }[]).map(
      (r) => `${r.team_a}|${r.team_b}`
    )
  );
  const clashes: { a: Played; b: Played; gap: number; linked: boolean }[] = [];
  for (let i = 0; i < played.length; i++) {
    for (let j = i + 1; j < played.length; j++) {
      const a = played[i];
      const b = played[j];
      const linked = a.teamId !== b.teamId;
      if (linked && !linkedPairs.has(`${a.teamId}|${b.teamId}`)) continue;
      const gap = daysBetween(a.date, b.date);
      if (gap >= MIN_GAP_DAYS) continue;
      clashes.push(a.date <= b.date ? { a, b, gap, linked } : { a: b, b: a, gap, linked });
    }
  }
  clashes.sort((x, y) => x.gap - y.gap || x.a.date.localeCompare(y.a.date));
  type ClashGroup = {
    key: string;
    teamIds: string[];
    clashCount: number;
    runs: { entries: Played[]; gaps: number[] }[];
  };
  const groupMap = new Map<string, { teamIds: string[]; clashCount: number; entries: Map<string, Played> }>();
  for (const c of clashes) {
    const teamIds = [...new Set([c.a.teamId, c.b.teamId])].sort();
    const key = teamIds.join("+");
    const g = groupMap.get(key) ?? { teamIds, clashCount: 0, entries: new Map() };
    g.clashCount += 1;
    g.entries.set(c.a.fixtureId, c.a);
    g.entries.set(c.b.fixtureId, c.b);
    groupMap.set(key, g);
  }
  const clashGroups: ClashGroup[] = [...groupMap.entries()]
    .map(([key, g]) => {
      const sorted = [...g.entries.values()].sort((x, y) => x.date.localeCompare(y.date));
      const runs: ClashGroup["runs"] = [];
      for (const m of sorted) {
        const run = runs[runs.length - 1];
        const prev = run?.entries[run.entries.length - 1];
        const gap = prev ? daysBetween(prev.date, m.date) : null;
        if (run && gap !== null && gap < MIN_GAP_DAYS) {
          run.entries.push(m);
          run.gaps.push(gap);
        } else {
          runs.push({ entries: [m], gaps: [] });
        }
      }
      return { key, teamIds: g.teamIds, clashCount: g.clashCount, runs };
    })
    .sort((x, y) => y.clashCount - x.clashCount);

  type Matchup = {
    club: ClubRow;
    home: Cell | null;
    away: Cell | null;
    homeFixtureId?: string;
    awayFixtureId?: string;
    pending: number;
    total: number;
  };
  const matchups: Matchup[] = clubs.map((club) => {
    const own = fixtures.filter((f) => f.opponent_club_id === club.id);
    const homeFixture = own.find((f) => f.is_knocklyon_home);
    const awayFixture = own.find((f) => !f.is_knocklyon_home);
    const home = fixtureCell(homeFixture, club, dateOf);
    const away = fixtureCell(awayFixture, club, dateOf);
    const cells = [home, away].filter((c): c is Cell => c !== null);
    return {
      club,
      home,
      away,
      homeFixtureId: homeFixture?.id,
      awayFixtureId: awayFixture?.id,
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
      <details className="group rounded-xl border border-sky-200 bg-sky-50">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div>
            <span className="text-sm font-semibold text-sky-900">
              Match reminders due ({dueNow.length})
            </span>
            <span className="ml-2 text-xs text-sky-800">
              Sent automatically at 3pm for matches 1&ndash;2 days away. This is what a run right now would send.
            </span>
          </div>
          <span className="text-xs text-sky-800 group-open:hidden">Expand</span>
          <span className="hidden text-xs text-sky-800 group-open:inline">Collapse</span>
        </summary>
        <div className="px-4 pb-4 text-sm text-zinc-700">
          {dueNow.length === 0 ? (
            <p className="italic text-zinc-500">No reminders due.</p>
          ) : (
            <ul className="space-y-1">
              {dueNow.map((c) => (
                <li key={c.fixtureId}>
                  <strong>{formatDay(c.date, c.time)}</strong> &middot; {c.isHome ? "Home" : "Away"} vs {c.opponent}
                  {" "}&rarr; {c.to}
                  {c.cc ? ` (cc ${c.cc})` : <span className="text-amber-700"> (no captain email to cc)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      {clashes.length > 0 && (
        <details className="group rounded-xl border border-amber-300 bg-amber-50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <div>
              <span className="text-sm font-semibold text-amber-900">
                Back-to-back matches ({clashes.length})
              </span>
              <span className="ml-2 text-xs text-amber-800">
                Confirmed matches less than {MIN_GAP_DAYS} days apart for the
                same team or teams sharing players.
              </span>
            </div>
            <span className="text-xs text-amber-800 group-open:hidden">Expand</span>
            <span className="hidden text-xs text-amber-800 group-open:inline">Collapse</span>
          </summary>
          <div className="space-y-3 px-4 pb-4">
            {clashGroups.map((g) => {
              const names = g.teamIds.map((id) => teamName.get(id) ?? "?");
              return (
                <div key={g.key} className="rounded-lg border border-zinc-200 bg-white p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-zinc-900">{names.join(" + ")}</span>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                      {g.clashCount} clash{g.clashCount === 1 ? "" : "es"}
                    </span>
                    {g.teamIds.length > 1 && (
                      <span className="text-xs text-zinc-500">These teams share players</span>
                    )}
                    <span className="ml-auto flex gap-3 text-xs">
                      {g.teamIds.map((id) => (
                        <Link key={id} href={`/schedule/admin?team=${id}`} className="text-forest hover:underline">
                          Open {teamName.get(id)} &rarr;
                        </Link>
                      ))}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {g.runs.map((run, ri) => (
                      <div key={ri} className="flex flex-wrap items-stretch gap-y-2">
                        {run.entries.map((m, mi) => (
                          <div key={m.fixtureId} className="flex items-center">
                            {mi > 0 && (
                              <div className="flex items-center px-1">
                                <span className="w-3 border-t-2 border-dashed border-zinc-300" />
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${
                                    run.gaps[mi - 1] <= 1
                                      ? "bg-red-100 text-red-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {run.gaps[mi - 1] === 0
                                    ? "same day"
                                    : `${run.gaps[mi - 1]} day${run.gaps[mi - 1] === 1 ? "" : "s"}`}
                                </span>
                                <span className="w-3 border-t-2 border-dashed border-zinc-300" />
                              </div>
                            )}
                            <div className="min-w-[180px] rounded-lg border border-zinc-200 px-3 py-2">
                              <div className="text-sm font-bold text-zinc-900">
                                {formatDay(m.date, null)}
                                {g.teamIds.length > 1 && (
                                  <span className="ml-1 font-normal text-zinc-500">
                                    &middot; {teamName.get(m.teamId)}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-zinc-700">
                                <span
                                  className={`mr-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                    m.home ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {m.home ? "Home" : "Away"}
                                </span>
                                {m.opponent}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}

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
                    <td className="px-4 py-3">
                      <StatusCell cell={m.home} today={today} reminder={m.homeFixtureId ? reminderByFixture.get(m.homeFixtureId) : undefined} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusCell cell={m.away} today={today} reminder={m.awayFixtureId ? reminderByFixture.get(m.awayFixtureId) : undefined} />
                    </td>
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
