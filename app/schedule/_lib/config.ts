// Venue capacity by day of the week. This drives how many parallel matches
// Knocklyon can host on a given weekday and matches the club's real venue.
//
// Values are indexed by `Date.getDay()`:
//   0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
//   4 = Thursday, 5 = Friday, 6 = Saturday
//
// A value of 0 means the club cannot host on that day.

export const WEEKDAY_CAPACITY: Record<number, number> = {
  0: 0, // Sunday
  1: 3, // Monday      — preferred hosting night, 3 courts
  2: 1, // Tuesday     — club night, 1 court (avoid unless necessary)
  3: 0, // Wednesday
  4: 1, // Thursday    — club night, 1 court (avoid unless necessary)
  5: 0, // Friday
  6: 0, // Saturday
};

/** Days where hosting is possible (capacity > 0). */
export function hostableDays(): number[] {
  return Object.entries(WEEKDAY_CAPACITY)
    .filter(([, cap]) => cap > 0)
    .map(([d]) => parseInt(d, 10));
}

/** Parse an ISO date string ("2026-09-14") to its weekday (0-6). */
export function weekdayOf(iso: string): number {
  // Use noon UTC to avoid DST edge cases when parsing pure date strings.
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/** Venue capacity for a given date. Returns 0 if the club can't host. */
export function capacityForDate(iso: string): number {
  return WEEKDAY_CAPACITY[weekdayOf(iso)] ?? 0;
}

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Captain-facing constraints. Admins can still add Tue/Thu manually via
// AddTeamSlotForm — these limits only affect the captain self-service portal.
export const CAPTAIN_ALLOWED_WEEKDAYS = [1]; // Mondays only

// Season runs Nov 1 → Mar 31. Rolls over in July: before July we're still in
// the season that started last November; from July on we're pointing at the
// upcoming season.
export function getCurrentSeason(now: Date = new Date()): {
  startISO: string;
  endISO: string;
} {
  const seasonStartYear =
    now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    startISO: `${seasonStartYear}-11-01`,
    endISO: `${seasonStartYear + 1}-03-31`,
  };
}

export function isCaptainAllowedDate(
  iso: string,
  now: Date = new Date()
): boolean {
  if (!CAPTAIN_ALLOWED_WEEKDAYS.includes(weekdayOf(iso))) return false;
  const { startISO, endISO } = getCurrentSeason(now);
  return iso >= startISO && iso <= endISO;
}
