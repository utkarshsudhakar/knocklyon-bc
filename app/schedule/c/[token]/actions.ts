"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabase } from "../../_lib/supabase";
import {
  dateHasKnocklyonTeamMatch,
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

  await maybeSendConfirmationEmail(club.id);

  revalidatePath(`/schedule/c/${token}`);
  redirect(`/schedule/c/${token}?ok=home_booked`);
}

export async function proposeAwayDates(formData: FormData) {
  const token = (formData.get("token") as string) ?? "";
  const date1 = ((formData.get("date1") as string) ?? "").trim();
  const time1 = ((formData.get("time1") as string) ?? "").trim();
  const date2 = ((formData.get("date2") as string) ?? "").trim();
  const time2 = ((formData.get("time2") as string) ?? "").trim();
  const note = ((formData.get("note") as string) ?? "").trim() || null;

  if (!token) redirect(`/schedule/c/${token}?err=invalid`);
  if (!date1 || !date2) {
    redirect(`/schedule/c/${token}?err=need_two_dates`);
  }
  if (!time1 || !time2) {
    redirect(`/schedule/c/${token}?err=need_times`);
  }
  if (date1 === date2) {
    redirect(`/schedule/c/${token}?err=duplicate_dates`);
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
    const q = encodeURIComponent(conflicts.join(","));
    redirect(`/schedule/c/${token}?err=knocklyon_conflict&dates=${q}`);
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
    redirect(`/schedule/c/${token}?err=save_failed`);
  }

  // Save the note alongside the proposal
  await supabase
    .from("clubs")
    .update({ secretary_note: note })
    .eq("id", club.id);

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
