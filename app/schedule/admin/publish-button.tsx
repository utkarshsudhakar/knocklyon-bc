"use client";

import { useState, useTransition } from "react";
import { Spinner } from "../_lib/submit-button";
import { publishFixturesToSite, updateFixtureVenue } from "./actions";

export function VenueUpdateButton({ fixtureId }: { fixtureId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  function handleClick() {
    if (pending) return;
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await updateFixtureVenue(fixtureId));
      } catch {
        setResult({
          ok: false,
          message: "Update failed. Your session may have expired.",
        });
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || result?.ok}
        aria-busy={pending || undefined}
        className={`inline-flex items-center gap-2 rounded border border-forest px-2 py-1 text-xs font-medium text-forest hover:bg-green-50 ${
          pending ? "cursor-wait opacity-80" : ""
        }`}
      >
        {pending && <Spinner />}
        {pending ? "Updating…" : result?.ok ? "Updated ✓" : "Update location on website"}
      </button>
      {result && (
        <span
          role={result.ok ? "status" : "alert"}
          className={`text-xs ${result.ok ? "text-green-800" : "text-red-700"}`}
        >
          {result.message}
        </span>
      )}
    </span>
  );
}

export default function PublishButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  function handleClick() {
    if (pending) return;
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await publishFixturesToSite());
      } catch {
        setResult({
          ok: false,
          message: "Publishing failed. Your session may have expired.",
        });
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-busy={pending || undefined}
        className={`inline-flex items-center gap-2 rounded bg-forest px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:bg-forest-dark ${
          pending ? "cursor-wait opacity-80" : ""
        }`}
      >
        {pending && <Spinner />}
        {pending
          ? "Publishing…"
          : result?.ok
            ? "Published ✓"
            : `Publish ${count} fixture${count === 1 ? "" : "s"} to the website`}
      </button>
      {result && (
        <span
          role={result.ok ? "status" : "alert"}
          className={`text-xs ${result.ok ? "text-green-800" : "text-red-700"}`}
        >
          {result.message}
        </span>
      )}
    </div>
  );
}
