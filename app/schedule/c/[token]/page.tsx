import { notFound } from "next/navigation";
import { getSupabase } from "../../_lib/supabase";
import { saveVenueDetails, confirmCupHomeDate } from "./actions";
import AwayProposalFields from "./away-proposal-fields";
import HomeCalendar from "./home-calendar";
import SubmitButton from "../../_lib/submit-button";
import { linkedTeamIds, knocklyonBusyDates } from "../../_lib/notify";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule your fixtures — Knocklyon BC" };

type ClubJoined = {
  id: string;
  name: string;
  team_name: string | null;
  access_token: string;
  knocklyon_team_id: string | null;
  venue_location: string | null;
  venue_map_link: string | null;
  secretary_note: string | null;
  competition: string | null;
  cup_round: string | null;
  knocklyon_teams: {
    name: string;
    division: string | null;
    captain_note: string | null;
    secretary_visible_note: string | null;
  } | null;
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
  secretary_confirmed_at?: string | null;
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

export default async function SecretaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ err?: string; ok?: string; dates?: string }>;
}) {
  const { token } = await params;
  const { err, ok, dates: conflictDates } = await searchParams;

  const supabase = getSupabase();

  const { data: club } = await supabase
    .from("clubs")
    .select(
      "id, name, team_name, access_token, knocklyon_team_id, venue_location, venue_map_link, secretary_note, competition, cup_round, knocklyon_teams(name, division, captain_note, secretary_visible_note)"
    )
    .eq("access_token", token)
    .single<ClubJoined>();

  if (!club) notFound();

  const busyDates = await knocklyonBusyDates(club.knocklyon_team_id);

  const [fixturesRes, teamSlotsRes, allFixturesRes] = await Promise.all([
    supabase
      .from("fixtures")
      .select("*")
      .eq("opponent_club_id", club.id)
      .order("is_knocklyon_home", { ascending: false }),
    club.knocklyon_team_id
      ? supabase
          .from("team_home_availability")
          .select("match_time, home_slots(id, slot_date, capacity)")
          .eq("knocklyon_team_id", club.knocklyon_team_id)
      : Promise.resolve({ data: [] as unknown as Array<unknown> }),
    supabase.from("fixtures").select("*"),
  ]);

  const fixtures: Fixture[] = fixturesRes.data ?? [];
  type SlotWithTime = Slot & { match_time: string };
  const slots: SlotWithTime[] = (
    (teamSlotsRes.data ?? []) as unknown as Array<{
      match_time: string | null;
      home_slots: Slot | null;
    }>
  )
    .map((r) =>
      r.home_slots
        ? { ...r.home_slots, match_time: r.match_time ?? "20:00" }
        : null
    )
    .filter((s): s is SlotWithTime => Boolean(s))
    .sort((a, b) => a.slot_date.localeCompare(b.slot_date));
  const allFixtures: Fixture[] = allFixturesRes.data ?? [];

  let teamClubIds = new Set<string>();
  if (club.knocklyon_team_id) {
    const { data: teamClubs } = await supabase
      .from("clubs")
      .select("id")
      .in("knocklyon_team_id", await linkedTeamIds(club.knocklyon_team_id));
    teamClubIds = new Set((teamClubs ?? []).map((c) => c.id));
  }

  const teamBlockedSlotIds = new Set<string>();
  const teamBlockedAwayDates = new Set<string>();
  for (const f of allFixtures) {
    if (f.status !== "confirmed") continue;
    if (!teamClubIds.has(f.opponent_club_id)) continue;
    if (f.confirmed_slot_id) teamBlockedSlotIds.add(f.confirmed_slot_id);
    if (f.confirmed_date) teamBlockedAwayDates.add(f.confirmed_date);
  }

  const bookingsPerSlot = new Map<string, number>();
  for (const f of allFixtures) {
    if (f.confirmed_slot_id && f.status === "confirmed") {
      bookingsPerSlot.set(
        f.confirmed_slot_id,
        (bookingsPerSlot.get(f.confirmed_slot_id) ?? 0) + 1
      );
    }
  }

  const slotOptions = slots.map((s) => {
    const capacityLeft = (bookingsPerSlot.get(s.id) ?? 0) < s.capacity;
    const teamAlreadyHome = teamBlockedSlotIds.has(s.id);
    const teamAlreadyAway = teamBlockedAwayDates.has(s.slot_date);
    return {
      id: s.id,
      slot_date: s.slot_date,
      match_time: s.match_time,
      is_available: capacityLeft && !teamAlreadyHome && !teamAlreadyAway,
    };
  });

  if (club.competition === "cup") {
    const cupFixture = fixtures[0] ?? null;
    let cupHomeDate: string | null = null;
    if (cupFixture?.is_knocklyon_home && cupFixture.confirmed_slot_id) {
      const { data: slot } = await supabase
        .from("home_slots")
        .select("slot_date")
        .eq("id", cupFixture.confirmed_slot_id)
        .single();
      cupHomeDate = slot?.slot_date ?? null;
    }
    return (
      <CupView
        club={club}
        token={token}
        fixture={cupFixture}
        homeDate={cupHomeDate}
        err={err}
        ok={ok}
        conflictDates={conflictDates}
        busyDates={busyDates}
      />
    );
  }

  const homeFixture = fixtures.find((f) => f.is_knocklyon_home);
  const awayFixture = fixtures.find((f) => !f.is_knocklyon_home);

  const confirmedHomeDate = homeFixture?.confirmed_slot_id
    ? slots.find((s) => s.id === homeFixture.confirmed_slot_id)?.slot_date
    : null;

  const knocklyonLabel = `Knocklyon${
    club.knocklyon_teams?.name ? ` ${club.knocklyon_teams.name}` : ""
  }`;
  const opponentLabel = club.team_name
    ? `${club.name} ${club.team_name}`
    : club.name;
  const division = club.knocklyon_teams?.division ?? null;
  const divisionSuffix = division ? ` (${division})` : "";
  const matchupLabel = `${knocklyonLabel} vs ${opponentLabel}${divisionSuffix}`;

  const proposed = parseProposed(awayFixture?.proposed_dates);

  const step1Done = homeFixture?.status === "confirmed";
  const step2Done = awayFixture?.status === "confirmed";
  const bothDone = step1Done && step2Done;

  const knocklyonHomeVenue =
    process.env.KNOCKLYON_LOCATION ?? "Knocklyon Community Centre";
  const knocklyonHomeMap = process.env.KNOCKLYON_MAP_LINK ?? "";

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-3">
        <div className="text-sm font-medium text-forest uppercase tracking-wide">
          Fixture scheduling
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          {matchupLabel}
        </h1>
        <p className="text-zinc-700">
          Hi {club.name} secretary, you have two league fixtures to schedule
          against Knocklyon this season. Follow the two steps below.
        </p>
      </header>

      {err && <ErrorBanner code={err} conflictDates={conflictDates} />}
      {ok && <SuccessBanner code={ok} />}

      {bothDone && (
        <div className="rounded-lg border-2 border-forest bg-forest/10 px-5 py-4">
          <div className="text-lg font-semibold text-forest">
            🎉 Both fixtures locked in!
          </div>
          <div className="text-sm text-zinc-700 mt-1">
            We&rsquo;ve emailed you a confirmation with both dates. Nothing
            more to do here.
          </div>
        </div>
      )}

      {/* ─── STEP 1: away match at Knocklyon ─────────────────────────── */}
      <StepCard
        number={1}
        done={step1Done}
        title="Pick a date at Knocklyon"
        subtitle={`${knocklyonLabel} vs ${opponentLabel} · played at Knocklyon`}
        venueLabel={knocklyonHomeVenue}
        venueMapLink={knocklyonHomeMap}
      >
        {!homeFixture ? (
          <p className="text-zinc-500 italic">Fixture not found.</p>
        ) : step1Done && confirmedHomeDate ? (
          <ConfirmedCard
            date={confirmedHomeDate}
            time={homeFixture.match_time ?? null}
          />
        ) : slotOptions.length === 0 ? (
          <p className="text-zinc-500 italic">
            Knocklyon haven&rsquo;t published their home dates for your team
            yet. Please check back shortly.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              Highlighted dates are when Knocklyon can host your team. Pick
              one that works for you.
            </p>
            <HomeCalendar
              token={token}
              fixtureId={homeFixture.id}
              slots={slotOptions}
            />
          </div>
        )}
      </StepCard>

      {/* ─── STEP 2: home match at your venue ────────────────────────── */}
      {/* (note card is rendered after Step 2) */}
      <StepCard
        number={2}
        done={step2Done}
        title={`Propose dates to host ${knocklyonLabel}`}
        subtitle={`${opponentLabel} vs ${knocklyonLabel} · played at your venue`}
        venueLabel={club.venue_location ?? null}
        venueMapLink={club.venue_map_link ?? null}
      >
        {!awayFixture ? (
          <p className="text-zinc-500 italic">Fixture not found.</p>
        ) : step2Done ? (
          <div className="space-y-4">
            <ConfirmedCard
              date={awayFixture.confirmed_date!}
              time={awayFixture.match_time ?? null}
            />
            <VenueForm
              token={token}
              location={club.venue_location}
              mapLink={club.venue_map_link}
              compact
            />
          </div>
        ) : (
          <div className="space-y-6">
            {(club.knocklyon_teams?.secretary_visible_note ?? club.knocklyon_teams?.captain_note) && (
              <div className="rounded border border-amber-200 bg-amber-50 text-amber-900 text-sm px-3 py-2 whitespace-pre-wrap">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
                  Note from {knocklyonLabel}&rsquo;s captain
                </div>
                {club.knocklyon_teams?.secretary_visible_note ?? club.knocklyon_teams?.captain_note}
              </div>
            )}
            <AwayProposalForm
              token={token}
              proposed={proposed}
              note={club.secretary_note}
              venueLocation={club.venue_location}
              venueMapLink={club.venue_map_link}
              busyDates={busyDates}
            />
          </div>
        )}
      </StepCard>
    </main>
  );
}

function CupView({
  club,
  token,
  fixture,
  homeDate,
  err,
  ok,
  conflictDates,
  busyDates,
}: {
  club: ClubJoined;
  token: string;
  fixture: Fixture | null;
  homeDate: string | null;
  err?: string;
  ok?: string;
  conflictDates?: string;
  busyDates: string[];
}) {
  const knocklyonLabel = `Knocklyon${
    club.knocklyon_teams?.name ? ` ${club.knocklyon_teams.name}` : ""
  }`;
  const opponentLabel = club.team_name
    ? `${club.name} ${club.team_name}`
    : club.name;
  const isHome = fixture?.is_knocklyon_home ?? true;
  const confirmedByUs = Boolean(fixture?.secretary_confirmed_at);
  const awayDone = fixture?.status === "confirmed" && !isHome;
  const proposed = parseProposed(fixture?.proposed_dates);
  const venue = isHome
    ? (process.env.KNOCKLYON_LOCATION ?? "Knocklyon Community Centre")
    : club.venue_location;
  const venueMap = isHome
    ? (process.env.KNOCKLYON_MAP_LINK ?? "")
    : club.venue_map_link;

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-3">
        <div className="text-sm font-medium text-purple-800 uppercase tracking-wide">
          Cup{club.cup_round ? ` · ${club.cup_round}` : ""}
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          {isHome
            ? `${knocklyonLabel} vs ${opponentLabel}`
            : `${opponentLabel} vs ${knocklyonLabel}`}
        </h1>
        <p className="text-zinc-700">
          Hi {club.name} secretary,{" "}
          {isHome
            ? "this cup tie is a single match, played at Knocklyon."
            : "this cup tie is a single match, played at your venue."}
        </p>
      </header>

      {err && <ErrorBanner code={err} conflictDates={conflictDates} />}
      {ok && <SuccessBanner code={ok} />}

      <section
        className={`rounded-lg border p-5 sm:p-6 space-y-4 ${
          confirmedByUs || awayDone ? "border-forest/40 bg-forest/5" : "border-zinc-200 bg-white"
        }`}
      >
        {venue && (
          <p className="text-sm text-zinc-700">
            📍 {venue}
            {venueMap && (
              <>
                {" "}
                &middot;{" "}
                <a href={venueMap} target="_blank" rel="noreferrer" className="text-forest hover:underline">
                  open map
                </a>
              </>
            )}
          </p>
        )}

        {isHome ? (
          !fixture || !homeDate ? (
            <p className="text-zinc-600">
              Knocklyon will be in touch shortly with the date for this match.
              Please check back soon.
            </p>
          ) : confirmedByUs ? (
            <div className="space-y-3">
              <ConfirmedCard date={homeDate} time={fixture.match_time} />
              <p className="text-sm text-zinc-700">
                Thanks, you&rsquo;ve confirmed this date. Nothing more to do here.
              </p>
              {club.secretary_note && (
                <div className="rounded border border-zinc-200 bg-white text-sm px-3 py-2 whitespace-pre-wrap">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">
                    Your message
                  </div>
                  {club.secretary_note}
                </div>
              )}
            </div>
          ) : (
            <form action={confirmCupHomeDate} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              <div className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-3">
                <div className="text-xs text-purple-800 uppercase tracking-wide">
                  Date set by Knocklyon
                </div>
                <div className="text-lg font-semibold text-zinc-900 mt-0.5">
                  {formatDate(homeDate)}
                  {fixture.match_time && (
                    <span className="ml-2 font-medium text-zinc-800">
                      at {formatTime(fixture.match_time)}
                    </span>
                  )}
                </div>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-zinc-800">
                  Message for Knocklyon{" "}
                  <span className="font-normal text-zinc-500">(optional)</span>
                </span>
                <textarea
                  name="note"
                  defaultValue={club.secretary_note ?? ""}
                  rows={3}
                  placeholder="Anything we should know, e.g. arrival time or parking."
                  className="mt-2 w-full rounded border border-zinc-300 px-3 py-2 text-sm resize-y"
                />
              </label>
              <SubmitButton
                className="rounded bg-forest px-4 py-2 text-white text-sm hover:bg-forest-dark"
                pendingLabel="Confirming…"
              >
                Confirm this date
              </SubmitButton>
              <p className="text-xs text-zinc-500">
                If this date doesn&rsquo;t work for you, reply to the email we
                sent you and we will arrange another.
              </p>
            </form>
          )
        ) : awayDone && fixture?.confirmed_date ? (
          <div className="space-y-4">
            <ConfirmedCard date={fixture.confirmed_date} time={fixture.match_time} />
            <VenueForm token={token} location={club.venue_location} mapLink={club.venue_map_link} compact />
          </div>
        ) : (
          <div className="space-y-6">
            <AwayProposalForm
              token={token}
              proposed={proposed}
              note={club.secretary_note}
              venueLocation={club.venue_location}
              venueMapLink={club.venue_map_link}
              busyDates={busyDates}
            />
          </div>
        )}
      </section>
    </main>
  );
}

function StepCard({
  number,
  done,
  title,
  subtitle,
  venueLabel,
  venueMapLink,
  children,
}: {
  number: number;
  done: boolean;
  title: string;
  subtitle: string;
  venueLabel?: string | null;
  venueMapLink?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border p-5 sm:p-6 space-y-4 ${
        done ? "border-forest/40 bg-forest/5" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-sm ${
            done
              ? "bg-forest text-white"
              : "bg-zinc-100 text-zinc-700 border border-zinc-200"
          }`}
        >
          {done ? "✓" : number}
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wide text-zinc-500 font-medium">
            Step {number}
            {done && (
              <span className="ml-2 text-forest normal-case tracking-normal font-semibold">
                complete
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 mt-0.5">
            {title}
          </h2>
          <p className="text-sm text-zinc-600 mt-0.5">{subtitle}</p>
          {venueLabel && (
            <p className="text-sm text-zinc-700 mt-1">
              📍 {venueLabel}
              {venueMapLink && (
                <>
                  {" "}
                  &middot;{" "}
                  <a
                    href={venueMapLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-forest hover:underline"
                  >
                    open map
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

function ConfirmedCard({
  date,
  time,
}: {
  date: string;
  time: string | null;
}) {
  return (
    <div className="rounded-lg border border-forest bg-white px-4 py-3">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">
        Confirmed for
      </div>
      <div className="text-lg font-semibold text-forest mt-0.5">
        {formatDate(date)}
        {time && (
          <span className="ml-2 text-zinc-800 font-medium">
            at {formatTime(time)}
          </span>
        )}
      </div>
    </div>
  );
}

function VenueForm({
  token,
  location,
  mapLink,
  compact = false,
}: {
  token: string;
  location: string | null;
  mapLink: string | null;
  compact?: boolean;
}) {
  return (
    <form action={saveVenueDetails} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm font-medium text-zinc-800">
        Your venue details
        {compact && (
          <span className="ml-2 font-normal text-zinc-500 text-xs">
            (shown to players)
          </span>
        )}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-zinc-600">Location / venue name</span>
          <input
            type="text"
            name="location"
            defaultValue={location ?? ""}
            placeholder="e.g. St Andrews Sports Centre, Booterstown"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-600">
            Google Maps link (paste URL)
          </span>
          <input
            type="url"
            name="map_link"
            defaultValue={mapLink ?? ""}
            placeholder="https://maps.google.com/…"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <SubmitButton
        className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 hover:border-forest hover:text-forest"
        pendingLabel="Saving…"
      >
        Save venue details
      </SubmitButton>
    </form>
  );
}

function AwayProposalForm({
  token,
  proposed,
  note,
  venueLocation,
  venueMapLink,
  busyDates,
}: {
  token: string;
  proposed: ProposedDate[];
  note: string | null;
  venueLocation: string | null;
  venueMapLink: string | null;
  busyDates: string[];
}) {
  const alreadyProposed = proposed.length >= 2;
  const [p1, p2] = proposed;

  return (
    <div className="space-y-4">
      {alreadyProposed && (
        <div className="rounded border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm space-y-2">
          <div className="font-medium">You&rsquo;ve proposed:</div>
          <ul className="space-y-1">
            <li>
              <strong>Option 1:</strong> {formatDate(p1.date)}{" "}
              {p1.time ? `at ${formatTime(p1.time)}` : "(no start time set)"}
            </li>
            <li>
              <strong>Option 2:</strong> {formatDate(p2.date)}{" "}
              {p2.time ? `at ${formatTime(p2.time)}` : "(no start time set)"}
            </li>
          </ul>
          <div className="text-xs text-amber-800">
            Knocklyon will pick one and confirm here. You can update your
            proposal below at any time.
          </div>
        </div>
      )}
      <AwayProposalFields
        token={token}
        proposed={proposed}
        note={note}
        venueLocation={venueLocation}
        venueMapLink={venueMapLink}
        busyDates={busyDates}
        alreadyProposed={alreadyProposed}
      />
    </div>
  );
}

function ErrorBanner({
  code,
  conflictDates,
}: {
  code: string;
  conflictDates?: string;
}) {
  const messages: Record<string, string> = {
    slot_full:
      "Sorry — that date just filled up. Please pick another available date.",
    team_conflict:
      "Sorry — that Knocklyon team is already scheduled that day. Please pick another date.",
    already_confirmed: "This fixture already has a confirmed date.",
    invalid: "That request wasn't valid. Please try again.",
    book_failed: "Something went wrong booking that date. Please try again.",
    need_two_dates: "Please pick two dates for your away proposal.",
    need_times: "Please pick a start time for each proposed date.",
    duplicate_dates: "Please pick two different dates.",
    need_venue: "Please enter your venue name so our captain knows where the match is.",
    save_failed:
      "Something went wrong saving your proposal. Please try again.",
  };

  let message = messages[code] ?? "Something went wrong.";
  if (code === "knocklyon_conflict") {
    const list =
      conflictDates
        ?.split(",")
        .map((d) => formatDate(d))
        .join(" and ") ?? "one of those dates";
    message = `Sorry, Knocklyon already has a match scheduled on ${list}. Please pick another date.`;
  }

  return (
    <div
      role="alert"
      className="rounded border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm"
    >
      {message}
    </div>
  );
}

function SuccessBanner({ code }: { code: string }) {
  const messages: Record<string, string> = {
    home_booked: "Your date at Knocklyon has been confirmed. Thanks!",
    away_proposed:
      "Your proposal has been sent. Knocklyon will pick one of your dates.",
    venue_saved: "Venue details saved.",
    note_saved: "Your message has been saved.",
    cup_confirmed: "Thanks, the date is confirmed.",
  };
  return (
    <div
      role="status"
      className="rounded border border-forest bg-forest/10 text-forest px-4 py-3 text-sm"
    >
      {messages[code] ?? "Done."}
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
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
