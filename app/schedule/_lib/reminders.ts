import { getSupabase } from "./supabase";
import { matchReminderEmailHtml } from "./email-templates";
import { knocklyonLabel, opponentLabel } from "./notify";

const CLUB_CC = "knocklyonbclub@gmail.com";

export type ReminderCandidate = {
  fixtureId: string;
  clubName: string;
  to: string;
  cc: string | null;
  knocklyon: string;
  opponent: string;
  isHome: boolean;
  date: string;
  time: string;
  venue: string;
  mapLink: string;
  round: string | null;
  sentFor: string | null;
};

export type ReminderResult = { candidate: ReminderCandidate; ok: boolean; error?: string };

type FixtureRow = {
  id: string;
  is_knocklyon_home: boolean;
  match_time: string | null;
  confirmed_date: string | null;
  secretary_confirmed_at: string | null;
  reminder_sent_for: string | null;
  home_slots: { slot_date: string } | null;
  clubs: {
    name: string;
    team_name: string | null;
    secretary_email: string;
    competition: string | null;
    cup_round: string | null;
    venue_location: string | null;
    venue_map_link: string | null;
    knocklyon_teams: { name: string; captain_email: string | null } | null;
  } | null;
};

export function dublinToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" }).format(now);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Every confirmed match that has a date and (for cup home ties) a confirmed secretary. */
export async function loadReminderCandidates(): Promise<ReminderCandidate[]> {
  const { data, error } = await getSupabase()
    .from("fixtures")
    .select(
      "id, is_knocklyon_home, match_time, confirmed_date, secretary_confirmed_at, reminder_sent_for, home_slots:confirmed_slot_id(slot_date), clubs:opponent_club_id(name, team_name, secretary_email, competition, cup_round, venue_location, venue_map_link, knocklyon_teams(name, captain_email))"
    )
    .eq("status", "confirmed");
  if (error) throw new Error(`Could not load fixtures: ${error.message}`);

  const knocklyonVenue = process.env.KNOCKLYON_LOCATION ?? "Knocklyon Community Centre";
  const knocklyonMap = process.env.KNOCKLYON_MAP_LINK ?? "";

  const out: ReminderCandidate[] = [];
  for (const f of (data ?? []) as unknown as FixtureRow[]) {
    const club = f.clubs;
    if (!club) continue;
    const isCup = club.competition === "cup";
    if (isCup && f.is_knocklyon_home && !f.secretary_confirmed_at) continue;
    const date = f.is_knocklyon_home ? f.home_slots?.slot_date : f.confirmed_date;
    if (!date) continue;
    out.push({
      fixtureId: f.id,
      clubName: club.name,
      to: club.secretary_email,
      cc: club.knocklyon_teams?.captain_email || null,
      knocklyon: knocklyonLabel(club.knocklyon_teams?.name ?? null),
      opponent: opponentLabel(club.name, club.team_name),
      isHome: f.is_knocklyon_home,
      date,
      time: f.match_time ?? (f.is_knocklyon_home ? "20:00" : "19:00"),
      venue: f.is_knocklyon_home ? knocklyonVenue : (club.venue_location ?? ""),
      mapLink: f.is_knocklyon_home ? knocklyonMap : (club.venue_map_link ?? ""),
      round: isCup ? club.cup_round : null,
      sentFor: f.reminder_sent_for,
    });
  }
  return out;
}

/** Matches 1 or 2 days away (Dublin time) that haven't been reminded for their current date. */
export function dueReminders(candidates: ReminderCandidate[], today: string = dublinToday()): ReminderCandidate[] {
  const window = [addDays(today, 1), addDays(today, 2)];
  return candidates
    .filter((c) => window.includes(c.date) && c.sentFor !== c.date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.opponent.localeCompare(b.opponent));
}

export async function sendReminder(c: ReminderCandidate): Promise<ReminderResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { candidate: c, ok: false, error: "RESEND_API_KEY is not set" };

  const headline = c.isHome ? `${c.knocklyon} vs ${c.opponent}` : `${c.opponent} vs ${c.knocklyon}`;
  try {
    const { Resend } = await import("resend");
    const result = await new Resend(apiKey).emails.send({
      from: process.env.CONTACT_FROM ?? "onboarding@resend.dev",
      to: c.to,
      cc: [...new Set([c.cc, CLUB_CC].filter((e): e is string => !!e && e.toLowerCase() !== c.to.toLowerCase()))],
      subject: `🔔 Match Reminder: ${headline} - ${shortDate(c.date)}`,
      html: matchReminderEmailHtml({
        clubName: c.clubName,
        knocklyonLabel: c.knocklyon,
        opponentLabel: c.opponent,
        round: c.round,
        isHome: c.isHome,
        date: c.date,
        time: c.time,
        venue: c.venue,
        mapLink: c.mapLink,
      }),
    });
    if (result.error) return { candidate: c, ok: false, error: result.error.message };

    const { error } = await getSupabase()
      .from("fixtures")
      .update({ reminder_sent_for: c.date })
      .eq("id", c.fixtureId);
    if (error) console.error("[Reminder] sent but could not record it:", c.fixtureId, error.message);
    return { candidate: c, ok: true };
  } catch (err) {
    return { candidate: c, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Send every due reminder (or just list them when dryRun). Resend allows 10 requests a second. */
export async function runReminders({ dryRun = false }: { dryRun?: boolean } = {}) {
  const due = dueReminders(await loadReminderCandidates());
  if (dryRun) return { dryRun, due, results: [] as ReminderResult[] };

  const results: ReminderResult[] = [];
  for (const c of due) {
    results.push(await sendReminder(c));
    await new Promise((r) => setTimeout(r, 250));
  }
  return { dryRun, due, results };
}
