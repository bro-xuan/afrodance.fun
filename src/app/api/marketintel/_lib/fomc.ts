/**
 * FOMC decision dates (statement at 2:00pm ET), from federalreserve.gov.
 * `sep` meetings also publish the dot plot. Shared by the calendar and Fed
 * watch; add the next year's dates when the Fed publishes them.
 */
export const FOMC: { date: string; sep: boolean }[] = [
  { date: "2026-10-28", sep: false },
  { date: "2026-12-09", sep: true },
  { date: "2027-01-27", sep: false },
  { date: "2027-03-17", sep: true },
  { date: "2027-04-28", sep: false },
  { date: "2027-06-09", sep: true },
];

/** Wall-clock America/New_York → UTC ms, DST-correct via Intl. */
export function etToMs(date: string, hhmm: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(guess));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asNy = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"));
  return guess + (guess - asNy);
}
