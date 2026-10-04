import { describe, expect, it } from "vitest";
import {
  classifyGoogleCalendarSource,
  isGoogleBirthdayCalendarId,
  isSafeGoogleBirthdayCleanupCandidate,
} from "./google-calendar-sources";

const birthdayId = "addressbook#contacts@group.v.calendar.google.com";
const holidayId = "vi.vietnamese#holiday@group.v.calendar.google.com";

describe("Google Calendar source classification", () => {
  it("classifies Google Birthdays by stable calendar identity", () => {
    expect(isGoogleBirthdayCalendarId(birthdayId)).toBe(true);
    expect(classifyGoogleCalendarSource({ id: birthdayId, accessRole: "reader" })).toBe("birthdays");
  });

  it("keeps Holidays as a distinct, allowed system calendar", () => {
    expect(classifyGoogleCalendarSource({ id: holidayId, accessRole: "reader" })).toBe("holidays");
  });

  it("does not classify a normal calendar from its birthday-looking title", () => {
    expect(isGoogleBirthdayCalendarId("studio-production@example.com")).toBe(false);
  });

  it("only marks strongly-linked Google birthday rows as safe cleanup candidates", () => {
    const safe = {
      syncPolicy: "google",
      projectId: null,
      sourceCalendarId: birthdayId,
      externalEventId: "evt-1",
      mappingProvider: "google",
      mappingCalendarId: birthdayId,
      mappingEventId: "evt-1",
    };
    expect(isSafeGoogleBirthdayCleanupCandidate(safe)).toBe(true);
    expect(isSafeGoogleBirthdayCleanupCandidate({ ...safe, syncPolicy: "local_only" })).toBe(false);
    expect(isSafeGoogleBirthdayCleanupCandidate({ ...safe, projectId: "project-1" })).toBe(false);
    expect(isSafeGoogleBirthdayCleanupCandidate({ ...safe, sourceCalendarId: "normal@example.com", mappingCalendarId: "normal@example.com" })).toBe(false);
    expect(isSafeGoogleBirthdayCleanupCandidate({ ...safe, mappingEventId: "evt-other" })).toBe(false);
  });
});
