import { zonedMidnightUtc } from "./calendar-range";

export const START_HOUR = 0;
export const END_HOUR = 24;
export const TOTAL_HOURS = END_HOUR - START_HOUR; // 24 hours
export const TOTAL_MINUTES = TOTAL_HOURS * 60; // 1440 mins

export const hourSlots = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
  const hour = START_HOUR + i;
  const label = `${String(hour).padStart(2, "0")}:00`;
  return { hour, label };
});

export type TimelineShootItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  isPastOrCompleted: boolean;
  projectId?: string | null;
  locationName?: string | null;
  crewNames?: string[];
};

export type TimelineDayData = {
  dateKey: string;
  dayNumber: number;
  dayName: string;
  isToday: boolean;
  isAnchor: boolean;
  dayIso: string;
  shoots: TimelineShootItem[];
};

export type PositionedShoot = {
  shoot: TimelineShootItem;
  top: string;
  height: string;
  left: string;
  width: string;
  zIndex: number;
  startMins: number;
  durationMins: number;
};

export function getMinutesInDay(isoString: string, timeZone: string): number {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 0;
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZone || "Asia/Ho_Chi_Minh",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(date);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return h * 60 + m;
  } catch {
    return 0;
  }
}

export function getDayBoundaries(dateKey: string, timeZone: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dayStart = zonedMidnightUtc(y, m, d, timeZone);
  const dayEnd = zonedMidnightUtc(y, m, d + 1, timeZone);
  return {
    dayStart,
    dayEnd,
    dayStartMs: dayStart.getTime(),
    dayEndMs: dayEnd.getTime(),
  };
}

export function computeDayShootPositions(
  shoots: TimelineShootItem[],
  dayKey: string,
  timeZone: string,
  hourHeight: number
): PositionedShoot[] {
  if (!shoots || shoots.length === 0) return [];

  const { dayStartMs, dayEndMs } = getDayBoundaries(dayKey, timeZone);
  const pixelsPerMinute = hourHeight / 60;

  const items = shoots
    .map((shoot) => {
      const rawStartMs = new Date(shoot.startsAt).getTime();
      let rawEndMs = new Date(shoot.endsAt).getTime();
      if (isNaN(rawStartMs)) return null;
      if (isNaN(rawEndMs) || rawEndMs <= rawStartMs) {
        rawEndMs = rawStartMs + 30 * 60_000;
      }

      // Overlap check: event starts before dayEnd and ends after dayStart
      if (rawStartMs >= dayEndMs || rawEndMs <= dayStartMs) {
        return null;
      }

      const segmentStartMs = Math.max(rawStartMs, dayStartMs);
      const segmentEndMs = Math.min(rawEndMs, dayEndMs);

      const startOffsetMinutes = Math.max(0, (segmentStartMs - dayStartMs) / 60_000);
      const endOffsetMinutes = Math.min(TOTAL_MINUTES, (segmentEndMs - dayStartMs) / 60_000);
      const segmentDurationMinutes = Math.max(0, endOffsetMinutes - startOffsetMinutes);

      if (segmentDurationMinutes <= 0) return null;

      return {
        shoot,
        startMins: startOffsetMinutes,
        endMins: endOffsetMinutes,
        durationMins: segmentDurationMinutes,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.startMins - b.startMins || b.durationMins - a.durationMins);

  if (items.length === 0) return [];

  // Detect overlapping clusters
  const clusters: (typeof items)[] = [];
  let currentCluster: typeof items = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0 || item.startMins < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMins);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMins;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const results: PositionedShoot[] = [];

  for (const cluster of clusters) {
    const totalCols = cluster.length;
    cluster.forEach((item, colIdx) => {
      const topPx = item.startMins * pixelsPerMinute;
      const heightPx = Math.max(1, item.durationMins * pixelsPerMinute);

      let left = "2px";
      let width = "calc(100% - 4px)";
      if (totalCols > 1) {
        const colWidthPct = (100 / totalCols).toFixed(2);
        left = `calc(${colIdx} * ${colWidthPct}% + 2px)`;
        width = `calc(${colWidthPct}% - 4px)`;
      }

      results.push({
        shoot: item.shoot,
        top: `${topPx}px`,
        height: `${heightPx}px`,
        left,
        width,
        zIndex: 10 + colIdx,
        startMins: item.startMins,
        durationMins: item.durationMins,
      });
    });
  }

  return results;
}

export function findEarliestEventMinuteBefore7am(
  days: TimelineDayData[],
  timeZone: string
): number | null {
  let earliest: number | null = null;

  for (const day of days) {
    const { dayStartMs, dayEndMs } = getDayBoundaries(day.dateKey, timeZone);

    for (const shoot of day.shoots) {
      const startMs = new Date(shoot.startsAt).getTime();
      let endMs = new Date(shoot.endsAt).getTime();
      if (isNaN(startMs)) continue;
      if (isNaN(endMs) || endMs <= startMs) {
        endMs = startMs + 30 * 60_000;
      }

      if (startMs >= dayEndMs || endMs <= dayStartMs) continue;

      const segmentStartMs = Math.max(startMs, dayStartMs);
      const startMins = Math.round((segmentStartMs - dayStartMs) / 60_000);

      if (startMins < 7 * 60) {
        if (earliest === null || startMins < earliest) {
          earliest = startMins;
        }
      }
    }
  }

  return earliest;
}

export function getDefaultScrollMinute(
  days: TimelineDayData[],
  timeZone: string
): number {
  const earliestBefore7am = findEarliestEventMinuteBefore7am(days, timeZone);
  if (earliestBefore7am !== null) {
    return Math.max(0, earliestBefore7am - 60);
  }
  return 7 * 60; // 07:00
}

export function getNowScrollMinute(currentMinutes: number): number {
  return Math.max(0, currentMinutes - 60);
}
