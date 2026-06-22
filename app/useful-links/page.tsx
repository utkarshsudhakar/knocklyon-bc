import Image from "next/image";
import PageHero from "../components/page-hero";

const sections = [
  {
    title: "Badminton Ireland",
    logo: "/bi-logo.png",
    url: "https://www.badmintonireland.com",
    description:
      "The national governing body for badminton in Ireland. Everything from membership and insurance to finding clubs and coaches.",
    links: [
      { label: "Get Started with Badminton Ireland", url: "https://www.badmintonireland.com/page/get-started" },
      { label: "Club Resources & Insurance",          url: "https://www.badmintonireland.com/page/club-resources/insurance" },
      { label: "Coach Finder",                        url: "https://www.badmintonireland.com/coachfinder" },
      { label: "Membership Portal",                   url: "https://badmintonireland.sport80.com/" },
    ],
  },
  {
    title: "Leinster Badminton",
    logo: "/leinster-logo.png",
    url: "https://leinsterbadminton.com",
    description:
      "The Leinster branch organises leagues, cups, and tournaments across Dublin and the surrounding counties.",
    links: [
      { label: "Leinster Badminton Homepage",         url: "https://leinsterbadminton.com/leinster-branch/" },
      { label: "Dublin District Leagues & Cups",      url: "https://leinsterbadminton.com/competition/leagues/ddlc/" },
      { label: "Baldoyle Court Booking",              url: "https://baldoylebadminton.mycourts.co.uk/" },
      { label: "Terenure Court Booking",              url: "https://terenurebadminton.mycourts.co.uk/" },
    ],
  },
];

export default function UsefulLinksPage() {
  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Useful Links"
        subtitle="Official resources for badminton in Ireland and Leinster."
      />

      <section className="mx-auto max-w-4xl px-6 py-12 space-y-14">
        {sections.map((section) => (
          <div key={section.title}>
            {/* Section header */}
            <div className="flex items-center gap-5 mb-6">
              <a href={section.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Image unoptimized
                  src={section.logo}
                  alt={section.title}
                  width={160}
                  height={48}
                  className="h-12 w-auto object-contain"
                />
              </a>
              <p className="text-sm text-stone-500">{section.description}</p>
            </div>

            {/* Link cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {section.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm transition hover:border-forest/40 hover:shadow-md"
                >
                  <span className="text-sm font-semibold text-stone-800 group-hover:text-forest">
                    {link.label}
                  </span>
                  <svg
                    className="ml-3 h-4 w-4 shrink-0 text-stone-300 transition group-hover:text-forest group-hover:translate-x-0.5"
                    viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M3 8h10M9 4l4 4-4 4"/>
                  </svg>
                </a>
              ))}
            </div>

            {/* Visit main site link */}
            <div className="mt-4">
              <a
                href={section.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-400 hover:text-forest transition"
              >
                Visit {section.title} website
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 9.5 9.5 2.5M5.5 2.5h4v4"/>
                </svg>
              </a>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
