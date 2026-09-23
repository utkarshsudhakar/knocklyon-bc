"use client";

import { useEffect, useState } from "react";

// Curtain parting, ~5s total:
//   0-1.5s → both curtain halves fully closed, KBC crest fades in centred,
//           gently "breathing" (subtle scale pulse)
//   1.5-2.5s → welcome text fades in below the crest
//   2.5-3.5s → held, curtains still closed, everything visible
//   3.5-5s  → curtains slide apart to left/right, revealing the site;
//           crest & text slide down out of view as curtains open
const TOTAL_MS = 5100;

export default function CurtainOverlay({ nonce = 0 }: { nonce?: number }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
    const t = setTimeout(() => setDismissed(true), TOTAL_MS);
    return () => clearTimeout(t);
  }, [nonce]);

  if (dismissed) return null;

  return (
    <div
      key={nonce}
      className="curtain-root fixed inset-0 z-[9990] overflow-hidden pointer-events-auto"
      aria-hidden="true"
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-5 right-5 z-30 rounded border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur hover:bg-white/20"
      >
        Skip →
      </button>

      {/* Top valance / curtain rail */}
      <div className="curtain-valance absolute inset-x-0 top-0 h-6 z-[11] pointer-events-none" />

      {/* Left curtain half */}
      <div className="curtain curtain-left absolute inset-y-0 left-0 w-1/2 bg-forest" />
      {/* Right curtain half */}
      <div className="curtain curtain-right absolute inset-y-0 right-0 w-1/2 bg-forest" />

      {/* Vertical seam line where the two halves meet (adds a "physical" edge feel) */}
      <div className="curtain-seam absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-forest-dark z-10 pointer-events-none" />

      {/* Centre content (sits above both halves so it stays put until curtains open) */}
      <div className="curtain-crest absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-white pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kbc-logo.png" alt="" className="h-40 w-auto sm:h-56" />
        <p className="curtain-tag opacity-0 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/85">
          Knocklyon Badminton Club
        </p>
        <p className="curtain-tag-sub opacity-0 text-lg font-semibold text-white">
          New season begins
        </p>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Vertical pleats: repeating dark-fold / highlight bands across the width.
               Layered on top of the base forest colour to look like gathered velvet. */
            .curtain {
              background-image:
                /* Broad soft highlight running vertically down the middle of each fold cluster */
                linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.25) 100%),
                /* Fine repeating pleats — dark crease + subtle highlight */
                repeating-linear-gradient(
                  to right,
                  rgba(0,0,0,0.42) 0px,
                  rgba(0,0,0,0.15) 14px,
                  rgba(255,255,255,0.10) 28px,
                  rgba(0,0,0,0.15) 42px,
                  rgba(0,0,0,0.42) 56px
                );
              background-blend-mode: multiply, normal;
              box-shadow:
                inset 0 0 60px rgba(0,0,0,0.45),
                inset 0 -30px 40px -20px rgba(0,0,0,0.6);
            }
            /* Darken the outer edges so the fabric reads as lit from the seam */
            .curtain-left  { background-position: right center, right center; }
            .curtain-right { background-position: left  center, left  center; }
            .curtain-left  { transform-origin: left  center; }
            .curtain-right { transform-origin: right center; }

            /* Gold-ish valance bar with soft under-shadow, evokes a theatre proscenium */
            .curtain-valance {
              background:
                linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%),
                repeating-linear-gradient(to right,
                  rgba(255,255,255,0.10) 0px,
                  transparent 6px,
                  rgba(0,0,0,0.20) 12px,
                  transparent 18px),
                #1a3d24;
              box-shadow: 0 8px 12px -6px rgba(0,0,0,0.6);
            }

            .curtain-root { animation: curtain-cleanup 0.1s linear 5s forwards; }
            .curtain-left  { animation: curtain-slide-left  1.7s cubic-bezier(0.65, 0, 0.3, 1) 3.5s forwards; }
            .curtain-right { animation: curtain-slide-right 1.7s cubic-bezier(0.65, 0, 0.3, 1) 3.5s forwards; }
            .curtain-valance { animation: curtain-valance-up 1.2s cubic-bezier(0.7, 0, 0.3, 1) 3.8s forwards; }
            .curtain-seam  { animation: curtain-seam-fade 0.4s ease-out 3.5s forwards; }
            .curtain-crest > img { animation: curtain-breathe 2.5s ease-in-out 0s infinite; }
            .curtain-crest       { animation: curtain-crest-drop 1.5s cubic-bezier(0.7, 0, 0.3, 1) 3.5s forwards; }
            .curtain-tag         { animation: curtain-tag-in 0.7s ease-out 1.5s forwards; }
            .curtain-tag-sub     { animation: curtain-tag-in 0.7s ease-out 2s forwards; }

            /* Curtain slide: while sliding, compress horizontally (fabric gathering
               against the frame) so it doesn't look like a flat rectangle moving. */
            @keyframes curtain-slide-left  {
              0%   { transform: translateX(0)      scaleX(1); }
              55%  { transform: translateX(-45%)   scaleX(0.78); }
              100% { transform: translateX(-100%)  scaleX(0.78); }
            }
            @keyframes curtain-slide-right {
              0%   { transform: translateX(0)      scaleX(1); }
              55%  { transform: translateX(45%)    scaleX(0.78); }
              100% { transform: translateX(100%)   scaleX(0.78); }
            }
            @keyframes curtain-valance-up  { to { transform: translateY(-100%); } }
            @keyframes curtain-seam-fade   { to { opacity: 0; } }
            @keyframes curtain-crest-drop  { to { transform: translateY(30vh); opacity: 0; } }
            @keyframes curtain-tag-in      { to { opacity: 1; transform: translateY(0); } }
            @keyframes curtain-breathe {
              0%, 100% { transform: scale(1); }
              50%      { transform: scale(1.03); }
            }
            @keyframes curtain-cleanup { to { visibility: hidden; pointer-events: none; } }

            @media (prefers-reduced-motion: reduce) {
              .curtain-root { animation: curtain-cleanup 0.1s linear 0.6s forwards; }
              .curtain-left,
              .curtain-right {
                animation: none;
                opacity: 0;
                transition: opacity 0.35s ease-out 0.2s;
              }
              .curtain-valance { animation: none; opacity: 0; }
              .curtain-crest > img, .curtain-tag, .curtain-tag-sub, .curtain-crest, .curtain-seam { animation: none; }
              .curtain-tag, .curtain-tag-sub { opacity: 1; }
            }
          `,
        }}
      />
    </div>
  );
}
