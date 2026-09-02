"use client";

import { useState } from "react";
import { resetSeason } from "./actions";

export default function ResetSeasonForm() {
  const [confirmText, setConfirmText] = useState("");
  const armed = confirmText === "RESET";

  return (
    <details className="rounded-lg border border-red-200 bg-red-50/40 overflow-hidden">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-red-800 hover:bg-red-50 list-none [&::-webkit-details-marker]:hidden flex items-center gap-2">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="w-4 h-4 shrink-0"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 6a1 1 0 112 0v4a1 1 0 11-2 0V6zm1 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        Danger zone — reset for a new season
      </summary>
      <div className="border-t border-red-200 bg-white p-5 space-y-4">
        <div className="space-y-2 text-sm text-zinc-700">
          <p>
            This clears the current season so you can start fresh next August.
            Do it only <strong>after</strong>{" "}
            you&rsquo;ve exported the confirmed fixtures to TinaCMS and
            committed them, because this operation cannot be undone.
          </p>
          <p className="font-medium text-zinc-800">What gets deleted:</p>
          <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-0.5">
            <li>All opposing clubs and their fixtures</li>
            <li>All home dates and captain availability</li>
            <li>All secretary tokens and notes</li>
          </ul>
          <p className="font-medium text-zinc-800">What stays:</p>
          <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-0.5">
            <li>Knocklyon teams (M1, M2, L1, X1) &mdash; edit division if it changed</li>
            <li>
              Captain names, emails, and their links &mdash; edit each team&rsquo;s
              &ldquo;Edit captain&rdquo; if a new captain is taking over
            </li>
            <li>
              Your public <code>/fixtures</code> page &mdash; that&rsquo;s driven
              by TinaCMS, unaffected
            </li>
          </ul>
        </div>

        <form action={resetSeason} className="space-y-3 pt-2 border-t border-zinc-200">
          <label className="block">
            <span className="text-sm font-medium text-zinc-800">
              Type <code className="bg-zinc-100 px-1 rounded">RESET</code> to
              confirm
            </span>
            <input
              type="text"
              name="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET"
              autoComplete="off"
              className="mt-1 w-40 rounded border border-zinc-300 px-3 py-2 text-sm font-mono uppercase"
            />
          </label>
          <button
            type="submit"
            disabled={!armed}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
              armed
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-zinc-200 text-zinc-500 cursor-not-allowed"
            }`}
          >
            Reset for new season
          </button>
        </form>
      </div>
    </details>
  );
}
