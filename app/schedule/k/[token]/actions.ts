"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabase } from "../../_lib/supabase";
import { capacityForDate } from "../../_lib/config";

async function findTeamByToken(token: string) {
  if (!token) return null;
  const { data } = await getSupabase()
    .from("knocklyon_teams")
    .select("id, name, division, captain_name")
    .eq("access_token", token)
    .single();
  return data;
}

export async function captainAddDates(formData: FormData) {
  const token = ((formData.get("token") as string) ?? "").trim();
  const datesRaw = ((formData.get("dates") as string) ?? "").trim();
  if (!token) redirect(`/schedule/k/${token}?err=invalid`);
  if (!datesRaw) redirect(`/schedule/k/${token}?err=missing_date`);

  const dates = datesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (dates.length === 0) redirect(`/schedule/k/${token}?err=missing_date`);

  const team = await findTeamByToken(token);
  if (!team) redirect(`/schedule/k/${token}?err=invalid`);

  const supabase = getSupabase();
  let added = 0;
  let skipped = 0;

  for (const dateStr of dates) {
    const cap = capacityForDate(dateStr);
    if (cap < 1) {
      skipped++;
      continue;
    }

    // Find-or-create the venue date.
    let { data: slot } = await supabase
      .from("home_slots")
      .select("id")
      .eq("slot_date", dateStr)
      .maybeSingle();
    if (!slot) {
      const ins = await supabase
        .from("home_slots")
        .insert({ slot_date: dateStr, capacity: cap })
        .select("id")
        .single();
      if (ins.error || !ins.data) {
        skipped++;
        continue;
      }
      slot = ins.data;
    }

    const link = await supabase.from("team_home_availability").insert({
      knocklyon_team_id: team.id,
      home_slot_id: slot.id,
      match_time: "20:00",
    });
    if (link.error) {
      skipped++;
      continue;
    }
    added++;
  }

  revalidatePath(`/schedule/k/${token}`);
  redirect(
    `/schedule/k/${token}?ok=dates_added&n=${added}${skipped > 0 ? `&skipped=${skipped}` : ""}`
  );
}

export async function captainRemoveDate(formData: FormData) {
  const token = ((formData.get("token") as string) ?? "").trim();
  const slotId = ((formData.get("home_slot_id") as string) ?? "").trim();
  if (!token || !slotId) redirect(`/schedule/k/${token}?err=invalid`);

  const team = await findTeamByToken(token);
  if (!team) redirect(`/schedule/k/${token}?err=invalid`);

  const supabase = getSupabase();

  // Refuse if a match is already confirmed on this slot for this team.
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id")
    .eq("knocklyon_team_id", team.id);
  const clubIds = (clubs ?? []).map((c) => c.id);
  if (clubIds.length > 0) {
    const { data: booked } = await supabase
      .from("fixtures")
      .select("id")
      .in("opponent_club_id", clubIds)
      .eq("confirmed_slot_id", slotId)
      .eq("status", "confirmed")
      .limit(1);
    if ((booked?.length ?? 0) > 0) {
      redirect(`/schedule/k/${token}?err=has_booking`);
    }
  }

  await supabase
    .from("team_home_availability")
    .delete()
    .eq("knocklyon_team_id", team.id)
    .eq("home_slot_id", slotId);

  // Clean up the venue date if nothing references it and no bookings exist.
  const [{ data: remaining }, { data: anyBooking }] = await Promise.all([
    supabase
      .from("team_home_availability")
      .select("id")
      .eq("home_slot_id", slotId)
      .limit(1),
    supabase
      .from("fixtures")
      .select("id")
      .eq("confirmed_slot_id", slotId)
      .limit(1),
  ]);
  if ((remaining?.length ?? 0) === 0 && (anyBooking?.length ?? 0) === 0) {
    await supabase.from("home_slots").delete().eq("id", slotId);
  }

  revalidatePath(`/schedule/k/${token}`);
  redirect(`/schedule/k/${token}?ok=date_removed`);
}

