import { getSupabase } from "./supabase";
import { confirmationEmailHtml, captainHomeDatesAddedEmailHtml, secretaryFixtureUpdateEmailHtml, captainDatesOfferedEmailHtml, cupConfirmationEmailHtml, formatDateLong, formatTimeFriendly } from "./email-templates";
import { SITE_URL } from "../../site-url";
import { tooCloseDate } from "./gap";
import {
  generateIcs,
  googleCalendarLink,
  type CalendarEvent,
} from "./calendar";

function knocklyonLabel(teamName: string | null): string {
  return `Knocklyon${teamName ? ` ${teamName}` : ""}`;
}

function opponentLabel(clubName: string, teamName: string | null): string {
  return teamName ? `${clubName} ${teamName}` : clubName;
}

/**
 * Does the given Knocklyon team, or a team sharing players with it, already
 * have a confirmed match on that date?
 * Used to reject conflicting away-date proposals and manual admin overrides.
 */
/** The team plus every team linked to it because they share players. */
export async function linkedTeamIds(teamId: string | null): Promise<string[]> {
  if (!teamId) return [];
  const { data } = await getSupabase()
    .from("team_conflicts")
    .select("team_b")
    .eq("team_a", teamId);
  return [teamId, ...(data ?? []).map((r) => r.team_b as string)];
}

export async function findKnocklyonTeamMatchConflict(
  teamId: string | null,
  date: string
): Promise<{ teamId: string; name: string; linked: boolean } | null> {
  if (!teamId || !date) return null;
  const supabase = getSupabase();

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, knocklyon_team_id")
    .in("knocklyon_team_id", await linkedTeamIds(teamId));
  const teamByClub = new Map(
    (clubs ?? []).map((c) => [c.id as string, c.knocklyon_team_id as string])
  );
  const clubIds = [...teamByClub.keys()];
  if (clubIds.length === 0) return null;

  async function describe(opponentClubId: string) {
    const conflictTeamId = teamByClub.get(opponentClubId) ?? teamId!;
    const { data: team } = await supabase
      .from("knocklyon_teams")
      .select("name")
      .eq("id", conflictTeamId)
      .single();
    return {
      teamId: conflictTeamId,
      name: knocklyonLabel(team?.name ?? null),
      linked: conflictTeamId !== teamId,
    };
  }

  const { data: awayHit } = await supabase
    .from("fixtures")
    .select("opponent_club_id")
    .in("opponent_club_id", clubIds)
    .eq("confirmed_date", date)
    .eq("status", "confirmed")
    .limit(1);
  if (awayHit?.length) return describe(awayHit[0].opponent_club_id);

  const { data: slot } = await supabase
    .from("home_slots")
    .select("id")
    .eq("slot_date", date)
    .maybeSingle();
  if (!slot) return null;

  const { data: homeHit } = await supabase
    .from("fixtures")
    .select("opponent_club_id")
    .in("opponent_club_id", clubIds)
    .eq("confirmed_slot_id", slot.id)
    .eq("status", "confirmed")
    .limit(1);
  return homeHit?.length ? describe(homeHit[0].opponent_club_id) : null;
}

/** Dates (YYYY-MM-DD) where this team, or a team sharing players, has a confirmed match. */
export async function knocklyonBusyDates(
  teamId: string | null
): Promise<string[]> {
  if (!teamId) return [];
  const supabase = getSupabase();
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id")
    .in("knocklyon_team_id", await linkedTeamIds(teamId));
  const clubIds = (clubs ?? []).map((c) => c.id as string);
  if (clubIds.length === 0) return [];

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("confirmed_date, home_slots:confirmed_slot_id(slot_date)")
    .in("opponent_club_id", clubIds)
    .eq("status", "confirmed");

  const dates = new Set<string>();
  for (const f of (fixtures ?? []) as unknown as Array<{
    confirmed_date: string | null;
    home_slots: { slot_date: string } | null;
  }>) {
    if (f.confirmed_date) dates.add(f.confirmed_date);
    if (f.home_slots?.slot_date) dates.add(f.home_slots.slot_date);
  }
  return [...dates].sort();
}

export type ConfirmedMatch = {
  fixtureId: string;
  date: string;
  teamName: string;
  opponent: string;
};

/** Confirmed matches for this team and any team sharing players with it. */
export async function knocklyonConfirmedMatches(
  teamId: string | null
): Promise<ConfirmedMatch[]> {
  if (!teamId) return [];
  const supabase = getSupabase();
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name, team_name, knocklyon_teams(name)")
    .in("knocklyon_team_id", await linkedTeamIds(teamId));
  const byClub = new Map(
    ((clubs ?? []) as unknown as Array<{
      id: string;
      name: string;
      team_name: string | null;
      knocklyon_teams: { name: string } | null;
    }>).map((c) => [c.id, c])
  );
  if (byClub.size === 0) return [];

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("id, opponent_club_id, confirmed_date, home_slots:confirmed_slot_id(slot_date)")
    .in("opponent_club_id", [...byClub.keys()])
    .eq("status", "confirmed");

  const out: ConfirmedMatch[] = [];
  for (const f of (fixtures ?? []) as unknown as Array<{
    id: string;
    opponent_club_id: string;
    confirmed_date: string | null;
    home_slots: { slot_date: string } | null;
  }>) {
    const date = f.confirmed_date ?? f.home_slots?.slot_date ?? null;
    const club = byClub.get(f.opponent_club_id);
    if (!date || !club) continue;
    out.push({
      fixtureId: f.id,
      date,
      teamName: club.knocklyon_teams?.name ?? "this team",
      opponent: club.team_name ? `${club.name} ${club.team_name}` : club.name,
    });
  }
  return out;
}

/** A confirmed match on a different day but closer than MIN_GAP_DAYS to `date`. */
export async function findNearbyKnocklyonMatch(
  teamId: string | null,
  date: string
): Promise<ConfirmedMatch | null> {
  if (!date) return null;
  const matches = await knocklyonConfirmedMatches(teamId);
  return matches.find((m) => tooCloseDate(date, [m.date])) ?? null;
}

export async function dateHasKnocklyonTeamMatch(
  teamId: string | null,
  date: string
): Promise<boolean> {
  return (await findKnocklyonTeamMatchConflict(teamId, date)) !== null;
}

/**
 * If both fixtures for a club matchup are confirmed and we haven't yet sent
 * the "both confirmed" email, send it and mark the club so we never send it
 * twice. No-op otherwise.
 */
export async function maybeSendConfirmationEmail(clubId: string): Promise<void> {
  const supabase = getSupabase();

  const { data: club } = await supabase
    .from("clubs")
    .select(
      "name, team_name, secretary_email, confirmation_email_sent_at, knocklyon_team_id, venue_location, venue_map_link, competition, cup_round, knocklyon_teams(name, division)"
    )
    .eq("id", clubId)
    .single<{
      competition: string | null;
      cup_round: string | null;
      name: string;
      team_name: string | null;
      secretary_email: string;
      confirmation_email_sent_at: string | null;
      knocklyon_team_id: string | null;
      venue_location: string | null;
      venue_map_link: string | null;
      knocklyon_teams: { name: string; division: string | null } | null;
    }>();

  if (!club || club.confirmation_email_sent_at) return;

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select(
      "is_knocklyon_home, status, confirmed_date, confirmed_slot_id, match_time, secretary_confirmed_at"
    )
    .eq("opponent_club_id", clubId);

  if (club.competition === "cup") {
    await sendCupConfirmationEmail(clubId, club, fixtures?.[0] ?? null);
    return;
  }

  if (!fixtures || fixtures.length < 2) return;
  if (!fixtures.every((f) => f.status === "confirmed")) return;

  const home = fixtures.find((f) => f.is_knocklyon_home);
  const away = fixtures.find((f) => !f.is_knocklyon_home);
  if (!home?.confirmed_slot_id || !away?.confirmed_date) return;

  const { data: slot } = await supabase
    .from("home_slots")
    .select("slot_date")
    .eq("id", home.confirmed_slot_id)
    .single();

  const homeDate = slot?.slot_date;
  const awayDate = away.confirmed_date;
  if (!homeDate || !awayDate) return;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM ?? "onboarding@resend.dev";
  const knocklyonHome =
    process.env.KNOCKLYON_LOCATION ?? "Knocklyon Community Centre";
  const knocklyonHomeMap = process.env.KNOCKLYON_MAP_LINK ?? "";

  const kTeamName = club.knocklyon_teams?.name ?? null;
  const kTeamDivision = club.knocklyon_teams?.division ?? null;
  const knocklyon = knocklyonLabel(kTeamName);
  const opponent = opponentLabel(club.name, club.team_name);
  const divisionSuffix = kTeamDivision ? ` (${kTeamDivision})` : "";
  const matchup = `${knocklyon} vs ${opponent}${divisionSuffix}`;

  if (!apiKey) {
    console.log(
      "[Confirmation email: RESEND_API_KEY not set, would have emailed]",
      { to: club.secretary_email, homeDate, awayDate, matchup }
    );
    return;
  }

  // Build calendar events for both fixtures.
  const homeMatchTime = home.match_time ?? "20:00";
  const awayMatchTime = away.match_time ?? "19:00";
  const homeEvent: CalendarEvent = {
    uid: `kbc-home-${clubId}@knocklyonbc.ie`,
    title: `${knocklyon} vs ${opponent}`,
    date: homeDate,
    time: homeMatchTime,
    location: knocklyonHome,
    description: `League fixture: ${matchup}. Home for Knocklyon.`,
  };
  const awayEvent: CalendarEvent = {
    uid: `kbc-away-${clubId}@knocklyonbc.ie`,
    title: `${opponent} vs ${knocklyon}`,
    date: awayDate,
    time: awayMatchTime,
    location: club.venue_location ?? "",
    description: `League fixture: ${matchup}. Away for Knocklyon.`,
  };
  const icsContent = generateIcs([homeEvent, awayEvent], new Date());
  const homeGoogleCalLink = googleCalendarLink(homeEvent);
  const awayGoogleCalLink = googleCalendarLink(awayEvent);

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from,
      to: club.secretary_email,
      bcc: ["info@knocklyonbc.ie"],
      subject: `Fixtures confirmed: ${matchup}`,
      html: confirmationEmailHtml({
        clubName: club.name,
        knocklyonLabel: knocklyon,
        opponentLabel: opponent,
        division: kTeamDivision,
        homeDate,
        homeTime: homeMatchTime,
        homeVenue: knocklyonHome,
        homeVenueMapLink: knocklyonHomeMap,
        homeGoogleCalLink,
        awayDate,
        awayTime: awayMatchTime,
        awayVenue: club.venue_location ?? "",
        awayVenueMapLink: club.venue_map_link ?? "",
        awayGoogleCalLink,
      }),
      attachments: [
        {
          filename: "knocklyon-fixtures.ics",
          content: Buffer.from(icsContent).toString("base64"),
        },
      ],
    });

    if (result.error) {
      console.error("[Confirmation email] Resend API error:", result.error);
      return;
    }

    await supabase
      .from("clubs")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", clubId);

    console.log(
      "[Confirmation email] Sent to",
      club.secretary_email,
      "id:",
      result.data?.id
    );
  } catch (err) {
    console.error("[Confirmation email] Resend threw:", err);
  }
}

async function sendCupConfirmationEmail(
  clubId: string,
  club: {
    name: string; team_name: string | null; secretary_email: string;
    venue_location: string | null; venue_map_link: string | null; cup_round: string | null;
    knocklyon_teams: { name: string; division: string | null } | null;
  },
  fixture: {
    is_knocklyon_home: boolean; status: string; confirmed_date: string | null;
    confirmed_slot_id: string | null; match_time: string | null; secretary_confirmed_at: string | null;
  } | null,
): Promise<void> {
  if (!fixture || fixture.status !== "confirmed") return;
  const isHome = fixture.is_knocklyon_home;
  if (isHome && !fixture.secretary_confirmed_at) return;

  let date = fixture.confirmed_date;
  if (isHome && fixture.confirmed_slot_id) {
    const { data: slot } = await getSupabase()
      .from("home_slots").select("slot_date").eq("id", fixture.confirmed_slot_id).single();
    date = slot?.slot_date ?? null;
  }
  if (!date) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[Cup confirmation email: RESEND_API_KEY not set, would have emailed]", { to: club.secretary_email, date });
    return;
  }

  const knocklyon = knocklyonLabel(club.knocklyon_teams?.name ?? null);
  const opponent = opponentLabel(club.name, club.team_name);
  const time = fixture.match_time ?? (isHome ? "20:00" : "19:00");
  const venue = isHome ? (process.env.KNOCKLYON_LOCATION ?? "Knocklyon Community Centre") : (club.venue_location ?? "");
  const mapLink = isHome ? (process.env.KNOCKLYON_MAP_LINK ?? "") : (club.venue_map_link ?? "");
  const title = isHome ? `${knocklyon} vs ${opponent}` : `${opponent} vs ${knocklyon}`;
  const roundText = club.cup_round ? ` ${club.cup_round}` : "";
  const event: CalendarEvent = {
    uid: `kbc-cup-${clubId}@knocklyonbc.ie`,
    title, date, time, location: venue,
    description: `Cup${roundText}: ${title}. ${isHome ? "Home" : "Away"} for Knocklyon.`,
  };

  try {
    const { Resend } = await import("resend");
    const result = await new Resend(apiKey).emails.send({
      from: process.env.CONTACT_FROM ?? "onboarding@resend.dev",
      to: club.secretary_email,
      bcc: ["info@knocklyonbc.ie"],
      subject: `Cup${roundText} confirmed: ${title}`,
      html: cupConfirmationEmailHtml({
        clubName: club.name, knocklyonLabel: knocklyon, opponentLabel: opponent,
        round: club.cup_round, isHome, date, time, venue, mapLink,
        googleCalLink: googleCalendarLink(event),
      }),
      attachments: [{
        filename: "knocklyon-cup-match.ics",
        content: Buffer.from(generateIcs([event], new Date())).toString("base64"),
      }],
    });
    if (result.error) {
      console.error("[Cup confirmation email] Resend API error:", result.error);
      return;
    }
    await getSupabase().from("clubs").update({ confirmation_email_sent_at: new Date().toISOString() }).eq("id", clubId);
  } catch (err) {
    console.error("[Cup confirmation email] Resend threw:", err);
  }
}

/** Tell the club inbox that a captain added home dates. Never throws. */
export async function notifyClubHomeDatesAdded(team: {
  name: string; division: string | null; captain_name: string | null;
}, dates: string[]): Promise<void> {
  if (dates.length === 0) return;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const label = knocklyonLabel(team.name);
  try {
    const { Resend } = await import("resend");
    const result = await new Resend(apiKey).emails.send({
      from: process.env.CONTACT_FROM ?? "onboarding@resend.dev",
      to: "info@knocklyonbc.ie",
      subject: `Home dates added: ${label}`,
      text: `${team.captain_name ?? "The captain"}, captain of ${label}, has added ${dates.length === 1 ? "a home date" : `${dates.length} home dates`}:\n\n${dates.map(formatDateLong).join("\n")}`,
      html: captainHomeDatesAddedEmailHtml({
        teamLabel: label, division: team.division, captainName: team.captain_name, dates,
      }),
    });
    if (result.error) console.error("[Home dates email] Resend API error:", result.error);
  } catch (err) {
    console.error("[Home dates email] Resend threw:", err);
  }
}

type ClubMatchup = {
  name: string; team_name: string | null;
  knocklyon_teams: { name: string; division: string | null } | null;
};

async function loadMatchup(clubId: string) {
  const { data } = await getSupabase()
    .from("clubs")
    .select("name, team_name, knocklyon_teams(name, division)")
    .eq("id", clubId)
    .single<ClubMatchup>();
  if (!data) return null;
  const division = data.knocklyon_teams?.division;
  return {
    club: data.name,
    matchup: `${knocklyonLabel(data.knocklyon_teams?.name ?? null)} vs ${opponentLabel(data.name, data.team_name)}${division ? ` (${division})` : ""}`,
  };
}

async function sendClubEmail(subject: string, html: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const { Resend } = await import("resend");
    const result = await new Resend(apiKey).emails.send({
      from: process.env.CONTACT_FROM ?? "onboarding@resend.dev",
      to: "info@knocklyonbc.ie",
      subject, html, text,
    });
    if (result.error) console.error("[Club email] Resend API error:", result.error);
  } catch (err) {
    console.error("[Club email] Resend threw:", err);
  }
}

/** Tell the club inbox that an opposing secretary picked one of our home dates. Never throws. */
export async function notifyClubHomeDatePicked(clubId: string, slotId: string, time: string): Promise<void> {
  try {
    const [m, { data: slot }] = await Promise.all([
      loadMatchup(clubId),
      getSupabase().from("home_slots").select("slot_date").eq("id", slotId).single(),
    ]);
    if (!m || !slot) return;
    const rows = [
      { label: "Home date", value: formatDateLong(slot.slot_date) },
      { label: "Match time", value: formatTimeFriendly(time) },
    ];
    await sendClubEmail(
      `Home date picked: ${m.matchup}`,
      secretaryFixtureUpdateEmailHtml({ kind: "home_picked", matchup: m.matchup, secretaryClub: m.club, rows }),
      `${m.club} has picked a home date for ${m.matchup}.\n\n${rows.map((r) => `${r.label}: ${r.value}`).join("\n")}`,
    );
  } catch (err) {
    console.error("[Club email] home date picked failed:", err);
  }
}

/** Tell the club inbox that an opposing secretary offered away dates. Never throws. */
export async function notifyClubAwayDatesProposed(
  clubId: string,
  proposed: { date: string; time: string }[],
  note: string | null,
): Promise<void> {
  try {
    const m = await loadMatchup(clubId);
    if (!m) return;
    const rows = proposed.map((d, i) => ({
      label: `Option ${i + 1}`,
      value: `${formatDateLong(d.date)} at ${formatTimeFriendly(d.time)}`,
    }));
    await sendClubEmail(
      `Away dates offered: ${m.matchup}`,
      secretaryFixtureUpdateEmailHtml({ kind: "away_proposed", matchup: m.matchup, secretaryClub: m.club, rows, note }),
      `${m.club} has offered away dates for ${m.matchup}.\n\n${rows.map((r) => `${r.label}: ${r.value}`).join("\n")}${note ? `\n\nNote: ${note}` : ""}`,
    );
  } catch (err) {
    console.error("[Club email] away dates proposed failed:", err);
  }
}

/** Email the Knocklyon captain that dates were offered for their away match. Never throws. */
export async function notifyCaptainAwayDatesOffered(
  clubId: string,
  proposed: { date: string; time: string }[],
  note: string | null = null,
): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;
    const { data: club } = await getSupabase()
      .from("clubs")
      .select("name, team_name, competition, cup_round, knocklyon_teams(name, division, captain_name, captain_email, access_token)")
      .eq("id", clubId)
      .single<{
        name: string; team_name: string | null; competition: string | null; cup_round: string | null;
        knocklyon_teams: { name: string; division: string | null; captain_name: string | null; captain_email: string | null; access_token: string } | null;
      }>();
    const team = club?.knocklyon_teams;
    if (!club || !team?.captain_email) return;
    const opponent = opponentLabel(club.name, club.team_name);
    const isCup = club.competition === "cup";
    const rows = proposed.map((d, i) => ({
      label: `Option ${i + 1}`,
      value: `${formatDateLong(d.date)} at ${formatTimeFriendly(d.time)}`,
    }));
    const link = `${SITE_URL}/schedule/k/${team.access_token}`;
    const { Resend } = await import("resend");
    const result = await new Resend(apiKey).emails.send({
      from: process.env.CONTACT_FROM ?? "onboarding@resend.dev",
      to: team.captain_email,
      subject: `Please confirm your ${isCup ? `cup${club.cup_round ? ` ${club.cup_round}` : ""} ` : ""}away match date: ${knocklyonLabel(team.name)} vs ${opponent}`,
      html: captainDatesOfferedEmailHtml({ captainName: team.captain_name, teamLabel: knocklyonLabel(team.name), opponent, rows, link, note, cupRound: isCup ? (club.cup_round ?? "") : undefined }),
      text: `${opponent} has offered two dates for your${isCup ? " cup" : ""} away match:\n\n${rows.map((r) => `${r.label}: ${r.value}`).join("\n")}${note ? `\n\nNote from ${opponent}: ${note}` : ""}\n\nConfirm one here: ${link}\n\nIf neither works, please contact your match secretary.`,
    });
    if (result.error) console.error("[Captain dates email] Resend API error:", result.error);
  } catch (err) {
    console.error("[Captain dates email] failed:", err);
  }
}

/** Tell the club inbox that a captain confirmed an offered away date. Never throws. */
export async function notifyClubCaptainConfirmed(clubId: string, date: string, time: string | null): Promise<void> {
  try {
    const m = await loadMatchup(clubId);
    if (!m) return;
    const rows = [
      { label: "Away date", value: formatDateLong(date) },
      { label: "Match time", value: formatTimeFriendly(time) },
    ];
    await sendClubEmail(
      `Captain confirmed away date: ${m.matchup}`,
      secretaryFixtureUpdateEmailHtml({ kind: "captain_confirmed", matchup: m.matchup, secretaryClub: m.club, rows }),
      `The captain confirmed the away date for ${m.matchup}.\n\n${rows.map((r) => `${r.label}: ${r.value}`).join("\n")}`,
    );
  } catch (err) {
    console.error("[Club email] captain confirmed failed:", err);
  }
}

/** Tell the club inbox that an opposing secretary confirmed a cup home date. Never throws. */
export async function notifyClubCupDateConfirmed(clubId: string, date: string, time: string | null, note: string | null): Promise<void> {
  try {
    const m = await loadMatchup(clubId);
    if (!m) return;
    const rows = [
      { label: "Cup date", value: formatDateLong(date) },
      { label: "Match time", value: formatTimeFriendly(time) },
    ];
    await sendClubEmail(
      `Cup date confirmed: ${m.matchup}`,
      secretaryFixtureUpdateEmailHtml({ kind: "cup_confirmed", matchup: m.matchup, secretaryClub: m.club, rows, note }),
      `${m.club} has confirmed the cup date for ${m.matchup}.\n\n${rows.map((r) => `${r.label}: ${r.value}`).join("\n")}${note ? `\n\nNote: ${note}` : ""}`,
    );
  } catch (err) {
    console.error("[Club email] cup date confirmed failed:", err);
  }
}
