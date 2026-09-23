import client from "@/tina/__generated__/client";
import HomeClient from "./home-client";
import { SITE_URL } from "./site-url";

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

  const settings = settingsRes.data.site_settings;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsClub",
    name: settings?.club_name ?? "Knocklyon Badminton Club",
    alternateName: ["Knocklyon BC", "South Dublin Badminton Club"],
    url: SITE_URL,
    logo: `${SITE_URL}${settings?.logo ?? "/KBC_Facebook_Profile_1024.png"}`,
    image: `${SITE_URL}${settings?.logo ?? "/KBC_Facebook_Profile_1024.png"}`,
    description:
      settings?.tagline ?? "Community badminton in South Dublin",
    email: settings?.club_email ?? undefined,
    sport: "Badminton",
    areaServed: "South Dublin",
    address: {
      "@type": "PostalAddress",
      name: "Knocklyon Community Centre",
      streetAddress: "Idrone Avenue",
      addressLocality: "Knocklyon",
      addressRegion: "Dublin",
      postalCode: "D16XT18",
      addressCountry: "IE",
    },
    sameAs: [settings?.facebook_url, settings?.instagram_url].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
    </>
  );
}
