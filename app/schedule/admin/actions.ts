"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSupabase } from "../_lib/supabase";
import {
  dateHasKnocklyonTeamMatch,
  maybeSendConfirmationEmail,
} from "../_lib/notify";
import { inviteEmailHtml } from "../_lib/email-templates";

const COOKIE_NAME = "kbc_admin";
const COOKIE_MAX_AGE_SECS = 60 * 60 * 24 * 7;

async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === "1";
}

async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("Not authorised");
  }
}

async function knocklyonTeamIdForFixture(
  fixtureId: string
): Promise<string | null> {
  const { data } = await getSupabase()
    .from("fixtures")
    .select("opponent_club_id, clubs(knocklyon_team_id)")
    .eq("id", fixtureId)
    .single<{
      opponent_club_id: string;
      clubs: { knocklyon_team_id: string | null } | null;
    }>();
  return data?.clubs?.knocklyon_team_id ?? null;
}

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = (formData.get("password") as string) ?? "";
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return { error: "ADMIN_PASSWORD is not configured on the server." };
  }
  if (password !== expected) {
    return { error: "Incorrect password." };
  }

  const store = await cookies();
  store.set(COOKIE_NAME, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/schedule",
    maxAge: COOKIE_MAX_AGE_SECS,
  });

  redirect("/schedule/admin");
}

export async function logout() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  redirect("/schedule/admin");
}

export type FormState = { error?: string; ok?: boolean };

// ── Knocklyon teams ────────────────────────────────────────────────────────

export async function addKnocklyonTeam(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const name = ((formData.get("name") as string) ?? "").trim();
  const division =
    ((formData.get("division") as string) ?? "").trim() || null;
  const displayName =
    ((formData.get("display_name") as string) ?? "").trim() || null;

  if (!name) return { error: "Team name is required (e.g. M1)." };

  const { error } = await getSupabase()
    .from("knocklyon_teams")
    .insert({ name, division, display_name: displayName });

  if (error) return { error: error.message };

  revalidatePath("/schedule/admin");
  return { ok: true };
}

export async function setMatchTime(formData: FormData) {
  await requireAdmin();
  const fixtureId = (formData.get("fixture_id") as string) ?? "";
  const time = ((formData.get("time") as string) ?? "").trim() || null;
  if (!fixtureId) return;

  await getSupabase()
    .from("fixtures")
    .update({ match_time: time })
    .eq("id", fixtureId);

  revalidatePath("/schedule/admin");
}

export async function deleteKnocklyonTeam(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) return;

  const supabase = getSupabase();

  // Are any clubs still attached to this team?
  const { data: attached } = await supabase
    .from("clubs")
    .select("id")
    .eq("knocklyon_team_id", id)
    .limit(1);

  if ((attached?.length ?? 0) > 0) {
    redirect("/schedule/admin?msg=team_has_clubs");
  }

  await supabase.from("knocklyon_teams").delete().eq("id", id);
  revalidatePath("/schedule/admin");
}

// ── Opposing clubs ─────────────────────────────────────────────────────────

export async function addClub(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const knocklyonTeamId =
    ((formData.get("knocklyon_team_id") as string) ?? "").trim();
  const name = ((formData.get("name") as string) ?? "").trim();
  const teamName = ((formData.get("team_name") as string) ?? "").trim() || null;
  const email = ((formData.get("email") as string) ?? "").trim();

  if (!knocklyonTeamId) {
    return { error: "Please pick which Knocklyon team this matchup is for." };
  }
  if (!name || !email) {
    return { error: "Club name and secretary email are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = getSupabase();
  const accessToken = randomBytes(24).toString("base64url");

  const { data: club, error: clubErr } = await supabase
    .from("clubs")
    .insert({
      name,
      team_name: teamName,
      secretary_email: email,
      knocklyon_team_id: knocklyonTeamId,
      access_token: accessToken,
    })
    .select()
    .single();

  if (clubErr || !club) {
    return { error: clubErr?.message ?? "Failed to add club." };
  }

  const { error: fixErr } = await supabase.from("fixtures").insert([
    { opponent_club_id: club.id, is_knocklyon_home: true },
    { opponent_club_id: club.id, is_knocklyon_home: false },
  ]);

  if (fixErr) {
    return {
      error: `Club added but fixture generation failed: ${fixErr.message}. Delete the club and retry.`,
    };
  }

  revalidatePath("/schedule/admin");
  return { ok: true };
}

export async function deleteClub(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) return;
  await getSupabase().from("clubs").delete().eq("id", id);
  revalidatePath("/schedule/admin");
}

// ── Home slots (per-team availability against shared venue dates) ─────────

export async function addTeamSlot(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const teamId = ((formData.get("knocklyon_team_id") as string) ?? "").trim();
  const slotDate = ((formData.get("slot_date") as string) ?? "").trim();
  const capacityRaw = ((formData.get("capacity") as string) ?? "").trim();
  const capacity = parseInt(capacityRaw, 10);
  const matchTime =
    ((formData.get("match_time") as string) ?? "").trim() || "20:00";

  if (!teamId) return { error: "Missing Knocklyon team." };
  if (!slotDate) return { error: "Date is required." };
  if (!Number.isFinite(capacity) || capacity < 1) {
    return { error: "Capacity must be at least 1." };
  }

  const supabase = getSupabase();

  let { data: slot } = await supabase
    .from("home_slots")
    .select("id, capacity")
    .eq("slot_date", slotDate)
    .maybeSingle();

  if (!slot) {
    const insertRes = await supabase
      .from("home_slots")
      .insert({ slot_date: slotDate, capacity })
      .select("id, capacity")
      .single();
    if (insertRes.error || !insertRes.data) {
      return {
        error: insertRes.error?.message ?? "Failed to add venue date.",
      };
    }
    slot = insertRes.data;
  }

  const linkRes = await supabase.from("team_home_availability").insert({
    knocklyon_team_id: teamId,
    home_slot_id: slot.id,
    match_time: matchTime,
  });

  if (linkRes.error) {
    if (linkRes.error.code === "23505") {
      return { error: "This team is already available on that date." };
    }
    return { error: linkRes.error.message };
  }

  revalidatePath("/schedule/admin");
  return { ok: true };
}

export async function setTeamSlotTime(formData: FormData) {
  await requireAdmin();
  const teamId = ((formData.get("knocklyon_team_id") as string) ?? "").trim();
  const slotId = ((formData.get("home_slot_id") as string) ?? "").trim();
  const time = ((formData.get("match_time") as string) ?? "").trim();
  if (!teamId || !slotId || !time) return;

  await getSupabase()
    .from("team_home_availability")
    .update({ match_time: time })
    .eq("knocklyon_team_id", teamId)
    .eq("home_slot_id", slotId);

  revalidatePath("/schedule/admin");
}

export async function removeTeamSlot(formData: FormData) {
  await requireAdmin();
  const teamId = ((formData.get("knocklyon_team_id") as string) ?? "").trim();
  const slotId = ((formData.get("home_slot_id") as string) ?? "").trim();
  if (!teamId || !slotId) return;

  const supabase = getSupabase();

  await supabase
    .from("team_home_availability")
    .delete()
    .eq("knocklyon_team_id", teamId)
    .eq("home_slot_id", slotId);

  // If no team is available on this venue date anymore AND nothing is booked
  // against it, tidy it away.
  const [{ data: remaining }, { data: booked }] = await Promise.all([
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

  if ((remaining?.length ?? 0) === 0 && (booked?.length ?? 0) === 0) {
    await supabase.from("home_slots").delete().eq("id", slotId);
  }

  revalidatePath("/schedule/admin");
}

// ── Fixture actions ────────────────────────────────────────────────────────

export async function setAwayDate(formData: FormData) {
  await requireAdmin();
  const fixtureId = formData.get("fixture_id") as string;
  const date = ((formData.get("date") as string) ?? "").trim();
  const time = ((formData.get("time") as string) ?? "").trim() || null;
  if (!fixtureId || !date) return;

  const teamId = await knocklyonTeamIdForFixture(fixtureId);
  if (await dateHasKnocklyonTeamMatch(teamId, date)) {
    redirect(
      `/schedule/admin?msg=away_conflict&date=${encodeURIComponent(date)}`
    );
  }

  const supabase = getSupabase();
  const { data: fixture } = await supabase
    .from("fixtures")
    .update({
      confirmed_date: date,
      match_time: time,
      status: "confirmed",
      proposed_dates: null,
    })
    .eq("id", fixtureId)
    .eq("is_knocklyon_home", false)
    .select("opponent_club_id")
    .single();

  if (fixture) {
    await maybeSendConfirmationEmail(fixture.opponent_club_id);
  }

  revalidatePath("/schedule/admin");
}

export async function acceptProposedDate(formData: FormData) {
  await requireAdmin();
  const fixtureId = formData.get("fixture_id") as string;
  const date = ((formData.get("date") as string) ?? "").trim();
  const time = ((formData.get("time") as string) ?? "").trim() || null;
  if (!fixtureId || !date) return;

  const teamId = await knocklyonTeamIdForFixture(fixtureId);
  if (await dateHasKnocklyonTeamMatch(teamId, date)) {
    redirect(
      `/schedule/admin?msg=away_conflict&date=${encodeURIComponent(date)}`
    );
  }

  const supabase = getSupabase();
  const { data: fixture } = await supabase
    .from("fixtures")
    .update({
      confirmed_date: date,
      match_time: time,
      status: "confirmed",
      proposed_dates: null,
    })
    .eq("id", fixtureId)
    .eq("is_knocklyon_home", false)
    .select("opponent_club_id")
    .single();

  if (fixture) {
    await maybeSendConfirmationEmail(fixture.opponent_club_id);
  }

  revalidatePath("/schedule/admin");
}

export async function resetFixture(formData: FormData) {
  await requireAdmin();
  const fixtureId = formData.get("fixture_id") as string;
  if (!fixtureId) return;

  const supabase = getSupabase();

  const { data: fixture } = await supabase
    .from("fixtures")
    .update({
      status: "awaiting_date",
      confirmed_slot_id: null,
      confirmed_date: null,
      proposed_dates: null,
      match_time: null,
    })
    .eq("id", fixtureId)
    .select("opponent_club_id")
    .single();

  if (fixture) {
    await supabase
      .from("clubs")
      .update({ confirmation_email_sent_at: null })
      .eq("id", fixture.opponent_club_id);
  }

  revalidatePath("/schedule/admin");
}

// ── Invite email ───────────────────────────────────────────────────────────

async function currentSiteUrl(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}


export async function sendInvite(formData: FormData) {
  await requireAdmin();
  const clubId = formData.get("id") as string;
  if (!clubId) return;

  const { data: club } = await getSupabase()
    .from("clubs")
    .select(
      "name, team_name, secretary_email, access_token, knocklyon_teams(name, division)"
    )
    .eq("id", clubId)
    .single<{
      name: string;
      team_name: string | null;
      secretary_email: string;
      access_token: string;
      knocklyon_teams: { name: string; division: string | null } | null;
    }>();

  if (!club) {
    redirect("/schedule/admin?msg=invite_failed&reason=club_not_found");
  }

  const siteUrl = await currentSiteUrl();
  const link = `${siteUrl}/schedule/c/${club.access_token}`;

  const knocklyonLabel = `Knocklyon${
    club.knocklyon_teams?.name ? ` ${club.knocklyon_teams.name}` : ""
  }`;
  const opponentLabel = club.team_name
    ? `${club.name} ${club.team_name}`
    : club.name;
  const division = club.knocklyon_teams?.division ?? null;
  const divisionSuffix = division ? ` (${division})` : "";
  const matchup = `${knocklyonLabel} vs ${opponentLabel}${divisionSuffix}`;

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.CONTACT_FROM ?? "onboarding@resend.dev";

  if (!apiKey) {
    console.log(
      "[Schedule invite: RESEND_API_KEY not set, would have emailed]",
      { to: club.secretary_email, link, matchup }
    );
    redirect(
      `/schedule/admin?msg=invite_logged&club=${encodeURIComponent(club.name)}`
    );
  }

  let sent = false;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from: fromEmail,
      to: club.secretary_email,
      bcc: ["info@knocklyonbc.ie"],
      subject: `Schedule your fixtures: ${matchup}`,
      html: inviteEmailHtml({
        clubName: club.name,
        knocklyonLabel,
        opponentLabel,
        division,
        link,
      }),
    });

    if (result.error) {
      console.error("[Schedule invite] Resend API error:", result.error);
    } else {
      console.log(
        "[Schedule invite] Sent to",
        club.secretary_email,
        "id:",
        result.data?.id
      );
      sent = true;
    }
  } catch (err) {
    console.error("[Schedule invite] Resend threw:", err);
  }

  const clubParam = encodeURIComponent(club.name);
  redirect(
    sent
      ? `/schedule/admin?msg=invite_sent&club=${clubParam}`
      : `/schedule/admin?msg=invite_failed&club=${clubParam}`
  );
}
