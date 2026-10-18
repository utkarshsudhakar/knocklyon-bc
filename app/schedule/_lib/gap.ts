export const MIN_GAP_DAYS = 3;

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function daysBetween(a: string, b: string): number {
  return Math.abs(dayNumber(a) - dayNumber(b));
}

/** A busy date that is a different day but closer than MIN_GAP_DAYS to `date`. */
export function tooCloseDate(date: string, busy: Iterable<string>): string | null {
  if (!date) return null;
  for (const b of busy) {
    const gap = daysBetween(date, b);
    if (gap > 0 && gap < MIN_GAP_DAYS) return b;
  }
  return null;
}
