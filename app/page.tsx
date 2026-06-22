import client from "@/tina/__generated__/client";
import HomeClient from "./home-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [pageRes, fixturesRes, newsRes, settingsRes] = await Promise.all([
    client.queries.page({ relativePath: "home.md" }),
    client.queries.fixtureConnection({ first: 100 }),
    client.queries.newsConnection({ first: 3 }),
    client.queries.site_settings({ relativePath: "site.json" }),
  ]);

  const latestNews = (
    newsRes.data.newsConnection?.edges?.map((e: any) => e?.node).filter(Boolean) ?? []
  ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
   .slice(0, 3);

  return (
    <HomeClient
      data={pageRes.data}
      query={pageRes.query}
      variables={pageRes.variables}
      fixtures={
        fixturesRes.data.fixtureConnection?.edges
          ?.map((e: any) => e?.node)
          .filter(Boolean) ?? []
      }
      latestNews={latestNews}
      stats={(settingsRes.data.site_settings?.stats ?? []).filter(Boolean) as { value: string; label: string }[]}
    />
  );
}
