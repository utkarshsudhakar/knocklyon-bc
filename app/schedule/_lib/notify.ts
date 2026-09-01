import { getSupabase } from "./supabase";
import { confirmationEmailHtml } from "./email-templates";

function knocklyonLabel(teamName: string | null): string {
  return `Knocklyon${teamName ? ` ${teamName}` : ""}`;
}

function opponentLabel(clubName: string, teamName: string | null): string {
  return teamName ? `${clubName} ${teamName}` : clubName;
}

/**
 * Does the given Knocklyon team already have a confirmed match on that date?
 * Used to reject conflicting away-date proposals and manual admin overrides.
 */
export async function dateHasKnocklyonTeamMatch(
  teamId: string | null,
  date: string
): Promise<boolean> {
  if (!teamId || !date) return false;
  const supabase = getSupabase();

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id")
    .eq("knocklyon_team_id", teamId);
  const clubIds = (clubs ?? []).map((c) => c.id);
  if (clubIds.length === 0) return false;

  const { data: awayHit } = await supabase
    .from("fixtures")
    .select("id")
    .in("opponent_club_id", clubIds)
    .eq("confirmed_date", date)
    .eq("status", "confirmed")
    .limit(1);
  if ((awayHit?.length ?? 0) > 0) return true;

  const { data: slot } = await supabase
    .from("home_slots")
    .select("id")
    .eq("slot_date", date)
    .maybeSingle();
  if (!slot) return false;

  const { data: homeHit } = await supabase
    .from("fixtures")
    .select("id")
    .in("opponent_club_id", clubIds)
    .eq("confirmed_slot_id", slot.id)
    .eq("status", "confirmed")
    .limit(1);
  return (homeHit?.length ?? 0) > 0;
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
      "name, team_name, secretary_email, confirmation_email_sent_at, knocklyon_team_id, venue_location, venue_map_link, knocklyon_teams(name, division)"
    )
    .eq("id", clubId)
    .single<{
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
      "is_knocklyon_home, status, confirmed_date, confirmed_slot_id, match_time"
    )
    .eq("opponent_club_id", clubId);

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
        homeTime: home.match_time ?? "20:00",
        homeVenue: knocklyonHome,
        homeVenueMapLink: knocklyonHomeMap,
        awayDate,
        awayTime: away.match_time ?? null,
        awayVenue: club.venue_location ?? "",
        awayVenueMapLink: club.venue_map_link ?? "",
      }),
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
