export type CalendarView = "month" | "week" | "day";

function zoneOffsetMinutes(date: Date, timeZone: string) {
  const zoneName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = zoneName.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
}

export function zonedMidnightUtc(year: number, month: number, day: number, timeZone: string) {
  const guess = new Date(Date.UTC(year, month - 1, day));
  let result = new Date(guess.getTime() - zoneOffsetMinutes(guess, timeZone) * 60_000);
  result = new Date(guess.getTime() - zoneOffsetMinutes(result, timeZone) * 60_000);
  return result;
}

export function zonedDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

export function calendarRange(view: CalendarView, anchor: Date, timeZone: string) {
  const { year, month, day } = zonedDateParts(anchor, timeZone);
  if (view === "month") {
    return {
      start: zonedMidnightUtc(year, month, 1, timeZone),
      end: zonedMidnightUtc(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1, timeZone),
    };
  }
  const localNoon = new Date(Date.UTC(year, month - 1, day, 12));
  const mondayOffset = (localNoon.getUTCDay() + 6) % 7;
  const startDay = new Date(Date.UTC(year, month - 1, day - (view === "week" ? mondayOffset : 0)));
  const startParts = { year: startDay.getUTCFullYear(), month: startDay.getUTCMonth() + 1, day: startDay.getUTCDate() };
  const endDay = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day + (view === "week" ? 7 : 1)));
  return {
    start: zonedMidnightUtc(startParts.year, startParts.month, startParts.day, timeZone),
    end: zonedMidnightUtc(endDay.getUTCFullYear(), endDay.getUTCMonth() + 1, endDay.getUTCDate(), timeZone),
  };
}

export function shiftAnchor(anchor: Date, view: CalendarView, delta: number) {
  const shifted = new Date(anchor);
  if (view === "month") shifted.setUTCMonth(shifted.getUTCMonth() + delta);
  else shifted.setUTCDate(shifted.getUTCDate() + delta * (view === "week" ? 7 : 1));
  return shifted;
}
