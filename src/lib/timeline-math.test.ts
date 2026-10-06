import { describe, expect, it } from "vitest";
import {
  START_HOUR,
  END_HOUR,
  TOTAL_HOURS,
  TOTAL_MINUTES,
  hourSlots,
  computeDayShootPositions,
  findEarliestEventMinuteBefore7am,
  getDefaultScrollMinute,
  getNowScrollMinute,
  type TimelineShootItem,
  type TimelineDayData,
} from "./timeline-math";

describe("Timeline Configuration and Range", () => {
  it("covers 00:00 through 24:00 (24 hours, 1440 minutes)", () => {
    expect(START_HOUR).toBe(0);
    expect(END_HOUR).toBe(24);
    expect(TOTAL_HOURS).toBe(24);
    expect(TOTAL_MINUTES).toBe(1440);
  });

  it("timeline labels cover 00:00 through 24:00", () => {
    expect(hourSlots).toHaveLength(25);
    expect(hourSlots[0]).toEqual({ hour: 0, label: "00:00" });
    expect(hourSlots[1]).toEqual({ hour: 1, label: "01:00" });
    expect(hourSlots[7]).toEqual({ hour: 7, label: "07:00" });
    expect(hourSlots[12]).toEqual({ hour: 12, label: "12:00" });
    expect(hourSlots[23]).toEqual({ hour: 23, label: "23:00" });
    expect(hourSlots[24]).toEqual({ hour: 24, label: "24:00" });
  });
});

describe("Early Event Rendering and Math (01:30 - 09:30)", () => {
  const timeZone = "Asia/Ho_Chi_Minh"; // GMT+7
  const hourHeight = 60; // 1px per minute for easy mental math
  const pixelsPerMinute = hourHeight / 60;

  it("renders 01:30-09:30 starting exactly at 01:30 without clamping to 07:00", () => {
    const shoot: TimelineShootItem = {
      id: "shoot-early",
      title: "Early Morning Shoot",
      startsAt: "2026-10-05T01:30:00+07:00",
      endsAt: "2026-10-05T09:30:00+07:00",
      status: "confirmed",
      isPastOrCompleted: false,
    };

    const positions = computeDayShootPositions([shoot], "2026-10-05", timeZone, hourHeight);
    expect(positions).toHaveLength(1);

    const pos = positions[0];
    const expectedStartMins = 1 * 60 + 30; // 90 mins
    const expectedDurationMins = 8 * 60; // 480 mins

    expect(pos.startMins).toBe(expectedStartMins);
    expect(pos.durationMins).toBe(expectedDurationMins);
    expect(pos.top).toBe(`${expectedStartMins * pixelsPerMinute}px`); // 90px
    expect(pos.height).toBe(`${expectedDurationMins * pixelsPerMinute}px`); // 480px
  });

  it("default scrolls near 00:30 for 01:30 event", () => {
    const days: TimelineDayData[] = [
      {
        dateKey: "2026-10-05",
        dayNumber: 5,
        dayName: "T2",
        isToday: false,
        isAnchor: true,
        dayIso: "2026-10-05T05:00:00.000Z",
        shoots: [
          {
            id: "shoot-early",
            title: "Early Morning Shoot",
            startsAt: "2026-10-05T01:30:00+07:00",
            endsAt: "2026-10-05T09:30:00+07:00",
            status: "confirmed",
            isPastOrCompleted: false,
          },
        ],
      },
    ];

    const earliest = findEarliestEventMinuteBefore7am(days, timeZone);
    expect(earliest).toBe(90); // 01:30

    const defaultScroll = getDefaultScrollMinute(days, timeZone);
    expect(defaultScroll).toBe(30); // 00:30 (90 - 60)
  });
});

describe("Cross-Midnight Rendering (23:00 - 02:00)", () => {
  const timeZone = "Asia/Ho_Chi_Minh";
  const hourHeight = 60; // 1px per minute
  const pixelsPerMinute = hourHeight / 60;

  const crossShoot: TimelineShootItem = {
    id: "shoot-cross",
    title: "Night Shoot",
    startsAt: "2026-10-05T23:00:00+07:00",
    endsAt: "2026-10-06T02:00:00+07:00",
    status: "confirmed",
    isPastOrCompleted: false,
  };

  it("renders 23:00-24:00 on start day (2026-10-05)", () => {
    const positionsDay1 = computeDayShootPositions([crossShoot], "2026-10-05", timeZone, hourHeight);
    expect(positionsDay1).toHaveLength(1);

    const pos1 = positionsDay1[0];
    const expectedStart1 = 23 * 60; // 1380
    const expectedDuration1 = 60; // 60 mins until midnight 24:00

    expect(pos1.startMins).toBe(expectedStart1);
    expect(pos1.durationMins).toBe(expectedDuration1);
    expect(pos1.top).toBe(`${expectedStart1 * pixelsPerMinute}px`);
    expect(pos1.height).toBe(`${expectedDuration1 * pixelsPerMinute}px`);
  });

  it("renders 00:00-02:00 on next day (2026-10-06)", () => {
    const positionsDay2 = computeDayShootPositions([crossShoot], "2026-10-06", timeZone, hourHeight);
    expect(positionsDay2).toHaveLength(1);

    const pos2 = positionsDay2[0];
    const expectedStart2 = 0; // 00:00 midnight
    const expectedDuration2 = 2 * 60; // 120 mins until 02:00

    expect(pos2.startMins).toBe(expectedStart2);
    expect(pos2.durationMins).toBe(expectedDuration2);
    expect(pos2.top).toBe("0px");
    expect(pos2.height).toBe(`${expectedDuration2 * pixelsPerMinute}px`);
  });

  it("does not render on day after end (2026-10-07)", () => {
    const positionsDay3 = computeDayShootPositions([crossShoot], "2026-10-07", timeZone, hourHeight);
    expect(positionsDay3).toHaveLength(0);
  });
});

describe("Midnight Boundary Handling", () => {
  const timeZone = "Asia/Ho_Chi_Minh";
  const hourHeight = 60;

  it("event ending exactly at midnight (23:00 - 24:00) does not render on next day", () => {
    const midnightEndShoot: TimelineShootItem = {
      id: "shoot-midnight-end",
      title: "Late Shoot Ending at Midnight",
      startsAt: "2026-10-05T23:00:00+07:00",
      endsAt: "2026-10-06T00:00:00+07:00",
      status: "confirmed",
      isPastOrCompleted: false,
    };

    const day1Positions = computeDayShootPositions([midnightEndShoot], "2026-10-05", timeZone, hourHeight);
    expect(day1Positions).toHaveLength(1);
    expect(day1Positions[0].startMins).toBe(1380);
    expect(day1Positions[0].durationMins).toBe(60);

    const day2Positions = computeDayShootPositions([midnightEndShoot], "2026-10-06", timeZone, hourHeight);
    expect(day2Positions).toHaveLength(0);
  });
});

describe("Smart Scroll Behaviors", () => {
  const timeZone = "Asia/Ho_Chi_Minh";

  it("defaults to 07:00 (420 mins) when no events are scheduled before 07:00", () => {
    const days: TimelineDayData[] = [
      {
        dateKey: "2026-10-05",
        dayNumber: 5,
        dayName: "T2",
        isToday: false,
        isAnchor: true,
        dayIso: "2026-10-05T05:00:00.000Z",
        shoots: [
          {
            id: "shoot-midday",
            title: "Morning Shoot",
            startsAt: "2026-10-05T09:00:00+07:00",
            endsAt: "2026-10-05T12:00:00+07:00",
            status: "confirmed",
            isPastOrCompleted: false,
          },
        ],
      },
    ];

    expect(getDefaultScrollMinute(days, timeZone)).toBe(7 * 60);
  });

  it("scrolls to max(00:00, earliest - 60m) when event starts at 00:30", () => {
    const days: TimelineDayData[] = [
      {
        dateKey: "2026-10-05",
        dayNumber: 5,
        dayName: "T2",
        isToday: false,
        isAnchor: true,
        dayIso: "2026-10-05T05:00:00.000Z",
        shoots: [
          {
            id: "shoot-midnight-start",
            title: "Midnight Shoot",
            startsAt: "2026-10-05T00:30:00+07:00",
            endsAt: "2026-10-05T03:00:00+07:00",
            status: "confirmed",
            isPastOrCompleted: false,
          },
        ],
      },
    ];

    // 30m - 60m = -30m, clamped to 00:00
    expect(getDefaultScrollMinute(days, timeZone)).toBe(0);
  });

  it("Today/Now button scrolls to current time with 1h lead", () => {
    // 10:30 AM (630 mins) => 09:30 AM (570 mins)
    expect(getNowScrollMinute(10 * 60 + 30)).toBe(9 * 60 + 30);

    // 00:45 AM (45 mins) => 00:00 AM (0 mins)
    expect(getNowScrollMinute(45)).toBe(0);

    // 14:00 PM (840 mins) => 13:00 PM (780 mins)
    expect(getNowScrollMinute(14 * 60)).toBe(13 * 60);
  });
});
