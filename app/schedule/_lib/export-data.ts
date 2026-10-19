import { getSupabase } from "./supabase";
import {
  buildExportItem,
  classifyExports,
  isExportable,
  readCurrentSeasonFolder,
  type PublishItem,
} from "./export-core";

export async function loadPublishPlan(): Promise<{
  folder: string | null;
  items: PublishItem[];
}> {
  const folder = await readCurrentSeasonFolder();
  if (!folder) return { folder: null, items: [] };

  const supabase = getSupabase();
  const [{ data: teams }, { data: clubs }, { data: fixtures }] =
    await Promise.all([
      supabase.from("knocklyon_teams").select("id, name, display_name"),
      supabase
        .from("clubs")
        .select(
          "id, name, team_name, knocklyon_team_id, venue_location, venue_map_link, competition"
        ),
      supabase
        .from("fixtures")
        .select(
          "id, opponent_club_id, is_knocklyon_home, status, confirmed_slot_id, confirmed_date, match_time, secretary_confirmed_at"
        )
        .eq("status", "confirmed"),
    ]);

  const teamById = new Map((teams ?? []).map((t) => [t.id as string, t]));
  const clubById = new Map((clubs ?? []).map((c) => [c.id as string, c]));

  const slotIds = (fixtures ?? [])
    .map((f) => f.confirmed_slot_id as string | null)
    .filter((id): id is string => Boolean(id));
  const slotDate = new Map<string, string>();
  if (slotIds.length > 0) {
    const { data: slots } = await supabase
      .from("home_slots")
      .select("id, slot_date")
      .in("id", slotIds);
    for (const s of slots ?? []) slotDate.set(s.id as string, s.slot_date as string);
  }

  const built = [];
  for (const f of fixtures ?? []) {
    const club = clubById.get(f.opponent_club_id as string);
    if (!club || !isExportable(f, club)) continue;
    const team = club.knocklyon_team_id
      ? teamById.get(club.knocklyon_team_id as string)
      : undefined;
    if (!team) continue;

    const date = f.is_knocklyon_home
      ? f.confirmed_slot_id
        ? slotDate.get(f.confirmed_slot_id as string) ?? null
        : null
      : (f.confirmed_date as string | null);
    if (!date) continue;

    const teamName = (team.display_name ?? team.name) as string;
    built.push({
      ...buildExportItem({
        fixtureId: f.id as string,
        isHome: Boolean(f.is_knocklyon_home),
        matchTime: (f.match_time as string | null) ?? null,
        date,
        club,
        teamDisplayName: teamName,
      }),
      teamName,
    });
  }

  built.sort(
    (a, b) =>
      a.teamName.localeCompare(b.teamName, undefined, { numeric: true }) ||
      a.json.date.localeCompare(b.json.date)
  );

  return { folder, items: await classifyExports(built, folder) };
}
