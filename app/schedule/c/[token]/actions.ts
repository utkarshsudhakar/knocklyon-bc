"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabase } from "../../_lib/supabase";
import {
  dateHasKnocklyonTeamMatch,
  notifyClubAwayDatesProposed,
  notifyCaptainAwayDatesOffered,
  notifyClubHomeDatePicked,
  notifyClubCupDateConfirmed,
  maybeSendConfirmationEmail,
} from "../../_lib/notify";

async function findClubByToken(token: string) {
  if (!token) return null;
  const { data } = await getSupabase()
    .from("clubs")
    .select("id, knocklyon_team_id")
    .eq("access_token", token)
    .single();
  return data;
}

export async function bookHomeDate(formData: FormData) {
  const token = (formData.get("token") as string) ?? "";
  const fixtureId = (formData.get("fixture_id") as string) ?? "";
  const slotId = (formData.get("slot_id") as string) ?? "";

  if (!token || !fixtureId || !slotId) {
    redirect(`/schedule/c/${token}?err=invalid`);
  }

  const supabase = getSupabase();

  const club = await findClubByToken(token);
  if (!club) redirect(`/schedule/c/${token}?err=invalid`);

  const { data: fixture } = await supabase
    .from("fixtures")
    .select("id, opponent_club_id, is_knocklyon_home, status")
    .eq("id", fixtureId)
    .single();

  if (
    !fixture ||
    fixture.opponent_club_id !== club.id ||
    !fixture.is_knocklyon_home
  ) {
    redirect(`/schedule/c/${token}?err=invalid`);
  }

  const { error } = await supabase.rpc("book_slot", {
    p_fixture_id: fixtureId,
    p_slot_id: slotId,
  });

  if (error) {
    const code = error.message?.includes("slot_full")
      ? "slot_full"
      : error.message?.includes("team_conflict")
        ? "team_conflict"
        : error.message?.includes("already_confirmed")
          ? "already_confirmed"
          : "book_failed";
    redirect(`/schedule/c/${token}?err=${code}`);
  }

  // Copy the slot's per-team match_time onto the fixture (default 20:00 if none)
  if (club.knocklyon_team_id) {
    const { data: availability } = await supabase
      .from("team_home_availability")
      .select("match_time")
      .eq("knocklyon_team_id", club.knocklyon_team_id)
      .eq("home_slot_id", slotId)
      .single();
    const time = availability?.match_time ?? "20:00";
    await supabase
      .from("fixtures")
      .update({ match_time: time })
      .eq("id", fixtureId);
  }

  const { data: booked } = await supabase
    .from("fixtures")
    .select("match_time")
    .eq("id", fixtureId)
    .single();
  await notifyClubHomeDatePicked(club.id, slotId, booked?.match_time ?? "20:00");
  await maybeSendConfirmationEmail(club.id);

  revalidatePath(`/schedule/c/${token}`);
  redirect(`/schedule/c/${token}?ok=home_booked`);
}

export type ProposeState = { error?: string };

function longDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function proposeAwayDates(
  _prev: ProposeState,
  formData: FormData
): Promise<ProposeState> {
  const token = (formData.get("token") as string) ?? "";
  const date1 = ((formData.get("date1") as string) ?? "").trim();
  const time1 = ((formData.get("time1") as string) ?? "").trim();
  const date2 = ((formData.get("date2") as string) ?? "").trim();
  const time2 = ((formData.get("time2") as string) ?? "").trim();
  const note = ((formData.get("note") as string) ?? "").trim() || null;
  const venueLocation = ((formData.get("venue_location") as string) ?? "").trim();
  const venueMapLink = ((formData.get("venue_map_link") as string) ?? "").trim() || null;

  if (!token) redirect(`/schedule/c/${token}?err=invalid`);
  if (!venueLocation) {
    return {
      error:
        "Please enter your venue name so our captain knows where the match is.",
    };
  }
  if (!date1 || !date2) {
    return { error: "Please pick two dates for your away proposal." };
  }
  if (!time1 || !time2) {
    return { error: "Please pick a start time for each proposed date." };
  }
  if (date1 === date2) {
    return { error: "Please pick two different dates." };
  }

  const supabase = getSupabase();
  const club = await findClubByToken(token);
  if (!club) redirect(`/schedule/c/${token}?err=invalid`);

  const { data: fixture } = await supabase
    .from("fixtures")
    .select("id, status")
    .eq("opponent_club_id", club.id)
    .eq("is_knocklyon_home", false)
    .single();

  if (!fixture) redirect(`/schedule/c/${token}?err=invalid`);
  if (fixture.status === "confirmed") {
    redirect(`/schedule/c/${token}?err=already_confirmed`);
  }

  const conflicts: string[] = [];
  for (const d of [date1, date2]) {
    if (await dateHasKnocklyonTeamMatch(club.knocklyon_team_id, d)) {
      conflicts.push(d);
    }
  }

  if (conflicts.length > 0) {
    return {
      error: `Sorry, Knocklyon already has a match scheduled on ${conflicts
        .map(longDate)
        .join(" and ")}. Please pick another date.`,
    };
  }

  const proposed = [
    { date: date1, time: time1 },
    { date: date2, time: time2 },
  ];

  const { error } = await supabase
    .from("fixtures")
    .update({ proposed_dates: proposed })
    .eq("id", fixture.id);

  if (error) {
    console.error("[proposeAwayDates] update error:", error);
    return { error: "Something went wrong saving your proposal. Please try again." };
  }

  // Save the note alongside the proposal
  await supabase
    .from("clubs")
    .update({
      secretary_note: note,
      venue_location: venueLocation,
      venue_map_link: venueMapLink,
    })
    .eq("id", club.id);

  await notifyClubAwayDatesProposed(club.id, proposed, note);
  await notifyCaptainAwayDatesOffered(club.id, proposed, note);

  revalidatePath(`/schedule/c/${token}`);
  redirect(`/schedule/c/${token}?ok=away_proposed`);
}

export async function saveVenueDetails(formData: FormData) {
  const token = (formData.get("token") as string) ?? "";
  const location = ((formData.get("location") as string) ?? "").trim() || null;
  const mapLink =
    ((formData.get("map_link") as string) ?? "").trim() || null;

  if (!token) redirect(`/schedule/c/${token}?err=invalid`);

  const club = await findClubByToken(token);
  if (!club) redirect(`/schedule/c/${token}?err=invalid`);

  await getSupabase()
    .from("clubs")
    .update({ venue_location: location, venue_map_link: mapLink })
    .eq("id", club.id);

  revalidatePath(`/schedule/c/${token}`);
  redirect(`/schedule/c/${token}?ok=venue_saved`);
}

export async function saveSecretaryNote(formData: FormData) {
  const token = (formData.get("token") as string) ?? "";
  const note = ((formData.get("note") as string) ?? "").trim() || null;

  if (!token) redirect(`/schedule/c/${token}?err=invalid`);

  const club = await findClubByToken(token);
  if (!club) redirect(`/schedule/c/${token}?err=invalid`);

  await getSupabase()
    .from("clubs")
    .update({ secretary_note: note })
    .eq("id", club.id);

  revalidatePath(`/schedule/c/${token}`);
  redirect(`/schedule/c/${token}?ok=note_saved`);
}

export async function confirmCupHomeDate(formData: FormData) {
  const token = (formData.get("token") as string) ?? "";
  const note = ((formData.get("note") as string) ?? "").trim() || null;
  if (!token) redirect(`/schedule/c/${token}?err=invalid`);

  const supabase = getSupabase();
  const { data: club } = await supabase
    .from("clubs")
    .select("id, competition")
    .eq("access_token", token)
    .single();
  if (!club || club.competition !== "cup") redirect(`/schedule/c/${token}?err=invalid`);

  const { data: fixture } = await supabase
    .from("fixtures")
    .select("id, status, match_time, secretary_confirmed_at, home_slots:confirmed_slot_id(slot_date)")
    .eq("opponent_club_id", club.id)
    .eq("is_knocklyon_home", true)
    .single<{
      id: string;
      status: string;
      match_time: string | null;
      secretary_confirmed_at: string | null;
      home_slots: { slot_date: string } | null;
    }>();
  const date = fixture?.home_slots?.slot_date;
  if (!fixture || fixture.status !== "confirmed" || !date) {
    redirect(`/schedule/c/${token}?err=invalid`);
  }
  if (fixture.secretary_confirmed_at) {
    redirect(`/schedule/c/${token}?err=already_confirmed`);
  }

  const { error } = await supabase
    .from("fixtures")
    .update({ secretary_confirmed_at: new Date().toISOString() })
    .eq("id", fixture.id)
    .is("secretary_confirmed_at", null);
  if (error) {
    console.error("[confirmCupHomeDate] update error:", error);
    redirect(`/schedule/c/${token}?err=save_failed`);
  }

  await supabase.from("clubs").update({ secretary_note: note }).eq("id", club.id);
  await notifyClubCupDateConfirmed(club.id, date, fixture.match_time, note);
  await maybeSendConfirmationEmail(club.id);

  revalidatePath(`/schedule/c/${token}`);
  redirect(`/schedule/c/${token}?ok=cup_confirmed`);
}
