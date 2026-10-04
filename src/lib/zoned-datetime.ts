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

export function formatDateTimeLocal(date: Date | null, timeZone: string) {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

export function zonedDateTimeLocalToIso(value: string, timeZone: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return value;

  const [, year, month, day, hour, minute, second = "00"] = match;
  const localAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );

  let instant = new Date(localAsUtc - zoneOffsetMinutes(new Date(localAsUtc), timeZone) * 60_000);
  instant = new Date(localAsUtc - zoneOffsetMinutes(instant, timeZone) * 60_000);
  return instant.toISOString();
}

export function formatZonedDate(date: Date | null, timeZone: string): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatZonedTime(date: Date | null, timeZone: string): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

