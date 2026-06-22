"use client";

import { useEffect, useState } from "react";
import { useTina } from "tinacms/dist/react";
import PageHero from "../components/page-hero";

type Props = { data: any; query: string; variables: object };
type GalleryImage = { id: string; image: string; caption: string; order?: number | null };

// Every 5th image (index 0, 5, 10…) is shown as a wide landscape tile.
const isWide = (i: number) => i % 5 === 0;

export default function GalleryClient({ data, query, variables }: Props) {
  const { data: live } = useTina({ query, variables, data });

  // Filter out any entries without an image path (e.g. if admin cleared the
  // field but didn't delete the entry), then sort by order.
  const images: GalleryImage[] = (
    live.gallery_imageConnection?.edges?.map((e: any) => e?.node).filter(Boolean) ?? []
  )
    .filter((img: GalleryImage) => !!img.image)
    .sort((a: GalleryImage, b: GalleryImage) => (a.order ?? Infinity) - (b.order ?? Infinity));

  // Track images that fail to load so we can hide them gracefully.
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const markBroken = (id: string) =>
    setBroken((prev) => new Set(prev).add(id));

  const visibleImages = images.filter((img) => !broken.has(img.id));

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex !== null ? visibleImages[activeIndex] : null;

  function close() { setActiveIndex(null); }
  function prev() { if (activeIndex !== null) setActiveIndex((activeIndex - 1 + visibleImages.length) % visibleImages.length); }
  function next() { if (activeIndex !== null) setActiveIndex((activeIndex + 1) % visibleImages.length); }

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <PageHero
        eyebrow="Photo gallery"
        title="Gallery"
        subtitle="Moments from matches, training, and club events."
      />

      <section className="mx-auto max-w-6xl px-6 py-8">
        {visibleImages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-20 text-center">
            <p className="font-semibold text-stone-600">No photos yet</p>
            <p className="mt-1 text-sm text-stone-400">
              Add some from the admin panel to populate the gallery.
            </p>
          </div>
        ) : (
          <>
            {/* Photo count */}
            <p className="mb-5 text-sm font-medium text-stone-500">
              <span className="font-bold text-stone-900">{visibleImages.length}</span>{" "}
              {visibleImages.length === 1 ? "photo" : "photos"}
            </p>

            {/* Mixed-size grid — every 5th image is wide (landscape, 2 cols) */}
            <div
              className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 [grid-auto-rows:200px] sm:[grid-auto-rows:220px] grid-flow-dense"
            >
              {visibleImages.map((img, i) => {
                const wide = isWide(i);
                return (
                  <button
                    key={img.id}
                    onClick={() => setActiveIndex(i)}
                    aria-label={`View ${img.caption ?? "photo"}`}
                    className={`group relative overflow-hidden rounded-2xl bg-stone-100 transition
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-forest
                      ${wide ? "col-span-2" : "col-span-1"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image} alt={img.caption ?? ""}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-90"
                      onError={() => markBroken(img.id)} />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      {img.caption && (
                        <p className="line-clamp-2 text-left text-xs font-semibold text-white drop-shadow">
                          {img.caption}
                        </p>
                      )}
                      <span className="mt-1 text-[10px] text-white/60">{i + 1} / {images.length}</span>
                    </div>

                    {/* Expand icon — appears on hover */}
                    <div className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-black/30 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                      <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M5 1H1v4M1 1l5 5M11 1h4v4M15 1l-5 5M5 15H1v-4M1 15l5-5M11 15h4v-4M15 15l-5-5"/>
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* ── Lightbox ──────────────────────────────────── */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Prev / Next */}
          {visibleImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-2xl text-white transition hover:bg-white/25"
                aria-label="Previous"
              >‹</button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-2xl text-white transition hover:bg-white/25"
                aria-label="Next"
              >›</button>
            </>
          )}

          {/* Main image */}
          <div
            className="relative max-h-[80vh] max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.image} alt={active.caption ?? ""}
              className="mx-auto max-h-[80vh] w-auto rounded-xl object-contain shadow-2xl" />
          </div>

          {/* Caption + dots indicator */}
          <div className="mt-4 flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {active.caption && (
              <p className="text-sm font-medium text-white/90">{active.caption}</p>
            )}

            {/* Dot indicator */}
            <div className="flex items-center gap-1.5">
              {visibleImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`rounded-full transition-all ${
                    i === activeIndex
                      ? "h-2 w-5 bg-white"
                      : "h-1.5 w-1.5 bg-white/30 hover:bg-white/60"
                  }`}
                  aria-label={`Go to photo ${i + 1}`}
                />
              ))}
            </div>

            <span className="text-xs text-white/40">
              {(activeIndex ?? 0) + 1} of {visibleImages.length}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
