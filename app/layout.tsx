import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import client from "@/tina/__generated__/client";
import SiteHeader from "./components/site-header";
import SiteFooter from "./components/site-footer";
import AnnouncementBar from "./components/announcement-bar";
import { SITE_URL } from "./site-url";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SITE_DESCRIPTION =
  "Knocklyon Badminton Club — a friendly, competitive South Dublin badminton club (Dublin 16) fielding teams across the Leinster leagues. Training Monday, Tuesday and Thursday nights at Knocklyon Community Centre.";

const OG_IMAGE = "/KBC_Facebook_Profile_1024.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "Knocklyon Badminton Club — South Dublin badminton club in Dublin 16",
    template: "%s — Knocklyon Badminton Club",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Knocklyon Badminton Club",
  keywords: [
    "Knocklyon Badminton Club",
    "Knocklyon BC",
    "South Dublin Badminton Club",
    "badminton South Dublin",
    "badminton Dublin",
    "badminton Dublin 16",
    "Leinster badminton",
    "Knocklyon Community Centre",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Knocklyon Badminton Club",
    url: SITE_URL,
    title:
      "Knocklyon Badminton Club — South Dublin badminton club in Dublin 16",
    description: SITE_DESCRIPTION,
    locale: "en_IE",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Knocklyon Badminton Club",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let settings: any = null;
  try {
    const res = await client.queries.site_settings({ relativePath: "site.json" });
    settings = res.data.site_settings;
  } catch {
    // settings file may not exist yet — header/footer fall back to defaults
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <div className="sticky top-0 z-40">
          <SiteHeader clubName={settings?.club_name} logo={settings?.logo} />
          {settings?.announcement && (
            <AnnouncementBar
              text={settings.announcement}
              link={settings.announcement_link ?? null}
            />
          )}
        </div>
        <div className="flex-1">{children}</div>
        <SiteFooter settings={settings} />
      </body>
    </html>
  );
}
