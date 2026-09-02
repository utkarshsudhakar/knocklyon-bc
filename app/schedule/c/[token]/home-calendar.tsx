"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { bookHomeDate } from "./actions";
import SubmitButton from "../../_lib/submit-button";

type SlotOption = {
  id: string;
  slot_date: string;
  match_time: string;
  is_available: boolean;
};

export default function HomeCalendar({
  token,
  fixtureId,
  slots,
}: {
  token: string;
  fixtureId: string;
  slots: SlotOption[];
}) {
  const { dateToSlot, availableDates, unavailableDates, defaultMonth } =
    useMemo(() => {
      const dateToSlot = new Map<string, SlotOption>();
      const availableDates: Date[] = [];
      const unavailableDates: Date[] = [];
      for (const s of slots) {
        const d = parseDateOnly(s.slot_date);
        dateToSlot.set(dateKey(d), s);
        (s.is_available ? availableDates : unavailableDates).push(d);
      }
      const defaultMonth =
        availableDates[0] ?? unavailableDates[0] ?? new Date();
      return { dateToSlot, availableDates, unavailableDates, defaultMonth };
    }, [slots]);

  const [selected, setSelected] = useState<Date | undefined>(undefined);

  const selectedSlot = selected ? dateToSlot.get(dateKey(selected)) : undefined;

  return (
    <div className="space-y-4">
      <div className="rounded border border-zinc-200 p-3 sm:p-4 bg-white inline-block">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={setSelected}
          defaultMonth={defaultMonth}
          disabled={[
            ...unavailableDates,
            (day: Date) => !dateToSlot.has(dateKey(day)),
          ]}
          modifiers={{ available: availableDates }}
          modifiersClassNames={{
            available: "rdp-available",
            selected: "rdp-selected",
          }}
          showOutsideDays
        />
        <style>{`
          .rdp-available:not(.rdp-day_disabled) {
            background: rgb(27 94 53 / 0.08);
            color: #1B5E35;
            font-weight: 600;
          }
          .rdp-selected {
            background: #1B5E35 !important;
            color: white !important;
          }
          .rdp-day_disabled { color: #a1a1aa; }
        `}</style>
      </div>

      {selected && selectedSlot ? (
        <div className="rounded border border-forest bg-forest/5 px-4 py-4 space-y-3">
          <div>
            <div className="text-sm text-zinc-600">Confirm this fixture?</div>
            <div className="text-lg font-medium text-forest">
              {formatFriendly(selected)}
            </div>
            <div className="text-sm text-zinc-800 mt-1">
              Start time: <strong>{formatTime(selectedSlot.match_time)}</strong>
            </div>
          </div>
          <form action={bookHomeDate} className="flex items-center gap-3">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="fixture_id" value={fixtureId} />
            <input type="hidden" name="slot_id" value={selectedSlot.id} />
            <SubmitButton
              className="rounded bg-forest px-4 py-2 text-white text-sm hover:bg-forest-dark"
              pendingLabel="Confirming…"
            >
              Yes, confirm
            </SubmitButton>
            <button
              type="button"
              onClick={() => setSelected(undefined)}
              className="text-sm text-zinc-500 hover:text-zinc-900"
            >
              Cancel
            </button>
          </form>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Highlighted dates are when Knocklyon can host. Click one to see the
          date &amp; start time before confirming.
        </p>
      )}
    </div>
  );
}

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

function formatFriendly(d: Date): string {
  return d.toLocaleDateString("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(hhmm: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":");
  const hn = parseInt(h, 10);
  if (!Number.isFinite(hn)) return hhmm;
  const period = hn >= 12 ? "pm" : "am";
  const h12 = hn % 12 === 0 ? 12 : hn % 12;
  return m === "00" ? `${h12}${period}` : `${h12}:${m}${period}`;
}
