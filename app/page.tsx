import { headers } from "next/headers";

import client from "@/tina/__generated__/client";
import HomeClient from "./home-client";
import IntroGate from "./components/intro-gate";
import { SITE_URL } from "./site-url";

export const dynamic = "force-dynamic";

// Skip the intro overlay for anything that looks like a crawler so Googlebot
// and friends always see the clean page (no interstitial, no LCP delay).
const BOT_UA =
  /bot|crawl|slurp|spider|mediapartners|adsbot|google|bing|yandex|baidu|duckduck|facebookexternalhit|whatsapp|telegrambot|linkedinbot|slackbot|twitterbot|pinterest|preview|lighthouse|pagespeed|gtmetrix|semrush|ahrefs/i;

export default async function Home() {
  const ua = (await headers()).get("user-agent") ?? "";
  const introEnabled = !BOT_UA.test(ua);

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
      <IntroGate enabled={introEnabled} />
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
