"use client";

import type { ReactNode } from "react";
import { MIN_GAP_DAYS, tooCloseDate } from "../_lib/gap";

export type NearMatch = {
  fixtureId: string;
  date: string;
  teamName: string;
  opponent: string;
};

function pretty(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function NearDateForm({
  action,
  matches,
  excludeFixtureId,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  matches: NearMatch[];
  excludeFixtureId?: string;
  className?: string;
  children: ReactNode;
}) {
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const date = String(new FormData(e.currentTarget).get("date") ?? "");
    const near = matches.find(
      (m) => m.fixtureId !== excludeFixtureId && tooCloseDate(date, [m.date])
    );
    if (
      near &&
      !window.confirm(
        `${pretty(date)} is less than ${MIN_GAP_DAYS} days from the ${near.teamName} match vs ${near.opponent} on ${pretty(near.date)}. This would be back-to-back games.\n\nSave this date anyway?`
      )
    ) {
      e.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={onSubmit} className={className}>
      {children}
    </form>
  );
}
