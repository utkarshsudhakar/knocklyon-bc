import { notFound } from "next/navigation";
import { getSupabase } from "../../_lib/supabase";
import { captainRemoveDate } from "./actions";
import {
  WEEKDAY_CAPACITY,
  WEEKDAY_NAMES,
  hostableDays,
} from "../../_lib/config";
import CaptainCalendar from "./captain-calendar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Share your home dates — Knocklyon BC" };

type Team = {
  id: string;
  name: string;
  division: string | null;
  captain_name: string | null;
};

type SlotRow = {
  match_time: string | null;
  home_slots: { id: string; slot_date: string; capacity: number } | null;
};

export default async function CaptainPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{
    ok?: string;
    err?: string;
    n?: string;
    skipped?: string;
  }>;
}) {
  const { token } = await params;
  const { ok, err, n, skipped } = await searchParams;

  const supabase = getSupabase();
  const { data: team } = await supabase
    .from("knocklyon_teams")
    .select("id, name, division, captain_name")
    .eq("access_token", token)
    .single<Team>();

  if (!team) notFound();

  const teamLabel = `Knocklyon ${team.name}${
    team.division ? ` (${team.division})` : ""
  }`;

  const [slotsRes, allFixturesRes, teamClubsRes] = await Promise.all([
    supabase
      .from("team_home_availability")
      .select("match_time, home_slots(id, slot_date, capacity)")
      .eq("knocklyon_team_id", team.id),
    supabase
      .from("fixtures")
      .select("confirmed_slot_id, status, opponent_club_id"),
    supabase.from("clubs").select("id").eq("knocklyon_team_id", team.id),
  ]);

  const rows: SlotRow[] = (slotsRes.data ?? []) as unknown as SlotRow[];
  const teamClubIds = new Set(
    (teamClubsRes.data ?? []).map((c) => c.id)
  );

  const bookedForThisTeam = new Set<string>();
  const bookedVenueWide = new Map<string, number>();
  for (const f of allFixturesRes.data ?? []) {
    if (!f.confirmed_slot_id || f.status !== "confirmed") continue;
    bookedVenueWide.set(
      f.confirmed_slot_id,
      (bookedVenueWide.get(f.confirmed_slot_id) ?? 0) + 1
    );
    if (teamClubIds.has(f.opponent_club_id)) {
      bookedForThisTeam.add(f.confirmed_slot_id);
    }
  }

  const entries = rows
    .map((r) =>
      r.home_slots
        ? {
            slotId: r.home_slots.id,
            date: r.home_slots.slot_date,
            capacity: r.home_slots.capacity,
            time: r.match_time ?? "20:00",
          }
        : null
    )
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-2">
        <div className="text-sm font-medium text-forest uppercase tracking-wide">
          Home dates for the season
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          {teamLabel}
        </h1>
        <p className="text-zinc-700">
          Hi{team.captain_name ? ` ${team.captain_name}` : ""}, please add the
          dates your team can host at Knocklyon this season. Matches start at
          8:00 PM by default.
        </p>
      </header>

      {ok && <SuccessBanner code={ok} n={n} skipped={skipped} />}
      {err && <ErrorBanner code={err} />}

      <section className="rounded-lg border border-forest/30 bg-forest/5 p-5 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-forest">
          Available hosting days
        </div>
        <ul className="text-sm text-zinc-800 space-y-1">
          {Object.entries(WEEKDAY_CAPACITY)
            .filter(([, cap]) => cap > 0)
            .map(([d]) => (
              <li key={d}>
                <strong>{WEEKDAY_NAMES[parseInt(d, 10)]}</strong>
                {parseInt(d, 10) === 1
                  ? " (preferred)"
                  : " (club night, use only if needed)"}
              </li>
            ))}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Pick your dates
          </h2>
          <p className="text-sm text-zinc-600 mt-0.5">
            Select all the dates your team can host by clicking them on the
            calendar, then add them in one go.
          </p>
        </div>
        <CaptainCalendar
          token={token}
          existingDates={entries.map((e) => e.date)}
          hostableWeekdays={hostableDays()}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">
          Your home dates{" "}
          <span className="text-sm font-normal text-zinc-500">
            ({entries.length})
          </span>
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">
            No dates yet. Add your first above.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg bg-white">
            {entries.map((e) => {
              const bookedHere = bookedVenueWide.get(e.slotId) ?? 0;
              const isMineBooked = bookedForThisTeam.has(e.slotId);
              return (
                <li
                  key={e.slotId}
                  className="p-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      {formatDate(e.date)}
                      <span className="ml-2 text-forest">
                        · {formatTime(e.time)}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {bookedHere > 0
                        ? `${bookedHere} of ${e.capacity} booked venue-wide`
                        : `Capacity ${e.capacity}`}
                      {isMineBooked && (
                        <span className="ml-2 text-forest font-medium">
                          — your team is booked here
                        </span>
                      )}
                    </div>
                  </div>
                  <form action={captainRemoveDate}>
                    <input type="hidden" name="token" value={token} />
                    <input
                      type="hidden"
                      name="home_slot_id"
                      value={e.slotId}
                    />
                    <button
                      type="submit"
                      className="text-sm text-red-600 hover:underline"
                      title={
                        isMineBooked
                          ? "Cannot remove a date with your team already booked"
                          : ""
                      }
                      disabled={isMineBooked}
                    >
                      Remove
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-zinc-500">
        Any questions, just reply to the email that brought you here.
      </p>
    </main>
  );
}

function SuccessBanner({
  code,
  n,
  skipped,
}: {
  code: string;
  n?: string;
  skipped?: string;
}) {
  let message = "Done.";
  if (code === "dates_added") {
    const added = parseInt(n ?? "0", 10);
    const skippedNum = parseInt(skipped ?? "0", 10);
    if (added > 0) {
      message = `Added ${added} date${added === 1 ? "" : "s"}.`;
      if (skippedNum > 0) {
        message += ` Skipped ${skippedNum} (already added or not hostable).`;
      }
    } else if (skippedNum > 0) {
      message = `Nothing added — ${skippedNum} skipped (already added or not hostable).`;
    }
  } else if (code === "date_removed") {
    message = "Date removed.";
  }
  return (
    <div
      role="status"
      className="rounded border border-forest bg-forest/10 text-forest px-4 py-3 text-sm"
    >
      {message}
    </div>
  );
}

function ErrorBanner({ code }: { code: string }) {
  const map: Record<string, string> = {
    invalid: "Something wasn't right with that request. Please try again.",
    missing_date: "Please pick a date.",
    day_not_hostable:
      "Sorry, Knocklyon can't host on that day of the week. Try a Monday, Tuesday or Thursday.",
    already_added: "That date is already in your list.",
    save_failed: "Something went wrong saving. Please try again.",
    has_booking:
      "You can't remove this date — your team already has a confirmed match here.",
  };
  return (
    <div
      role="alert"
      className="rounded border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm"
    >
      {map[code] ?? "Something went wrong."}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
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
