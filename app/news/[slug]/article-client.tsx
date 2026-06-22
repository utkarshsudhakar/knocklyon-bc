"use client";

import { useTina } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import Link from "next/link";

type Props = { data: any; query: string; variables: object };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ArticleClient({ data, query, variables }: Props) {
  const { data: live } = useTina({ query, variables, data });
  const article = live.news;

  return (
    <>
      {/* Hero — cover image or solid colour */}
      <section className="relative overflow-hidden bg-forest">
        {article.cover_image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.cover_image} alt={article.title}
              className="absolute inset-0 h-full w-full object-cover object-center opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/80 to-forest/40" />
          </>
        )}
        <div className="relative mx-auto max-w-3xl px-6 py-12 sm:py-16">
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-200 hover:text-white mb-5"
          >
            ← Back to News
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-300">
            {fmtDate(article.date)}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="mt-4 text-base text-green-100 sm:text-lg">
              {article.excerpt}
            </p>
          )}
        </div>
      </section>

      {/* Full cover image (if provided) */}
      {article.cover_image && (
        <div className="mx-auto max-w-3xl px-6">
          <div className="relative -mt-8 aspect-[16/9] overflow-hidden rounded-2xl shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.cover_image} alt={article.title}
              className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>
      )}

      {/* Article body */}
      <section className="mx-auto max-w-3xl px-6 py-10">
        <article className="space-y-5 text-[17px] leading-relaxed text-stone-700 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-stone-900 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-stone-900 [&_a]:text-forest [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:font-semibold [&_strong]:text-stone-900">
          <TinaMarkdown content={article.body} />
        </article>

        {/* Back link */}
        <div className="mt-12 border-t border-stone-200 pt-8">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-forest hover:text-forest"
          >
            ← Back to all news
          </Link>
        </div>
      </section>
    </>
  );
}
