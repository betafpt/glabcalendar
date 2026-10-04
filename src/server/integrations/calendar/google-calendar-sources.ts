import type { CalendarInfo } from "./types";

export type GoogleCalendarSourceType =
  | "primary"
  | "birthdays"
  | "holidays"
  | "user"
  | "subscribed";

const BIRTHDAY_SUFFIX = "#contacts@group.v.calendar.google.com";
const HOLIDAY_SUFFIX = "#holiday@group.v.calendar.google.com";

export function isGoogleBirthdayCalendarId(calendarId: string | null | undefined): boolean {
  if (!calendarId) return false;
  const normalized = calendarId.trim().toLowerCase();
  return (
    normalized.includes("contacts@group.v.calendar.google.com") ||
    normalized.endsWith(BIRTHDAY_SUFFIX)
  );
}

export function isGoogleHolidayCalendarId(calendarId: string | null | undefined): boolean {
  return Boolean(calendarId?.trim().toLowerCase().endsWith(HOLIDAY_SUFFIX));
}

export function classifyGoogleCalendarSource(
  calendar: Pick<CalendarInfo, "id" | "primary" | "accessRole">
): GoogleCalendarSourceType {
  if (calendar.primary || calendar.id === "primary") return "primary";
  if (isGoogleBirthdayCalendarId(calendar.id)) return "birthdays";
  if (isGoogleHolidayCalendarId(calendar.id)) return "holidays";
  if (calendar.accessRole === "owner" || calendar.accessRole === "writer") return "user";
  return "subscribed";
}

export function isSafeGoogleBirthdayCleanupCandidate(row: {
  syncPolicy: string | null | undefined;
  projectId: string | null | undefined;
  sourceCalendarId: string | null | undefined;
  externalEventId: string | null | undefined;
  mappingProvider: string | null | undefined;
  mappingCalendarId: string | null | undefined;
  mappingEventId: string | null | undefined;
}): boolean {
  if (row.syncPolicy !== "google" || row.projectId || !row.externalEventId) return false;
  if (row.mappingProvider !== "google" || row.mappingEventId !== row.externalEventId) return false;
  return (
    isGoogleBirthdayCalendarId(row.sourceCalendarId) ||
    isGoogleBirthdayCalendarId(row.mappingCalendarId)
  );
}
