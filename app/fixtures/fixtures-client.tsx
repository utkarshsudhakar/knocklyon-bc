"use client";

import { useEffect, useState } from "react";
import { useTina } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import PageHero from "../components/page-hero";

type TeamEntry = { name: string; league?: string | null; table_link?: string | null };
type SeasonMeta = { name: string; teams: TeamEntry[] };
type Props = {
  data: any;
  query: string;
  variables: object;
  currentSeason?: string | null;
  seasonTeams?: Record<string, TeamEntry[]>;
  seasonFolderMap?: Record<string, SeasonMeta>; // folder slug → season info
};

// ─── League table viewer ─────────────────────────────────────────────────────

function LeagueTablesSection({ tables }: { tables: TeamEntry[] }) {
  const [active, setActive] = useState<LeagueTable | null>(null);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open(t: LeagueTable) {
    if (active?.name === t.name) { setActive(null); setRows(null); return; }
    setActive(t);
    setRows(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/league-table?url=${encodeURIComponent(t.table_link!)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setRows(json.rows);
    } catch (e: any) {
      setError(e.message ?? "Could not load table");
    } finally {
      setLoading(false);
    }
  }

  // Detect header row (first row with mostly short values like W, L, Pts)
  const header = rows?.[0] ?? [];
  const body = rows?.slice(1) ?? [];

  return (
    <section className="border-t border-stone-200 bg-green-50">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-forest-mid">
            Leinster Badminton
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-stone-900">League Tables</h2>
          <p className="mt-1 text-sm text-stone-500">
            Click a team to view their standings.
          </p>
        </div>

        {/* Team selector buttons */}
        <div className="flex flex-wrap gap-2">
          {tables.map((t) => (
            <button
              key={t.name}
              onClick={() => open(t)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                active?.name === t.name
                  ? "border-forest bg-forest text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:border-forest hover:text-forest"
              }`}
            >
              {t.name}
              {t.league ? ` — ${t.league}` : ""}
            </button>
          ))}
        </div>

        {/* Table viewer */}
        {active && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5">
              <div>
                <span className="font-bold text-stone-900">{active.name}</span>
                {active.league && (
                  <span className="ml-2 text-sm text-stone-500">{active.league}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={active.table_link!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-stone-400 hover:text-forest hover:underline"
                >
                  Open on Tournament Software ↗
                </a>
                <button
                  onClick={() => { setActive(null); setRows(null); }}
                  className="grid h-7 w-7 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  aria-label="Close"
                >✕</button>
              </div>
            </div>

            {/* Content */}
            {loading && (
              <div className="flex items-center justify-center py-12 text-sm text-stone-400">
                Loading table…
              </div>
            )}
            {error && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-stone-500">{error}</p>
                <a
                  href={active.table_link!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-semibold text-forest hover:underline"
                >
                  View on Tournament Software →
                </a>
              </div>
            )}
            {rows && rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  {header.length > 0 && (
                    <thead>
                      <tr className="bg-forest text-white">
                        {header.map((h, i) => (
                          <th
                            key={i}
                            className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${i === 0 ? "text-left" : "text-center"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-stone-100">
                    {body.map((row, ri) => (
                      <tr key={ri} className="hover:bg-green-50 transition-colors">
                        {row.map((cell, ci) => {
                          const col = header[ci]?.trim().toUpperCase();
                          const isHistory = col === "HISTORY";
                          return (
                            <td
                              key={ci}
                              className={`px-4 py-3 whitespace-nowrap ${
                                ci === 0
                                  ? "font-semibold text-stone-900 text-left"
                                  : "text-center text-stone-600"
                              }`}
                            >
                              {isHistory ? (
                                <span className="inline-flex gap-1">
                                  {cell.split("").map((ch, i) => {
                                    if (ch === "W")
                                      return (
                                        <span key={i} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-forest text-[10px] font-bold text-white">
                                          W
                                        </span>
                                      );
                                    if (ch === "L")
                                      return (
                                        <span key={i} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                          L
                                        </span>
                                      );
                                    return <span key={i}>{ch}</span>;
                                  })}
                                </span>
                              ) : (
                                cell
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

type Fixture = {
  id: string;
  date: string;
  home_team?: string | null;
  opponent: string;
  venue: string;
  location?: string | null;
  map_link?: string | null;
  result?: string | null;
  notes?: any;
  _sys?: { filename?: string; relativePath?: string };
};

// Get the display season name for a fixture using the folder→season map.
// Falls back to converting the folder name if the map doesn't have an entry.
function fixtureSeasonName(
  fixture: Fixture,
  folderMap: Record<string, SeasonMeta>,
): string {
  const rel = fixture._sys?.relativePath ?? "";
  const folder = rel.split("/")[0];
  if (!folder) return "Unknown";
  return folderMap[folder]?.name ?? folder.replace("-", "/");
}

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString("en-IE", { weekday: "short" }),
    day: d.toLocaleDateString("en-IE", { day: "2-digit" }),
    month: d.toLocaleDateString("en-IE", { month: "short" }),
    time: d.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false }),
    date: d,
  };
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// ─── subscribe bar ───────────────────────────────────────────────────────────

function SubscribeBar({ team }: { team: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const icsPath = team === "all"
    ? "/api/fixtures.ics"
    : `/api/fixtures.ics?team=${encodeURIComponent(team)}`;

  const webcalUrl = origin ? origin.replace(/^https?/, "webcal") + icsPath : "";
  const googleUrl = origin
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`
    : "";

  async function copySubscribeLink() {
    if (!webcalUrl) return;
    await navigator.clipboard.writeText(webcalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-green-50 px-4 py-3">
      <span className="text-xs font-semibold text-stone-500 mr-1">
        Sync {team === "all" ? "all fixtures" : `${team} fixtures`}:
      </span>

      {/* Download .ics */}
      <a
        href={icsPath}
        download="knocklyon-bc-fixtures.ics"
        className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-forest hover:text-forest"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M7.25 10.44V2.75a.75.75 0 0 1 1.5 0v7.69l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72Z"/>
          <path d="M2 12.75a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"/>
        </svg>
        Download .ics
      </a>

      {/* Subscribe / webcal */}
      <button
        onClick={copySubscribeLink}
        disabled={!origin}
        className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-forest hover:text-forest disabled:opacity-40"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25Zm-4.69 9.64a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 0 1-2.83 0Z"/>
        </svg>
        {copied ? "Copied!" : "Copy subscribe link"}
      </button>

      {/* Google Calendar */}
      {googleUrl && (
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-forest hover:text-forest"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="5" y1="1" x2="5" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="11" y1="1" x2="11" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="1" y1="6.5" x2="15" y2="6.5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          Add to Google Calendar
        </a>
      )}

      <span className="text-[10px] text-stone-400 ml-auto hidden sm:block">
        Stays up to date automatically when you subscribe
      </span>
    </div>
  );
}

// ─── list view ───────────────────────────────────────────────────────────────

function FixtureRow({ fixture, past }: { fixture: Fixture; past: boolean }) {
  const dt = fmt(fixture.date);
  const home = fixture.home_team ?? "KBC";

  return (
    <div className="group flex items-stretch overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:border-green-300 hover:shadow-md">
      <div className={`flex w-20 shrink-0 flex-col items-center justify-center py-4 text-center ${past ? "bg-stone-100" : "bg-forest"}`}>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${past ? "text-stone-400" : "text-green-200"}`}>{dt.weekday}</span>
        <span className={`text-2xl font-extrabold leading-none ${past ? "text-stone-600" : "text-white"}`}>{dt.day}</span>
        <span className={`text-[11px] font-semibold uppercase ${past ? "text-stone-400" : "text-green-200"}`}>{dt.month}</span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1.5 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${fixture.venue === "Home" ? "bg-green-100 text-forest" : "bg-amber-100 text-amber-800"}`}>
            {fixture.venue}
          </span>
          <span className="text-xs text-stone-400">{dt.time}</span>
        </div>
        <p className="text-base font-bold text-stone-900">
          {home} <span className="font-normal text-stone-400">vs</span> {fixture.opponent}
        </p>
        {fixture.location && (
          fixture.map_link ? (
            <a
              href={fixture.map_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-forest hover:underline"
            >
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 3 4.5 8.5 4.5 8.5S12.5 9 12.5 6A4.5 4.5 0 0 0 8 1.5Z"/>
                <circle cx="8" cy="6" r="1.5"/>
              </svg>
              {fixture.location}
            </a>
          ) : (
            <p className="text-sm text-stone-500">{fixture.location}</p>
          )
        )}
        {fixture.result && <p className="text-sm font-semibold text-forest-mid">Result: {fixture.result}</p>}
        {fixture.notes && (
          <div className="mt-1 text-sm text-stone-500 [&_a]:text-forest [&_a]:underline">
            <TinaMarkdown content={fixture.notes} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── calendar view ───────────────────────────────────────────────────────────

function CalendarView({ fixtures }: { fixtures: Fixture[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<Fixture[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = (firstDow + 6) % 7; // shift to Mon=0

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelected(null);
  }

  function fixturesOnDay(day: number) {
    return fixtures.filter(f => {
      const d = new Date(f.date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  function clickDay(day: number) {
    const dayFixtures = fixturesOnDay(day);
    if (dayFixtures.length === 0) { setSelected(null); setSelectedDay(null); return; }
    setSelected(dayFixtures);
    setSelectedDay(day);
  }

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isPast = (day: number) => new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div>
      {/* Month nav */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="grid h-8 w-8 place-items-center rounded-lg border border-stone-200 bg-white text-stone-600 transition hover:border-forest hover:text-forest">
            ‹
          </button>
          <button onClick={nextMonth} className="grid h-8 w-8 place-items-center rounded-lg border border-stone-200 bg-white text-stone-600 transition hover:border-forest hover:text-forest">
            ›
          </button>
          <span className="text-base font-bold text-stone-900">
            {MONTH_NAMES[month]} {year}
          </span>
        </div>
        <button onClick={goToday} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-forest hover:text-forest">
          Today
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-stone-200">
        {cells.map((day, i) => {
          const dayFixtures = day ? fixturesOnDay(day) : [];
          const active = day === selectedDay;
          return (
            <div
              key={i}
              onClick={() => day && clickDay(day)}
              className={`group min-h-[72px] border-b border-r border-stone-200 p-1.5 last:border-b-0 [&:nth-child(7n)]:border-r-0 ${
                day
                  ? "cursor-pointer bg-white hover:bg-stone-50"
                  : "bg-stone-50/50"
              } ${active ? "!bg-green-50" : ""}`}
            >
              {day && (
                <>
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday(day)
                        ? "bg-forest text-white"
                        : isPast(day)
                        ? "text-stone-400"
                        : "text-stone-700"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayFixtures.slice(0, 2).map(f => (
                      <div
                        key={f.id}
                        className={`truncate rounded px-1 py-0.5 text-[9px] font-semibold ${
                          isPast(day)
                            ? "bg-stone-100 text-stone-500"
                            : "bg-forest/10 text-forest"
                        }`}
                      >
                        {f.home_team ?? "KBC"} v {f.opponent}
                      </div>
                    ))}
                    {dayFixtures.length > 2 && (
                      <div className="px-1 text-[9px] text-stone-400">+{dayFixtures.length - 2} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selected && selectedDay && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">
              {selectedDay} {MONTH_NAMES[month]} {year}
            </h3>
            <button onClick={() => { setSelected(null); setSelectedDay(null); }} className="text-xs text-stone-400 hover:text-stone-600">
              close ✕
            </button>
          </div>
          {selected.map(f => (
            <div key={f.id} className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4">
              <div className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${f.venue === "Home" ? "bg-green-100 text-forest" : "bg-amber-100 text-amber-800"}`}>
                {f.venue}
              </div>
              <div>
                <p className="font-bold text-stone-900 text-sm">
                  {f.home_team ?? "KBC"} <span className="font-normal text-stone-400">vs</span> {f.opponent}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {fmt(f.date).time}
                  {f.location && (
                    <>
                      {" · "}
                      {f.map_link ? (
                        <a
                          href={f.map_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-forest hover:underline"
                        >
                          <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 3 4.5 8.5 4.5 8.5S12.5 9 12.5 6A4.5 4.5 0 0 0 8 1.5Z"/>
                            <circle cx="8" cy="6" r="1.5"/>
                          </svg>
                          {f.location}
                        </a>
                      ) : (
                        f.location
                      )}
                    </>
                  )}
                </p>
                {f.result && <p className="text-xs font-semibold text-forest-mid mt-1">Result: {f.result}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-[10px] text-stone-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-forest/20" />
          Upcoming fixture
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-stone-200" />
          Past fixture
        </span>
      </div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function FixturesClient({ data, query, variables, currentSeason, seasonTeams = {}, seasonFolderMap = {} }: Props) {
  const { data: live } = useTina({ query, variables, data });

  const all: Fixture[] =
    live.fixtureConnection?.edges?.map((e: any) => e?.node).filter(Boolean) ?? [];

  // All distinct seasons (only non-archived ones appear in the map), newest first
  const seasons = Array.from(
    new Set(all.map(f => fixtureSeasonName(f, seasonFolderMap)).filter(Boolean)),
  ).sort((a, b) => b.localeCompare(a));

  const [view, setView] = useState<"list" | "calendar">("list");
  const [team, setTeam] = useState("all");
  const [season, setSeason] = useState<string>(
    currentSeason ?? seasons[0] ?? "",
  );

  // Filter by selected season, then by team
  const bySeason = all.filter(f => fixtureSeasonName(f, seasonFolderMap) === season);

  const teams = Array.from(
    new Set(bySeason.map((f: Fixture) => f.home_team).filter((t): t is string => !!t)),
  ).sort();

  const filtered = team === "all" ? bySeason : bySeason.filter(f => f.home_team === team);
  const now = Date.now();
  const upcoming = filtered.filter(f => new Date(f.date).getTime() >= now).sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const past     = filtered.filter(f => new Date(f.date).getTime() <  now).sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <>
      <PageHero eyebrow="Match schedule" title="Fixtures & Results" subtitle="Upcoming matches and recent results across all our teams." />

      <section className="mx-auto max-w-4xl px-6 py-8">

        {/* Season selector */}
        {seasons.length > 1 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-stone-500">Season:</span>
            {seasons.map((s) => (
              <button
                key={s}
                onClick={() => { setSeason(s); setTeam("all"); }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  season === s
                    ? "bg-stone-800 text-white"
                    : "border border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Top bar: view toggle + team filter */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {/* View toggle */}
          <div className="flex rounded-xl border border-stone-200 bg-white p-1">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                view === "list" ? "bg-forest text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
              List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                view === "calendar" ? "bg-forest text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="5" y1="1" x2="5" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="11" y1="1" x2="11" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="1.5" y1="7" x2="14.5" y2="7" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Calendar
            </button>
          </div>

          {/* Team filter */}
          {teams.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {["all", ...teams].map(t => (
                <button
                  key={t}
                  onClick={() => setTeam(t)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    team === t
                      ? "bg-forest text-white"
                      : "border border-stone-200 bg-white text-stone-600 hover:border-forest hover:text-forest"
                  }`}
                >
                  {t === "all" ? "All Teams" : t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subscribe bar — calendar mode only */}
        {view === "calendar" && <SubscribeBar team={team} />}

        {/* Views */}
        {view === "list" ? (
          <>
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl font-extrabold text-stone-900">Upcoming</h2>
              <span className="text-sm font-medium text-stone-400">{upcoming.length} matches</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white py-10 text-center">
                <p className="font-semibold text-stone-600">No upcoming fixtures yet.</p>
                <p className="mt-1 text-sm text-stone-400">Check back soon.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {upcoming.map(f => <FixtureRow key={f.id} fixture={f} past={false} />)}
              </div>
            )}

            {past.length > 0 && (
              <>
                <div className="mt-10 flex items-baseline gap-3">
                  <h2 className="text-2xl font-extrabold text-stone-900">Recent Matches</h2>
                  <span className="text-sm font-medium text-stone-400">{past.length} matches</span>
                </div>
                <div className="mt-4 space-y-3">
                  {past.slice(0, 10).map(f => <FixtureRow key={f.id} fixture={f} past={true} />)}
                </div>
              </>
            )}
          </>
        ) : (
          <CalendarView fixtures={filtered} />
        )}
      </section>

      {/* ── League Tables — from current season's team data ── */}
      {(() => {
        const tables = (seasonTeams[season] ?? seasonTeams[seasons[0]] ?? [])
          .filter((t: TeamEntry) => !!t.table_link);
        return tables.length > 0 ? <LeagueTablesSection tables={tables} /> : null;
      })()}
    </>
  );
}
