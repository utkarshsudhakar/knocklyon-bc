"use client";

import { useEffect, useState } from "react";

// Court lights, ~5s total:
//   0-0.4s → deep black screen
//   0.4-3s  → six overhead stadium lights flicker on one by one across the
//            top, each with a soft cone of light angling down and a glow bloom
//   3-3.8s  → "court floor" (radial forest-green gradient) fills in from below,
//            KBC crest becomes visible at centre
//   3.8-5s  → overlay fades to reveal the site
const TOTAL_MS = 5100;

const LIGHT_COUNT = 6;

export default function CourtLightsOverlay({ nonce = 0 }: { nonce?: number }) {
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
      className="lights-root fixed inset-0 z-[9990] overflow-hidden"
      style={{ background: "#050807" }}
      aria-hidden="true"
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-5 right-5 z-30 rounded border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur hover:bg-white/20"
      >
        Skip →
      </button>

      {/* Row of overhead lights across the top */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-start justify-around px-8 z-20">
        {Array.from({ length: LIGHT_COUNT }).map((_, i) => (
          <div
            key={i}
            className="lights-fixture"
            style={{ "--i": i } as React.CSSProperties}
          >
            <div className="lights-bulb" />
            <div className="lights-cone" />
          </div>
        ))}
      </div>

      {/* Court floor — radial green glow that swells up from the bottom once
          all lights have flicked on */}
      <div className="lights-floor absolute inset-0 pointer-events-none z-10" />

      {/* Crest — hidden until the floor lights up */}
      <div className="lights-crest absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kbc-logo.png" alt="" className="h-40 w-auto sm:h-56" />
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
            Knocklyon Badminton Club
          </p>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .lights-root { animation: lights-fade 1.2s ease-out 3.8s forwards; }

            .lights-fixture {
              position: relative;
              width: 40px;
              height: 400px;
              filter: brightness(0.15);
              animation: lights-turn-on 0.35s cubic-bezier(0.5, 0, 0.5, 1) forwards;
              animation-delay: calc(0.5s + var(--i) * 0.35s);
            }
            .lights-bulb {
              width: 22px;
              height: 8px;
              margin: 0 auto;
              background: radial-gradient(ellipse, #ffffff 0%, #fef9c3 40%, #eab308 100%);
              border-radius: 4px;
              box-shadow: 0 0 30px 8px rgba(255, 250, 200, 0.65);
            }
            .lights-cone {
              position: absolute;
              top: 8px;
              left: 50%;
              transform: translateX(-50%);
              width: 260px;
              height: 400px;
              background: linear-gradient(180deg,
                rgba(255,255,200,0.35) 0%,
                rgba(255,255,200,0.08) 60%,
                rgba(255,255,200,0) 100%);
              clip-path: polygon(45% 0, 55% 0, 100% 100%, 0 100%);
              mix-blend-mode: screen;
            }

            .lights-floor {
              background:
                radial-gradient(ellipse 100% 60% at 50% 100%,
                  rgba(27,94,53,0.55) 0%,
                  rgba(27,94,53,0.2) 45%,
                  transparent 75%);
              opacity: 0;
              animation: lights-floor-in 0.9s ease-out 3s forwards;
            }

            .lights-crest {
              opacity: 0;
              transform: scale(0.9);
              animation: lights-crest-in 0.8s ease-out 3.2s forwards;
            }

            @keyframes lights-turn-on {
              0%   { filter: brightness(0.15); }
              20%  { filter: brightness(1.6); }
              35%  { filter: brightness(0.4); }
              55%  { filter: brightness(1.4); }
              100% { filter: brightness(1); }
            }
            @keyframes lights-floor-in {
              to { opacity: 1; }
            }
            @keyframes lights-crest-in {
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes lights-fade {
              to { opacity: 0; visibility: hidden; pointer-events: none; }
            }

            @media (prefers-reduced-motion: reduce) {
              .lights-fixture { animation: none; filter: brightness(1); }
              .lights-floor { opacity: 1; animation: none; }
              .lights-crest { opacity: 1; transform: none; animation: none; }
              .lights-root { animation: lights-fade 0.3s ease-out 0.5s forwards; }
            }
          `,
        }}
      />
    </div>
  );
}
