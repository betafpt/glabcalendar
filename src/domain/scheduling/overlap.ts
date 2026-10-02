/**
 * Canonical half-open interval temporal overlap rule:
 * Interval A: [aStart, aEnd)
 * Interval B: [bStart, bEnd)
 *
 * Overlap condition:
 * aStart < bEnd AND bStart < aEnd
 *
 * This allows one booking to end exactly when another begins (adjacent bookings),
 * while rejecting overlapping active bookings.
 */

export interface TimeInterval {
  startsAt: Date | string | number;
  endsAt: Date | string | number;
}

export function toDate(time: Date | string | number): Date {
  return time instanceof Date ? time : new Date(time);
}

/**
 * Evaluates whether two half-open intervals [startsAt, endsAt) overlap in time.
 * If either interval has startsAt >= endsAt (zero or negative duration), returns false.
 */
export function areIntervalsOverlapping(a: TimeInterval, b: TimeInterval): boolean {
  const aStart = toDate(a.startsAt).getTime();
  const aEnd = toDate(a.endsAt).getTime();
  const bStart = toDate(b.startsAt).getTime();
  const bEnd = toDate(b.endsAt).getTime();

  if (aStart >= aEnd || bStart >= bEnd) {
    return false;
  }

  return aStart < bEnd && bStart < aEnd;
}

/**
 * Returns true if interval A ends exactly when interval B starts, or vice versa.
 */
export function areIntervalsAdjacent(a: TimeInterval, b: TimeInterval): boolean {
  const aStart = toDate(a.startsAt).getTime();
  const aEnd = toDate(a.endsAt).getTime();
  const bStart = toDate(b.startsAt).getTime();
  const bEnd = toDate(b.endsAt).getTime();

  if (aStart >= aEnd || bStart >= bEnd) {
    return false;
  }

  return aEnd === bStart || bEnd === aStart;
}
