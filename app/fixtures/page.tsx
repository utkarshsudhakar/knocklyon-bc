import client from "@/tina/__generated__/client";
import FixturesClient from "./fixtures-client";

export const dynamic = "force-dynamic";

export default async function FixturesPage() {
  const [fixturesRes, settingsRes, seasonsRes] = await Promise.all([
    client.queries.fixtureConnection({ first: 500 }),
    client.queries.site_settings({ relativePath: "site.json" }),
    client.queries.seasonConnection({}),
  ]);

  const currentSeason = settingsRes.data.site_settings?.current_season ?? null;

  // Build season metadata: folder → { displayName, teams }
  // Skip archived seasons entirely from the public site.
  const seasonMeta: Record<string, { name: string; teams: any[] }> = {};

  seasonsRes.data.seasonConnection?.edges?.forEach((e: any) => {
    const s = e?.node;
    if (!s || s.archived) return;
    const folder: string = s.folder ?? s.name?.replace("/", "-") ?? "";
    if (folder) {
      seasonMeta[folder] = { name: s.name, teams: s.teams ?? [] };
    }
  });

  // Build seasonTeams keyed by display name (e.g. "2025/26") for the client
  const seasonTeams: Record<string, any[]> = {};
  Object.values(seasonMeta).forEach(({ name, teams }) => {
    seasonTeams[name] = teams;
  });

  return (
    <FixturesClient
      data={fixturesRes.data}
      query={fixturesRes.query}
      variables={fixturesRes.variables}
      currentSeason={currentSeason}
      seasonTeams={seasonTeams}
      seasonFolderMap={seasonMeta}
    />
  );
}
