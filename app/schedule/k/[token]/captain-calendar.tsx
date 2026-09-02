"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { captainAddDates } from "./actions";
import SubmitButton from "../../_lib/submit-button";

type Props = {
  token: string;
  existingDates: string[]; // ISO "YYYY-MM-DD"
  hostableWeekdays: number[]; // e.g. [1, 2, 4]
};

export default function CaptainCalendar({
  token,
  existingDates,
  hostableWeekdays,
}: Props) {
  const [selected, setSelected] = useState<Date[]>([]);

  const { hostableSet, existingSet, existingAsDates, defaultMonth, today } =
    useMemo(() => {
      const hostableSet = new Set(hostableWeekdays);
      const existingSet = new Set(existingDates);
      const existingAsDates = existingDates.map(parseIso);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const defaultMonth = existingAsDates[0] ?? now;
      return {
        hostableSet,
        existingSet,
        existingAsDates,
        defaultMonth,
        today: now,
      };
    }, [existingDates, hostableWeekdays]);

  function isDisabled(day: Date): boolean {
    if (day < today) return true;
    if (!hostableSet.has(day.getDay())) return true;
    if (existingSet.has(dateKey(day))) return true;
    return false;
  }

  const canSubmit = selected.length > 0;
  const selectedIso = selected.map((d) => dateKey(d)).join(",");

  return (
    <div className="space-y-4">
      <div className="rounded border border-zinc-200 p-3 sm:p-4 bg-white inline-block">
        <DayPicker
          mode="multiple"
          selected={selected}
          onSelect={(dates) => setSelected(dates ?? [])}
          defaultMonth={defaultMonth}
          disabled={isDisabled}
          modifiers={{ existing: existingAsDates }}
          modifiersClassNames={{
            existing: "rdp-existing",
            selected: "rdp-selected",
          }}
          showOutsideDays
        />
        <style>{`
          .rdp-existing:not(.rdp-day_disabled) {
            background: rgb(27 94 53 / 0.15);
            color: #1B5E35;
            font-weight: 600;
          }
          .rdp-day_disabled.rdp-existing {
            background: rgb(27 94 53 / 0.15);
            color: #1B5E35;
            font-weight: 600;
            opacity: 0.7;
          }
          .rdp-selected {
            background: #1B5E35 !important;
            color: white !important;
          }
          .rdp-day_disabled { color: #a1a1aa; }
        `}</style>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-forest" /> Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-forest/15 border border-forest/40" />
          Already added
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-zinc-100" /> Not hostable
        </span>
      </div>

      {canSubmit ? (
        <form action={captainAddDates} className="space-y-2">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="dates" value={selectedIso} />
          <SubmitButton
            className="rounded bg-forest px-5 py-2 text-white text-sm font-medium hover:bg-forest-dark disabled:bg-forest/70"
            pendingLabel={`Adding ${selected.length} date${selected.length === 1 ? "" : "s"}…`}
          >
            Add {selected.length} date{selected.length === 1 ? "" : "s"}
          </SubmitButton>
          <p className="text-xs text-zinc-500">
            Matches start at 8:00 PM by default.
          </p>
        </form>
      ) : (
        <p className="text-sm text-zinc-500">
          Click one or more Mondays (or Tue / Thu if needed) to select them,
          then hit <strong>Add</strong>.
        </p>
      )}
    </div>
  );
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}
