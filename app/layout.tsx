import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import client from "@/tina/__generated__/client";
import SiteHeader from "./components/site-header";
import SiteFooter from "./components/site-footer";
import AnnouncementBar from "./components/announcement-bar";

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

export const metadata: Metadata = {
  title: "Knocklyon Badminton Club",
  description: "Community badminton in South Dublin",
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
        <SiteHeader clubName={settings?.club_name} logo={settings?.logo} />
        {settings?.announcement && (
          <AnnouncementBar
            text={settings.announcement}
            link={settings.announcement_link ?? null}
          />
        )}
        <div className="flex-1">{children}</div>
        <SiteFooter settings={settings} />
      </body>
    </html>
  );
}
