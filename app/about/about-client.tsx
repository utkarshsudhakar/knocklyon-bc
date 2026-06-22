"use client";

import { useTina } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import Link from "next/link";
// eslint-disable-next-line @next/next/no-img-element
import PageHero from "../components/page-hero";

type Team = { name: string; league?: string | null; table_link?: string | null };
type Props = { data: any; query: string; variables: object; teams?: Team[] };

// Split the body AST at the first h2 whose text matches `splitAt`.
// Returns [before, fromSplitOnwards].
function splitBodyAt(body: any, splitAt: string): [any, any] {
  if (!body?.children) return [body, null];
  const idx = body.children.findIndex(
    (n: any) =>
      n.type === "h2" &&
      n.children?.[0]?.text?.toLowerCase().includes(splitAt.toLowerCase()),
  );
  if (idx < 0) return [body, null];
  return [
    { ...body, children: body.children.slice(0, idx) },
    { ...body, children: body.children.slice(idx) },
  ];
}

const pillars = [
  {
    label: "Competition",
    desc: "We compete seriously across Leinster leagues and cups. High standards are expected — and matched.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21h8M12 17v4M5 3h14l-1 8a6 6 0 0 1-12 0L5 3Z"/>
        <path d="M9 3c0 2-1 3.5-3 4M15 3c0 2 1 3.5 3 4"/>
      </svg>
    ),
  },
  {
    label: "Community",
    desc: "A tight-knit group of players who push each other on court and look out for each other off it.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    label: "The Standard",
    desc: "From Division 8 to the higher grades. We train to improve and show up to win — every session, every match.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
];


function Img({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="aspect-[4/3] rounded-2xl border border-dashed border-stone-200 bg-green-50 flex items-center justify-center text-sm text-stone-400">
        Add a photo in the admin
      </div>
    );
  }
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}

const articleCls =
  "space-y-4 text-[17px] leading-relaxed text-stone-700 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-stone-900 [&_a]:text-forest [&_a]:underline [&_strong]:font-semibold [&_strong]:text-stone-900";

export default function AboutClient({ data, query, variables, teams = [] }: Props) {
  const { data: live } = useTina({ query, variables, data });
  const page = live.page;

  const [introPart, extendedPart] = splitBodyAt(page.body, "What drives us");

  return (
    <>
      <PageHero title={page.title} subtitle={page.hero_subtitle} eyebrow="Who we are" />

      {/* ── 2×2 story grid ───────────────────────────── */}
      {/* The grid has 2 equal columns. Image 1 sits in the top-left and        */}
      {/* is pulled upward with a negative top margin so it visually floats     */}
      {/* into the section above. Text fills top-right, then bottom-left.       */}
      {/* Image 2 fills bottom-right. On mobile everything stacks vertically.   */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid items-start gap-x-16 gap-y-8 md:grid-cols-2">

          {/* ── LEFT column ── */}
          <div className="flex flex-col gap-8">
            <div>
              <Img src={page.hero_image} alt="Knocklyon Badminton Club" />
            </div>

            {/* Extended body: "What drives us" + "The club today" */}
            {extendedPart && (
              <article className={articleCls}>
                <TinaMarkdown content={extendedPart} />
              </article>
            )}
          </div>

          {/* ── RIGHT column ── */}
          <div className="flex flex-col gap-8 md:pt-10">
            {/* Our story intro text */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-forest-mid">
                Our story
              </p>
              <article className={`mt-4 ${articleCls}`}>
                <TinaMarkdown content={introPart} />
              </article>
            </div>

            {/* Image 2 */}
            <Img src={page.second_image} alt="KBC in action" />
          </div>

        </div>
      </section>

      {/* ── Three pillars ─────────────────────────────── */}
      <section className="border-y border-stone-200 bg-green-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-forest-mid">
            What we're about
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-stone-900">The KBC way</h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.label} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest text-white">
                  {p.icon}
                </div>
                <h3 className="mt-4 text-lg font-bold text-stone-900">{p.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Teams ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-forest-mid">
              Leinster leagues
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-stone-900">Our teams</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              We field teams across multiple grades every season. Whether you're looking to
              step up a division or compete at a grade you know, there's a team for you.
            </p>
            <Link
              href="/fixtures"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-forest px-4 py-2 text-sm font-semibold text-forest transition hover:bg-forest hover:text-white"
            >
              View fixtures →
            </Link>
          </div>

          <div className="grid w-full gap-3 sm:max-w-sm">
            {teams.length === 0 ? (
              <p className="text-sm text-stone-400">
                No teams added yet — add them in Site Settings.
              </p>
            ) : (
              teams.map((t) => (
                <div key={t.name} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-5 py-3.5 shadow-sm">
                  <div>
                    <p className="font-bold text-stone-900">{t.name}</p>
                    {t.league && (
                      <p className="text-xs text-stone-500">{t.league}</p>
                    )}
                  </div>
                  {t.table_link && (
                    <a
                      href={t.table_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 shrink-0 rounded-full border border-forest px-3 py-1 text-[11px] font-semibold text-forest transition hover:bg-forest hover:text-white"
                    >
                      View Table →
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Venue ─────────────────────────────────────── */}
      <section className="border-t border-stone-200 bg-[#fafaf7]">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest text-white">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">We play at</p>
                <p className="mt-0.5 text-base font-bold text-stone-900">Knocklyon Community Centre</p>
                <p className="text-sm text-stone-500">Knocklyon Road, Dublin 16, D16 W973</p>
              </div>
            </div>
            <a
              href="https://maps.google.com/?q=Knocklyon+Community+Centre+Dublin"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-forest hover:text-forest"
            >
              Open in Maps →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
