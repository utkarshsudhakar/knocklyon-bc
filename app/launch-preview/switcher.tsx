"use client";

import { useState } from "react";
import ShuttleOverlay from "../components/intro-overlay";
import CurtainOverlay from "./curtain-overlay";
import LogoMarkOverlay from "./logo-mark-overlay";
import CourtLightsOverlay from "./court-lights-overlay";

type Variant = "shuttle" | "curtain" | "logo-mark" | "court-lights";

const VARIANTS: Array<{ id: Variant; label: string; description: string }> = [
  {
    id: "shuttle",
    label: "Shuttle Flight",
    description:
      "Crest appears, shuttlecock flies in from the top-right and hits it, brief flash + pulse, overlay dissolves.",
  },
  {
    id: "curtain",
    label: "Curtain Parting",
    description:
      "Solid forest curtains cover the screen with the crest gently breathing. Curtains slide apart to reveal the site.",
  },
  {
    id: "logo-mark",
    label: "Logo Mark Reveal",
    description:
      "Deep black background. Crest scales in with a slight rotation, a metallic shine sweeps across it, then it punches forward as the overlay fades.",
  },
  {
    id: "court-lights",
    label: "Court Lights",
    description:
      "Six overhead stadium lights flicker on one by one. The court floor glows into view, the crest lights up, then the overlay fades.",
  },
];

export default function AnimationSwitcher() {
  const [variant, setVariant] = useState<Variant>("shuttle");
  const [nonce, setNonce] = useState(0);

  function play(v: Variant) {
    setVariant(v);
    setNonce((n) => n + 1);
  }

  return (
    <>
      {/* Tab bar — always visible so you can hop between animations */}
      <div className="mx-auto max-w-5xl px-6 pt-8">
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-forest">
              Compare animations
            </p>
            <p className="mt-1 text-sm text-zinc-700">
              Click a variant to play. Each runs ~5 seconds. Use{" "}
              <strong>Skip</strong> in the top-right to bail, or click any tab
              during playback to switch.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {VARIANTS.map((v) => {
              const active = v.id === variant;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => play(v.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium border transition-all ${
                    active
                      ? "bg-forest text-white border-forest shadow-sm"
                      : "bg-white text-zinc-800 border-zinc-300 hover:border-forest hover:text-forest"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => play(variant)}
              className="rounded-full px-4 py-2 text-sm font-medium border border-zinc-300 text-zinc-800 bg-white hover:border-forest hover:text-forest transition-all"
              title="Replay the currently selected animation"
            >
              ↻ Replay
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Now playing: <strong>{VARIANTS.find((v) => v.id === variant)?.label}</strong>{" "}
            &mdash; {VARIANTS.find((v) => v.id === variant)?.description}
          </p>
        </div>
      </div>

      {variant === "shuttle" && <ShuttleOverlay nonce={nonce} />}
      {variant === "curtain" && <CurtainOverlay nonce={nonce} />}
      {variant === "logo-mark" && <LogoMarkOverlay nonce={nonce} />}
      {variant === "court-lights" && <CourtLightsOverlay nonce={nonce} />}
    </>
  );
}
