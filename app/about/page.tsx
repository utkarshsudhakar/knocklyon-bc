import client from "@/tina/__generated__/client";
import AboutClient from "./about-client";

export default async function AboutPage() {
  const [pageRes, settingsRes] = await Promise.all([
    client.queries.page({ relativePath: "about.md" }),
    client.queries.site_settings({ relativePath: "site.json" }),
  ]);

  const currentSeason = settingsRes.data.site_settings?.current_season ?? null;

  // Load current season's team data
  let teams: any[] = [];
  if (currentSeason) {
    try {
      const slug = currentSeason.replace("/", "-");
      const seasonRes = await client.queries.season({ relativePath: `${slug}.json` });
      const s = seasonRes.data.season;
      // Don't show archived season's teams on the about page
      teams = s?.archived ? [] : (s?.teams ?? []);
    } catch {
      // season file doesn't exist yet — show empty
    }
  }

  return (
    <AboutClient
      data={pageRes.data}
      query={pageRes.query}
      variables={pageRes.variables}
      teams={teams}
    />
  );
}
