"use client";

import { useEffect, useState } from "react";

import IntroOverlay from "./intro-overlay";

// End of launch window (local time). After this, no visitor sees the intro,
// regardless of localStorage. Bump the version key below when running a
// fresh launch so returning visitors see the new one once.
const LAUNCH_END = new Date("2026-09-28T23:59:59");
const STORAGE_KEY = "kbc_intro_v1";

export default function IntroGate({ enabled }: { enabled: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (Date.now() > LAUNCH_END.getTime()) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Private mode / storage disabled — skip the intro rather than loop it.
      return;
    }
    // One-time gate: intentional post-mount flip. The extra render is fine
    // because it happens once per session and only when the intro is due.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);
  }, [enabled]);

  return show ? <IntroOverlay /> : null;
}
