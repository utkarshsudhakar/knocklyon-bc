"use client";

import { useTina } from "tinacms/dist/react";
import Image from "next/image";
import Link from "next/link";

type Fixture = {
  id: string;
  date: string;
  home_team?: string | null;
  opponent: string;
  venue: string;
  location?: string | null;
  result?: string | null;
};

type NewsArticle = {
  id: string;
  title: string;
  date: string;
  cover_image?: string | null;
  excerpt?: string | null;
  _sys: { filename: string };
};

type Stat = { value: string; label: string };

type Props = {
  data: any;
  query: string;
  variables: object;
  fixtures: Fixture[];
  latestNews: NewsArticle[];
  stats: Stat[];
};

function nextMatch(fixtures: Fixture[]): Fixture | null {
  return (
    fixtures
      .filter((f) => new Date(f.date).getTime() >= Date.now())
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0] ?? null
  );
}

function fmt(iso: string) {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString("en-IE", { weekday: "short" }),
    day: d.toLocaleDateString("en-IE", { day: "2-digit" }),
    month: d.toLocaleDateString("en-IE", { month: "short" }),
    time: d.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

export default function HomeClient({ data, query, variables, fixtures, latestNews, stats }: Props) {
  const { data: live } = useTina({ query, variables, data });
  const page = live.page;
  const next = nextMatch(fixtures);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative h-[62vh] min-h-[400px] max-h-[660px] overflow-hidden">
        {page.hero_image ? (
          <Image
            src={page.hero_image}
            alt={page.title ?? "Knocklyon BC"}
            fill
            className="object-cover object-center"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-forest" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="mx-auto w-full max-w-6xl px-6 pb-10">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              {page.title}
            </h1>
            {page.hero_subtitle && (
              <p className="mt-2 max-w-xl text-base text-white/85 sm:text-lg">
                {page.hero_subtitle}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/about"
                className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-dark"
              >
                Know More →
              </Link>
              <Link
                href="/contact"
                className="rounded-full border border-white/50 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Join the Club
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Next Match + Stats (combined) ────────────────── */}
      <section className="border-b border-stone-200 bg-[#fafaf7]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col divide-y divide-stone-200 sm:flex-row sm:divide-x sm:divide-y-0">

            {/* Next match — left side */}
            {next ? (
              <div className="flex items-center gap-4 py-5 sm:flex-1 sm:pr-8">
                <div className="flex flex-col items-center justify-center rounded-xl bg-forest px-3.5 py-2.5 text-center text-white min-w-[3.5rem]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-green-200">
                    {fmt(next.date).weekday}
                  </span>
                  <span className="text-xl font-extrabold leading-none">
                    {fmt(next.date).day}
                  </span>
                  <span className="text-[10px] font-semibold uppercase text-green-200">
                    {fmt(next.date).month}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-forest-mid">
                    Next Match
                  </p>
                  <p className="mt-0.5 text-base font-bold text-stone-900 truncate">
                    {next.home_team ?? "KBC"}{" "}
                    <span className="font-normal text-stone-400">vs</span>{" "}
                    {next.opponent}
                  </p>
                  <p className="text-xs text-stone-500">
                    {next.venue} · {next.location ?? "TBD"} · {fmt(next.date).time}
                  </p>
                </div>
                <Link
                  href="/fixtures"
                  className="shrink-0 rounded-full border border-forest px-3.5 py-1.5 text-xs font-semibold text-forest transition hover:bg-forest hover:text-white"
                >
                  All →
                </Link>
              </div>
            ) : (
              <div className="flex items-center py-5 sm:flex-1 sm:pr-8">
                <p className="text-sm text-stone-400">No upcoming fixtures scheduled.</p>
              </div>
            )}

            {/* Stats — right side */}
            <dl className="grid grid-cols-2 divide-x divide-stone-200 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="px-5 py-5 text-center">
                  <dd className="text-2xl font-extrabold text-forest sm:text-3xl">{s.value}</dd>
                  <dt className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>

          </div>
        </div>
      </section>

      {/* ── Sessions ─────────────────────────────────────── */}
      <section className="border-b border-stone-200 bg-[#fafaf7]">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-forest-mid">
                Weekly schedule
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-stone-900">
                Training nights
              </h2>
            </div>
            <p className="hidden text-sm text-stone-500 sm:block">
              Knocklyon Community Centre, Dublin 16
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Monday — Team Practice */}
            <div className="relative overflow-hidden rounded-2xl bg-forest p-6 text-white shadow-sm">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5" />
              <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
              <div className="relative">
                <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/90">
                  Team Practice
                </span>
                <p className="mt-4 text-4xl font-black tracking-tight">Mon</p>
                <p className="text-sm font-medium text-green-200">Monday</p>
                <div className="mt-5 flex items-center gap-2 border-t border-white/20 pt-4">
                  <svg className="h-4 w-4 shrink-0 text-green-300" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm font-semibold text-white">8:00 – 10:00 pm</span>
                </div>
              </div>
            </div>

            {/* Tuesday — Club Night */}
            <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-forest/30 hover:shadow-md">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-green-50" />
              <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-green-50/60" />
              <div className="relative">
                <span className="inline-block rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-forest">
                  Club Night
                </span>
                <p className="mt-4 text-4xl font-black tracking-tight text-stone-900">Tue</p>
                <p className="text-sm font-medium text-stone-500">Tuesday</p>
                <div className="mt-5 flex items-center gap-2 border-t border-stone-200 pt-4">
                  <svg className="h-4 w-4 shrink-0 text-forest-mid" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm font-semibold text-stone-900">8:00 – 10:30 pm</span>
                </div>
              </div>
            </div>

            {/* Thursday — Club Night */}
            <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-forest/30 hover:shadow-md">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-green-50" />
              <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-green-50/60" />
              <div className="relative">
                <span className="inline-block rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-forest">
                  Club Night
                </span>
                <p className="mt-4 text-4xl font-black tracking-tight text-stone-900">Thu</p>
                <p className="text-sm font-medium text-stone-500">Thursday</p>
                <div className="mt-5 flex items-center gap-2 border-t border-stone-200 pt-4">
                  <svg className="h-4 w-4 shrink-0 text-forest-mid" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm font-semibold text-stone-900">8:00 – 10:30 pm</span>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-stone-400 sm:hidden">
            Knocklyon Community Centre, Dublin 16
          </p>
        </div>
      </section>

      {/* ── Latest News ──────────────────────────────────── */}
      {latestNews.length > 0 && (
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-forest-mid">
                  Club updates
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-stone-900">Latest News</h2>
              </div>
              <Link href="/news" className="text-sm font-semibold text-forest hover:underline">
                All news →
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {latestNews.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article._sys.filename}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-forest/30 hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-stone-100">
                    {article.cover_image ? (
                      <Image
                        src={article.cover_image}
                        alt={article.title}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-105"
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-green-50">
                        <svg className="h-8 w-8 text-forest/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10l6 6v8a2 2 0 0 1-2 2Z"/>
                          <path d="M9 13h6M9 17h4"/>
                        </svg>
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-lg bg-black/55 px-2 py-0.5 backdrop-blur-sm">
                      <span className="text-[10px] font-semibold text-white">
                        {new Date(article.date).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-sm font-bold leading-snug text-stone-900 group-hover:text-forest line-clamp-2">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-stone-500 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    <span className="mt-3 text-xs font-semibold text-forest">Read more →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="bg-green-50">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-6 py-10 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-forest-mid">
              Play with us
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-stone-900 sm:text-2xl">
              Division 7 or above? We'd love to have you.
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Get in touch and we'll arrange a session for you to come down and play.
            </p>
          </div>
          <Link
            href="/contact"
            className="shrink-0 rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-forest-dark"
          >
            Get in touch
          </Link>
        </div>
      </section>
    </>
  );
}
