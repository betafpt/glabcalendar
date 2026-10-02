/**
 * Minimum required scopes for Google Calendar synchronization.
 * 'https://www.googleapis.com/auth/calendar.events' grants access to create, view,
 * update, and delete events on the user's calendars without broad calendar management permissions.
 */
export const GOOGLE_CALENDAR_MINIMUM_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "openid",
  "email",
  "profile",
] as const;

export const GOOGLE_CALENDAR_SCOPES_STRING = GOOGLE_CALENDAR_MINIMUM_SCOPES.join(" ");

export interface CalendarProviderDateTime {
  dateTime: string; // ISO 8601 string
  timeZone?: string;
}

export interface CalendarProviderEvent {
  id?: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  start: CalendarProviderDateTime;
  end: CalendarProviderDateTime;
  status?: "confirmed" | "tentative" | "cancelled";
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
  updated?: string; // ISO 8601 string from Google
}

export interface CalendarChange {
  eventType: "created" | "updated" | "deleted";
  externalEventId: string;
  etag?: string;
  event?: CalendarProviderEvent;
  updatedAt?: Date;
}

export interface PullChangesResult {
  changes: CalendarChange[];
  nextSyncToken?: string;
}

export interface CalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
  timeZone?: string;
}

export interface UserProfileInfo {
  email?: string;
  name?: string;
  picture?: string;
}

export interface CalendarProvider {
  createEvent(
    calendarId: string,
    event: CalendarProviderEvent
  ): Promise<{ externalEventId: string; etag?: string }>;

  updateEvent(
    calendarId: string,
    externalEventId: string,
    event: CalendarProviderEvent
  ): Promise<{ externalEventId: string; etag?: string }>;

  deleteEvent(calendarId: string, externalEventId: string): Promise<void>;

  pullChanges(
    calendarId: string,
    syncToken?: string | null
  ): Promise<PullChangesResult>;

  getUserInfo(): Promise<UserProfileInfo>;

  listCalendars(): Promise<CalendarInfo[]>;
}

export class GoogleAuthRevokedError extends Error {
  constructor(message = "Google authorization has been revoked or expired.") {
    super(message);
    this.name = "GoogleAuthRevokedError";
  }
}

export class GoogleAuthExpiredError extends Error {
  constructor(message = "Google access token has expired and could not be refreshed.") {
    super(message);
    this.name = "GoogleAuthExpiredError";
  }
}

export class GoogleApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

export type SyncDirection = "two_way" | "to_google" | "from_google";

export interface SyncOptions {
  shoots: boolean;
  meetings: boolean;
  locationScout: boolean;
  internalEvents: boolean;
  fromGoogle: boolean;
  toGoogle: boolean;
}
