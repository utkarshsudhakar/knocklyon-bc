"use client";

import { useEffect, useState } from "react";

// Logo mark reveal, ~5s total:
//   0-0.4s → deep-black background snaps in
//   0.4-2.2s → KBC crest scales/rotates into place from tiny + slightly off-axis
//   2.2-3.6s → a bright "shine" streak sweeps across the crest (like polished
//             metal catching light)
//   3.6-4.2s → crest gently zooms in a touch, glow blooms
//   4.2-5s  → whole overlay fades out to the site
const TOTAL_MS = 5100;

export default function LogoMarkOverlay({ nonce = 0 }: { nonce?: number }) {
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
      className="mark-root fixed inset-0 z-[9990] flex items-center justify-center overflow-hidden"
      style={{ background: "#0a0a0a" }}
      aria-hidden="true"
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-5 right-5 z-30 rounded border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur hover:bg-white/20"
      >
        Skip →
      </button>

      {/* Radial glow behind the mark — fades in with the crest */}
      <div className="mark-glow absolute w-[600px] h-[600px] rounded-full pointer-events-none" />

      {/* Crest wrapper — the shine mask lives on this element */}
      <div className="mark-wrap relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kbc-logo.png" alt="" className="mark-crest h-48 w-auto sm:h-72 relative z-10" />
        {/* Shine sweep — a diagonal white streak that translates across the crest */}
        <div className="mark-shine absolute inset-0 z-20 pointer-events-none" />
      </div>

      {/* Wordmark below */}
      <p className="mark-word absolute bottom-[15%] text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
        Knocklyon Badminton Club
      </p>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .mark-root  { animation: mark-fade 0.9s ease-out 4.1s forwards; }
            .mark-crest {
              transform: scale(0.1) rotate(-14deg);
              opacity: 0;
              animation:
                mark-appear 1.8s cubic-bezier(0.2, 1.15, 0.4, 1) 0.4s forwards,
                mark-punch 0.6s cubic-bezier(0.4, 0, 0.2, 1) 3.6s forwards;
              filter: drop-shadow(0 0 20px rgba(255,255,255,0.15));
            }
            .mark-glow {
              background: radial-gradient(circle, rgba(27,94,53,0.35) 0%, rgba(0,0,0,0) 65%);
              opacity: 0;
              animation:
                mark-glow-in 1.5s ease-out 0.6s forwards,
                mark-glow-bloom 0.6s ease-out 3.6s forwards;
            }
            .mark-shine {
              background: linear-gradient(115deg,
                transparent 40%,
                rgba(255,255,255,0.85) 50%,
                transparent 60%);
              mix-blend-mode: overlay;
              transform: translateX(-160%) skewX(-8deg);
              opacity: 0;
              animation: mark-shine-sweep 1.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) 2.2s forwards;
            }
            .mark-word {
              opacity: 0;
              animation: mark-word-in 0.8s ease-out 2.8s forwards;
            }

            @keyframes mark-appear {
              0%   { transform: scale(0.1) rotate(-14deg); opacity: 0; }
              60%  { transform: scale(1.08) rotate(3deg);  opacity: 1; }
              100% { transform: scale(1) rotate(0deg);     opacity: 1; }
            }
            @keyframes mark-punch {
              0%   { transform: scale(1); }
              45%  { transform: scale(1.08); filter: drop-shadow(0 0 45px rgba(255,255,255,0.35)); }
              100% { transform: scale(1);    filter: drop-shadow(0 0 20px rgba(255,255,255,0.15)); }
            }
            @keyframes mark-glow-in    { to { opacity: 1; } }
            @keyframes mark-glow-bloom { to { opacity: 1; transform: scale(1.15); } }
            @keyframes mark-shine-sweep {
              0%   { transform: translateX(-160%) skewX(-8deg); opacity: 0; }
              15%  { opacity: 1; }
              85%  { opacity: 1; }
              100% { transform: translateX(160%) skewX(-8deg);  opacity: 0; }
            }
            @keyframes mark-word-in { to { opacity: 1; } }
            @keyframes mark-fade    { to { opacity: 0; visibility: hidden; pointer-events: none; } }

            @media (prefers-reduced-motion: reduce) {
              .mark-crest { transform: none; opacity: 1; animation: none; }
              .mark-shine, .mark-glow { display: none; }
              .mark-word  { opacity: 1; animation: none; }
              .mark-root  { animation: mark-fade 0.3s ease-out 0.5s forwards; }
            }
          `,
        }}
      />
    </div>
  );
}
