"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import SubmitButton from "../../_lib/submit-button";
import { proposeAwayDates, type ProposeState } from "./actions";

type Proposed = { date: string; time: string | null };

const TIME_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "12:00", label: "12:00 PM (noon)" },
  { value: "12:30", label: "12:30 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "13:30", label: "1:30 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "14:30", label: "2:30 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "15:30", label: "3:30 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "16:30", label: "4:30 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "17:30", label: "5:30 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "18:30", label: "6:30 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "19:30", label: "7:30 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "20:30", label: "8:30 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "21:30", label: "9:30 PM" },
  { value: "22:00", label: "10:00 PM" },
];

const INPUT =
  "mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm bg-white";

export default function AwayProposalFields({
  token,
  proposed,
  note,
  venueLocation,
  venueMapLink,
  busyDates,
  alreadyProposed,
}: {
  token: string;
  proposed: Proposed[];
  note: string | null;
  venueLocation: string | null;
  venueMapLink: string | null;
  busyDates: string[];
  alreadyProposed: boolean;
}) {
  const [p1, p2] = proposed;
  const [date1, setDate1] = useState(p1?.date ?? "");
  const [time1, setTime1] = useState(p1?.time ?? "19:00");
  const [date2, setDate2] = useState(p2?.date ?? "");
  const [time2, setTime2] = useState(p2?.time ?? "19:00");
  const [venue, setVenue] = useState(venueLocation ?? "");
  const [mapLink, setMapLink] = useState(venueMapLink ?? "");
  const [message, setMessage] = useState(note ?? "");

  const [state, formAction, isPending] = useActionState<ProposeState, FormData>(
    proposeAwayDates,
    {}
  );

  const busy = useMemo(() => new Set(busyDates), [busyDates]);
  const busy1 = Boolean(date1) && busy.has(date1);
  const busy2 = Boolean(date2) && busy.has(date2);
  const same = Boolean(date1) && date1 === date2;
  const blocked = busy1 || busy2 || same;

  // Submitted manually (not via the form action) so React never resets the
  // fields when the server sends back an error.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  }

  const busyMessage = (
    <p role="alert" className="mt-1 text-xs text-red-700">
      Knocklyon already has a match on this date. Please pick another.
    </p>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-zinc-700">
        Suggest <strong>two dates and start times</strong> when you can host
        Knocklyon at your venue.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Option 1
          </div>
          <label className="block">
            <span className="text-xs text-zinc-600">Date</span>
            <input
              type="date"
              name="date1"
              value={date1}
              onChange={(e) => setDate1(e.target.value)}
              aria-invalid={busy1 || undefined}
              required
              className={`${INPUT} ${busy1 ? "border-red-400" : ""}`}
            />
            {busy1 && busyMessage}
          </label>
          <label className="block">
            <span className="text-xs text-zinc-600">Start time</span>
            <select
              name="time1"
              value={time1}
              onChange={(e) => setTime1(e.target.value)}
              required
              className={INPUT}
            >
              {TIME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Option 2
          </div>
          <label className="block">
            <span className="text-xs text-zinc-600">Date</span>
            <input
              type="date"
              name="date2"
              value={date2}
              onChange={(e) => setDate2(e.target.value)}
              aria-invalid={busy2 || same || undefined}
              required
              className={`${INPUT} ${busy2 || same ? "border-red-400" : ""}`}
            />
            {busy2 && busyMessage}
            {!busy2 && same && (
              <p role="alert" className="mt-1 text-xs text-red-700">
                Please pick two different dates.
              </p>
            )}
          </label>
          <label className="block">
            <span className="text-xs text-zinc-600">Start time</span>
            <select
              name="time2"
              value={time2}
              onChange={(e) => setTime2(e.target.value)}
              required
              className={INPUT}
            >
              {TIME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Your venue
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-zinc-600">Venue name and location</span>
            <input
              type="text"
              name="venue_location"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              required
              placeholder="e.g. St Andrews Sports Centre, Booterstown"
              className={INPUT}
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-600">
              Google Maps link <span className="text-zinc-400">(optional)</span>
            </span>
            <input
              type="url"
              name="venue_map_link"
              value={mapLink}
              onChange={(e) => setMapLink(e.target.value)}
              placeholder="https://maps.google.com/…"
              className={INPUT}
            />
          </label>
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-zinc-800">
          Additional comment or message{" "}
          <span className="font-normal text-zinc-500">(optional)</span>
        </span>
        <span className="mt-0.5 block text-xs text-zinc-500">
          Anything Knocklyon should know about your dates or venue? Include it
          here and we&rsquo;ll see it when we pick a date.
        </span>
        <textarea
          name="note"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="e.g. The first date is preferred; the second is tight but doable."
          className="mt-2 w-full rounded border border-zinc-300 px-3 py-2 text-sm resize-y"
        />
      </label>

      {state.error && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm"
        >
          {state.error}
        </div>
      )}

      <SubmitButton
        pending={isPending}
        disabled={blocked}
        className="rounded bg-forest px-4 py-2 text-white text-sm hover:bg-forest-dark disabled:opacity-60"
        pendingLabel={alreadyProposed ? "Updating…" : "Submitting…"}
      >
        {alreadyProposed ? "Update proposal" : "Submit proposal"}
      </SubmitButton>
    </form>
  );
}
