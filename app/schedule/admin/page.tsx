import Link from "next/link";
import { cookies } from "next/headers";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabase } from "../_lib/supabase";
import {
  LoginForm,
  AddClubForm,
  AddTeamSlotForm,
  AddKnocklyonTeamForm,
  TeamSlotTimeEditor,
} from "./client-forms";
import {
  logout,
  deleteClub,
  removeTeamSlot,
  setAwayDate,
  resetFixture,
  sendInvite,
  acceptProposedDate,
  deleteKnocklyonTeam,
  setMatchTime,
} from "./actions";
import CopyJson from "./copy-json";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scheduling admin — Knocklyon BC" };

const COOKIE_NAME = "kbc_admin";
const HOME_DEFAULT_TIME = "20:00";

type KnocklyonTeam = {
  id: string;
  name: string;
  division: string | null;
  display_name: string | null;
};
type Club = {
  id: string;
  name: string;
  team_name: string | null;
  secretary_email: string;
  access_token: string;
  knocklyon_team_id: string | null;
  venue_location: string | null;
  venue_map_link: string | null;
  secretary_note: string | null;
};
type Slot = { id: string; slot_date: string; capacity: number };
type ProposedDate = { date: string; time: string | null };
type Fixture = {
  id: string;
  opponent_club_id: string;
  is_knocklyon_home: boolean;
  status: string;
  confirmed_slot_id: string | null;
  confirmed_date: string | null;
  match_time: string | null;
  proposed_dates: unknown;
};

function parseProposed(raw: unknown): ProposedDate[] {
  if (!Array.isArray(raw)) return [];
  const out: ProposedDate[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      out.push({ date: item, time: null });
    } else if (
      item &&
      typeof item === "object" &&
      "date" in item &&
      typeof (item as { date: unknown }).date === "string"
    ) {
      const d = item as { date: string; time?: unknown };
      out.push({
        date: d.date,
        time: typeof d.time === "string" ? d.time : null,
      });
    }
  }
  return out;
}

async function readCurrentSeasonFolder(): Promise<string | null> {
  try {
    const file = path.join(
      process.cwd(),
      "content",
      "settings",
      "site.json"
    );
    const raw = await readFile(file, "utf-8");
    const settings = JSON.parse(raw) as { current_season?: string };
    if (settings.current_season) {
      return settings.current_season.replace("/", "-");
    }
  } catch {
    // ignore — return null and the panel will show a warning
  }
  return null;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    msg?: string;
    club?: string;
    date?: string;
    team?: string;
  }>;
}) {
  const store = await cookies();
  const isAuthed = store.get(COOKIE_NAME)?.value === "1";

  if (!isAuthed) return <LoginForm />;

  const {
    msg,
    club: clubMsgName,
    date: msgDate,
    team: selectedTeamId,
  } = await searchParams;

  const supabase = getSupabase();

  const { data: teams } = await supabase
    .from("knocklyon_teams")
    .select("*")
    .order("created_at");
  const teamsList: KnocklyonTeam[] = teams ?? [];
  const selectedTeam = selectedTeamId
    ? teamsList.find((t) => t.id === selectedTeamId)
    : undefined;

  const seasonFolder = selectedTeam
    ? await readCurrentSeasonFolder()
    : null;

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-forest">
          Scheduling admin
        </h1>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            Sign out
          </button>
        </form>
      </header>

      {msg && (
        <MessageBanner code={msg} clubName={clubMsgName} date={msgDate} />
      )}

      {/* ─── KNOCKLYON TEAMS ────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Knocklyon teams</h2>
        <p className="text-sm text-zinc-600">
          Short name is used in tabs and internal emails. Display name
          (e.g. &ldquo;Men&rsquo;s 1&rdquo;) goes into the TinaCMS export.
        </p>
        <AddKnocklyonTeamForm />
        {teamsList.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {teamsList.map((t) => (
              <li
                key={t.id}
                className="inline-flex items-center gap-2 rounded border border-zinc-200 px-2 py-1 text-sm"
              >
                <span>
                  {t.name}
                  {t.display_name && (
                    <span className="ml-1 text-zinc-500">
                      &ldquo;{t.display_name}&rdquo;
                    </span>
                  )}
                  {t.division ? ` (${t.division})` : ""}
                </span>
                <form action={deleteKnocklyonTeam}>
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-600 hover:underline"
                    title="Delete team (must have no clubs assigned)"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── TAB BAR ───────────────────────────────────────────────── */}
      {teamsList.length > 0 && (
        <nav aria-label="Teams" className="flex flex-wrap gap-2">
          {teamsList.map((t) => {
            const active = t.id === selectedTeamId;
            return (
              <Link
                key={t.id}
                href={`/schedule/admin?team=${t.id}`}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-all ${
                  active
                    ? "border-forest bg-forest text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-800 hover:border-forest hover:text-forest hover:shadow-sm"
                }`}
              >
                <span className="font-semibold">{t.name}</span>
                {t.division && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-zinc-100 text-zinc-700 group-hover:bg-forest/10 group-hover:text-forest"
                    }`}
                  >
                    {t.division}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {/* ─── TEAM CONTENT ──────────────────────────────────────────── */}
      {teamsList.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">
          Add at least one Knocklyon team above to get started.
        </p>
      ) : !selectedTeam ? (
        <p className="text-sm text-zinc-500 italic">
          Pick a team above to see its opposing clubs, home dates, and
          fixtures.
        </p>
      ) : (
        <TeamPanel team={selectedTeam} seasonFolder={seasonFolder} />
      )}
    </main>
  );
}

async function TeamPanel({
  team,
  seasonFolder,
}: {
  team: KnocklyonTeam;
  seasonFolder: string | null;
}) {
  const supabase = getSupabase();

  const [
    { data: clubs },
    { data: teamSlotRows },
    { data: fixtures },
    { data: allBookings },
  ] = await Promise.all([
    supabase
      .from("clubs")
      .select("*")
      .eq("knocklyon_team_id", team.id)
      .order("created_at"),
    supabase
      .from("team_home_availability")
      .select("match_time, home_slots(id, slot_date, capacity)")
      .eq("knocklyon_team_id", team.id),
    supabase
      .from("fixtures")
      .select("*, clubs!inner(knocklyon_team_id)")
      .eq("clubs.knocklyon_team_id", team.id)
      .order("created_at"),
    supabase.from("fixtures").select("confirmed_slot_id, status"),
  ]);

  const clubsList: Club[] = clubs ?? [];
  const clubById = new Map(clubsList.map((c) => [c.id, c]));

  type TeamSlotJoined = {
    match_time: string | null;
    home_slots: Slot | null;
  };
  const teamSlotEntries: Array<{ slot: Slot; match_time: string }> = (
    (teamSlotRows ?? []) as unknown as TeamSlotJoined[]
  )
    .map((r) => ({
      slot: r.home_slots,
      match_time: r.match_time ?? "20:00",
    }))
    .filter((e): e is { slot: Slot; match_time: string } => Boolean(e.slot))
    .sort((a, b) => a.slot.slot_date.localeCompare(b.slot.slot_date));
  const teamSlots: Slot[] = teamSlotEntries.map((e) => e.slot);
  const slotById = new Map(teamSlots.map((s) => [s.id, s]));

  const bookingsPerSlot = new Map<string, number>();
  for (const f of allBookings ?? []) {
    if (f.confirmed_slot_id && f.status === "confirmed") {
      bookingsPerSlot.set(
        f.confirmed_slot_id,
        (bookingsPerSlot.get(f.confirmed_slot_id) ?? 0) + 1
      );
    }
  }

  const fixturesList: Fixture[] = (fixtures ?? []).map((f) => ({
    id: f.id,
    opponent_club_id: f.opponent_club_id,
    is_knocklyon_home: f.is_knocklyon_home,
    status: f.status,
    confirmed_slot_id: f.confirmed_slot_id,
    confirmed_date: f.confirmed_date,
    match_time: f.match_time,
    proposed_dates: f.proposed_dates,
  }));

  return (
    <div className="space-y-10">
      {/* Opposing clubs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Opposing clubs for {team.name}
        </h2>
        <p className="text-sm text-zinc-600">
          Each opposing club auto-generates two fixtures (home + away).
        </p>
        <AddClubForm teamId={team.id} />
        {clubsList.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">
            No opposing clubs added yet.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded">
            {clubsList.map((c) => (
              <ClubRow key={c.id} club={c} />
            ))}
          </ul>
        )}
      </section>

      {/* Home dates for this team */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Home dates for {team.name}</h2>
        <p className="text-sm text-zinc-600">
          The dates this team is available to host at Knocklyon. Capacity is
          venue-wide (shared across all teams on the same date).
        </p>
        <AddTeamSlotForm teamId={team.id} />
        {teamSlots.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">
            No home dates added for this team yet.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded">
            {teamSlotEntries.map(({ slot: s, match_time }) => {
              const booked = bookingsPerSlot.get(s.id) ?? 0;
              const full = booked >= s.capacity;
              return (
                <li
                  key={s.id}
                  className="p-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      {formatDate(s.slot_date)}
                      <span className="ml-2 text-forest">
                        · {formatTime(match_time)}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-500">
                      {booked} / {s.capacity} confirmed venue-wide
                      {full && (
                        <span className="ml-2 text-xs font-medium text-red-600">
                          FULL
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <TeamSlotTimeEditor
                      teamId={team.id}
                      slotId={s.id}
                      currentTime={match_time}
                    />
                    <form action={removeTeamSlot}>
                      <input
                        type="hidden"
                        name="knocklyon_team_id"
                        value={team.id}
                      />
                      <input type="hidden" name="home_slot_id" value={s.id} />
                      <button
                        type="submit"
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Fixtures */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Fixtures for {team.name}</h2>
        {fixturesList.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">
            Add opposing clubs above to generate fixtures.
          </p>
        ) : (
          <FixtureTable
            fixtures={fixturesList}
            clubById={clubById}
            slotById={slotById}
            team={team}
          />
        )}
      </section>

      {/* Export */}
      <ExportPanel
        team={team}
        fixtures={fixturesList}
        clubById={clubById}
        slotById={slotById}
        seasonFolder={seasonFolder}
      />
    </div>
  );
}

function ClubRow({ club }: { club: Club }) {
  return (
    <li className="p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">
            {club.name}
            {club.team_name && (
              <span className="ml-1 text-zinc-500">{club.team_name}</span>
            )}
          </div>
          <div className="text-sm text-zinc-500">{club.secretary_email}</div>
          {club.venue_location && (
            <div className="text-xs text-zinc-500 mt-1">
              📍 {club.venue_location}
              {club.venue_map_link && (
                <>
                  {" "}
                  <a
                    href={club.venue_map_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-forest hover:underline"
                  >
                    (map)
                  </a>
                </>
              )}
            </div>
          )}
          <div className="text-xs text-zinc-400 mt-1 font-mono truncate">
            /schedule/c/{club.access_token}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <form action={sendInvite}>
            <input type="hidden" name="id" value={club.id} />
            <button type="submit" className="text-sm text-forest hover:underline">
              Send invite
            </button>
          </form>
          <form action={deleteClub}>
            <input type="hidden" name="id" value={club.id} />
            <button
              type="submit"
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </form>
        </div>
      </div>
      {club.secretary_note && (
        <div className="rounded border border-amber-200 bg-amber-50 text-amber-900 text-sm px-3 py-2 whitespace-pre-wrap">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
            Message from secretary
          </div>
          {club.secretary_note}
        </div>
      )}
    </li>
  );
}

function FixtureTable({
  fixtures,
  clubById,
  slotById,
  team,
}: {
  fixtures: Fixture[];
  clubById: Map<string, Club>;
  slotById: Map<string, Slot>;
  team: KnocklyonTeam;
}) {
  const knocklyonLabel = `Knocklyon ${team.name}`;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-zinc-200 rounded">
        <thead className="bg-zinc-50 text-left">
          <tr>
            <th className="p-2">Match</th>
            <th className="p-2">Status</th>
            <th className="p-2">Date &amp; time</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {fixtures.map((f) => {
            const opponent = clubById.get(f.opponent_club_id);
            const opponentLabel = opponent
              ? opponent.team_name
                ? `${opponent.name} ${opponent.team_name}`
                : opponent.name
              : "?";
            const label = f.is_knocklyon_home
              ? `${knocklyonLabel} vs ${opponentLabel}`
              : `${opponentLabel} vs ${knocklyonLabel}`;
            const date =
              f.confirmed_date ??
              (f.confirmed_slot_id
                ? slotById.get(f.confirmed_slot_id)?.slot_date
                : null);
            const displayTime =
              f.match_time ??
              (f.is_knocklyon_home && date ? HOME_DEFAULT_TIME : null);
            const proposed = parseProposed(f.proposed_dates);
            return (
              <tr key={f.id} className="border-t border-zinc-200 align-top">
                <td className="p-2 font-medium">{label}</td>
                <td className="p-2">
                  <StatusPill status={f.status} />
                </td>
                <td className="p-2">
                  {date ? (
                    <div className="space-y-1">
                      <div>{formatDate(date)}</div>
                      <form
                        action={setMatchTime}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="fixture_id"
                          value={f.id}
                        />
                        <input
                          type="time"
                          name="time"
                          defaultValue={displayTime ?? ""}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          className="text-xs text-forest hover:underline"
                        >
                          Save time
                        </button>
                      </form>
                    </div>
                  ) : f.is_knocklyon_home ? (
                    <span className="text-zinc-500">
                      waiting on {opponent?.name}
                    </span>
                  ) : proposed.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs text-zinc-500">Proposed:</div>
                      {proposed.map((p) => (
                        <form
                          key={p.date}
                          action={acceptProposedDate}
                          className="flex items-center gap-3 rounded border border-zinc-200 bg-white px-2 py-1.5"
                        >
                          <input
                            type="hidden"
                            name="fixture_id"
                            value={f.id}
                          />
                          <input
                            type="hidden"
                            name="date"
                            value={p.date}
                          />
                          <input
                            type="hidden"
                            name="time"
                            value={p.time ?? ""}
                          />
                          <div className="flex-1">
                            <div className="font-medium">
                              {formatDate(p.date)}
                            </div>
                            <div className="text-xs text-zinc-600">
                              {p.time
                                ? `Start: ${formatTime(p.time)}`
                                : "No start time set"}
                            </div>
                          </div>
                          <button
                            type="submit"
                            className="rounded bg-forest text-white px-2.5 py-1 text-xs hover:bg-forest-dark"
                          >
                            Accept
                          </button>
                        </form>
                      ))}
                      <details className="mt-1">
                        <summary className="text-xs text-zinc-400 cursor-pointer">
                          Or set a different date/time
                        </summary>
                        <ManualAwayDateForm fixtureId={f.id} />
                      </details>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">
                        Waiting on {opponent?.name} to propose dates.
                      </div>
                      <details>
                        <summary className="text-xs text-zinc-400 cursor-pointer">
                          Set date manually
                        </summary>
                        <ManualAwayDateForm fixtureId={f.id} />
                      </details>
                    </div>
                  )}
                </td>
                <td className="p-2 text-right">
                  {f.status === "confirmed" && (
                    <form action={resetFixture}>
                      <input type="hidden" name="fixture_id" value={f.id} />
                      <button
                        type="submit"
                        className="text-sm text-zinc-500 hover:text-red-600"
                      >
                        Reset
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ManualAwayDateForm({ fixtureId }: { fixtureId: string }) {
  return (
    <form
      action={setAwayDate}
      className="mt-1 flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="fixture_id" value={fixtureId} />
      <input
        type="date"
        name="date"
        required
        className="rounded border border-zinc-300 px-2 py-1 text-xs"
      />
      <input
        type="time"
        name="time"
        defaultValue="19:00"
        className="rounded border border-zinc-300 px-2 py-1 text-xs"
      />
      <button
        type="submit"
        className="text-xs text-forest hover:underline"
      >
        Set
      </button>
    </form>
  );
}

function ExportPanel({
  team,
  fixtures,
  clubById,
  slotById,
  seasonFolder,
}: {
  team: KnocklyonTeam;
  fixtures: Fixture[];
  clubById: Map<string, Club>;
  slotById: Map<string, Slot>;
  seasonFolder: string | null;
}) {
  const confirmed = fixtures.filter((f) => f.status === "confirmed");
  const outstanding = fixtures.length - confirmed.length;

  const knocklyonHome = process.env.KNOCKLYON_LOCATION ?? "Knocklyon Community Centre";
  const knocklyonMap = process.env.KNOCKLYON_MAP_LINK ?? "";
  const teamDisplayName = team.display_name ?? team.name;

  const items = confirmed.map((f) => {
    const opponent = clubById.get(f.opponent_club_id);
    const opponentLabel = opponent
      ? opponent.team_name
        ? `${opponent.name} ${opponent.team_name}`
        : opponent.name
      : "?";
    const date = f.is_knocklyon_home
      ? f.confirmed_slot_id
        ? slotById.get(f.confirmed_slot_id)?.slot_date ?? null
        : null
      : f.confirmed_date;

    const time =
      f.match_time ??
      (f.is_knocklyon_home ? HOME_DEFAULT_TIME : "19:00");

    const isoDate = date ? new Date(`${date}T${time}:00`).toISOString() : "";
    const venue = f.is_knocklyon_home ? "Home" : "Away";
    const location = f.is_knocklyon_home
      ? knocklyonHome
      : opponent?.venue_location ?? "";
    const mapLink = f.is_knocklyon_home
      ? knocklyonMap
      : opponent?.venue_map_link ?? "";

    const filenameStem =
      opponent
        ? `${slugify(opponent.name)}-${slugify(opponent.team_name ?? "")}`.replace(
            /-+$/,
            ""
          )
        : "fixture";
    const filename = `${filenameStem}-${f.is_knocklyon_home ? "H" : "A"}.json`;

    const json = {
      date: isoDate,
      home_team: teamDisplayName,
      opponent: opponentLabel,
      venue,
      location,
      map_link: mapLink,
      result: "",
      notes: "",
    };

    return { id: f.id, filename, json, hasLocation: Boolean(location) };
  });

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">
        Export fixtures for TinaCMS
      </h2>
      {seasonFolder ? (
        <p className="text-sm text-zinc-600">
          Copy each JSON block below into a new file in{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">
            content/fixtures/{seasonFolder}/
          </code>{" "}
          using the suggested filename, then commit and push.
        </p>
      ) : (
        <p className="text-sm text-amber-700">
          Could not read <code>content/settings/site.json</code>. Set{" "}
          <code>current_season</code> in TinaCMS to know which folder to
          export into.
        </p>
      )}

      {outstanding > 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
          Note: {outstanding} fixture{outstanding === 1 ? "" : "s"} for{" "}
          {team.name}{" "}
          {outstanding === 1 ? "is" : "are"} not yet confirmed. They&rsquo;ll
          appear here once confirmed.
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">
          Nothing to export yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded border border-zinc-200 bg-zinc-50 p-3 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <code className="text-sm font-medium text-zinc-800">
                  {item.filename}
                </code>
                <CopyJson data={item.json} label="Copy JSON" />
              </div>
              {!item.hasLocation && (
                <div className="text-xs text-red-700">
                  ⚠ Missing location for this fixture&rsquo;s venue.
                  {item.json.venue === "Away"
                    ? " The secretary hasn't entered their venue details."
                    : " Set KNOCKLYON_LOCATION env var."}
                </div>
              )}
              <pre className="text-xs bg-white border border-zinc-200 rounded p-2 overflow-x-auto">
                {JSON.stringify(item.json, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function slugify(s: string): string {
  return s
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function MessageBanner({
  code,
  clubName,
  date,
}: {
  code: string;
  clubName?: string;
  date?: string;
}) {
  const label = clubName ? decodeURIComponent(clubName) : "";
  if (code === "away_conflict") {
    const d = date ? formatDate(decodeURIComponent(date)) : "that date";
    return (
      <div
        role="alert"
        className="rounded border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm"
      >
        Can&rsquo;t confirm {d} &mdash; this Knocklyon team already has a
        match scheduled that day.
      </div>
    );
  }
  if (code === "team_has_clubs") {
    return (
      <div
        role="alert"
        className="rounded border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm"
      >
        Cannot delete a team while clubs are still assigned to it. Delete the
        clubs first.
      </div>
    );
  }
  if (code === "invite_sent") {
    return (
      <div
        role="status"
        className="rounded border border-forest bg-forest/10 text-forest px-4 py-3 text-sm"
      >
        Invitation email sent to {label}.
      </div>
    );
  }
  if (code === "invite_logged") {
    return (
      <div
        role="status"
        className="rounded border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3 text-sm"
      >
        Email not configured (RESEND_API_KEY missing) — link for {label} was
        logged to the server console.
      </div>
    );
  }
  if (code === "invite_failed") {
    return (
      <div
        role="alert"
        className="rounded border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm"
      >
        Sending invitation to {label} failed. Check the server logs.
      </div>
    );
  }
  return null;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    awaiting_date: {
      label: "Awaiting",
      className: "bg-amber-100 text-amber-800",
    },
    confirmed: {
      label: "Confirmed",
      className: "bg-forest/10 text-forest",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-zinc-200 text-zinc-600",
    },
  };
  const cfg = map[status] ?? { label: status, className: "bg-zinc-100" };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(hhmm: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":");
  const hn = parseInt(h, 10);
  if (!Number.isFinite(hn)) return hhmm;
  const period = hn >= 12 ? "pm" : "am";
  const h12 = hn % 12 === 0 ? 12 : hn % 12;
  return m === "00" ? `${h12}${period}` : `${h12}:${m}${period}`;
}
