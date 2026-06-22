"use client";

import { useTina } from "tinacms/dist/react";
import Image from "next/image";
import Link from "next/link";
import PageHero from "../components/page-hero";

type Props = { data: any; query: string; variables: object };

type Article = {
  id: string;
  title: string;
  date: string;
  cover_image?: string | null;
  excerpt?: string | null;
  _sys: { filename: string };
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function NewsClient({ data, query, variables }: Props) {
  const { data: live } = useTina({ query, variables, data });

  const articles: Article[] = (
    live.newsConnection?.edges
      ?.map((e: any) => e?.node)
      .filter(Boolean) ?? []
  ).sort(
    (a: Article, b: Article) =>
      new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <>
      <PageHero
        eyebrow="Latest updates"
        title="News"
        subtitle="Club news, results, and announcements."
      />

      <section className="mx-auto max-w-6xl px-6 py-10">
        {articles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center">
            <p className="font-semibold text-stone-600">No news yet.</p>
            <p className="mt-1 text-sm text-stone-400">
              Add articles from the admin panel.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/news/${article._sys.filename}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-forest/30 hover:shadow-md"
              >
                {/* Cover image */}
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
                      <svg className="h-10 w-10 text-forest/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10l6 6v8a2 2 0 0 1-2 2Z"/>
                        <path d="M13 2v6h6M9 13h6M9 17h4"/>
                      </svg>
                    </div>
                  )}

                  {/* Date badge */}
                  <div className="absolute left-3 top-3 rounded-lg bg-black/60 px-2.5 py-1 backdrop-blur-sm">
                    <span className="text-[11px] font-semibold text-white">
                      {fmtDate(article.date)}
                    </span>
                  </div>
                </div>

                {/* Text */}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-base font-bold leading-snug text-stone-900 group-hover:text-forest">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-500 line-clamp-3">
                      {article.excerpt}
                    </p>
                  )}
                  <span className="mt-4 text-xs font-semibold text-forest">
                    Read more →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
