import { db } from "@/server/db";
import { createGoogleCalendarRepository } from "@/server/db/google-calendar";
import { getInitialOrganization } from "@/server/organization-context";
import { GoogleCalendarView, type GoogleCalendarViewProps } from "./google-calendar-view";

export const dynamic = "force-dynamic";

type ConnectionStatus = "connected" | "disconnected" | "revoked" | "error";

function normalizeConnectionStatus(status: unknown): ConnectionStatus {
  if (status === "revoked" || status === "error" || status === "disconnected") {
    return status;
  }
  return "connected";
}

interface PageProps {
  searchParams?: {
    status?: string;
    error?: string;
  };
}

export default async function GoogleCalendarPage({ searchParams }: PageProps) {
  let connection: GoogleCalendarViewProps["connection"] = null;
  let errorMessage: string | null = null;

  if (searchParams?.error) {
    if (searchParams.error === "MISSING_GOOGLE_CREDENTIALS") {
      errorMessage = "Hệ thống chưa cấu hình GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.";
    } else {
      errorMessage = searchParams.error;
    }
  }

  try {
    const organization = await getInitialOrganization();

    const calendarRepo = createGoogleCalendarRepository(db);
    const conn = await calendarRepo.getConnection(organization.id);

    if (conn) {
      connection = {
        id: conn.id,
        status: normalizeConnectionStatus(conn.status),
        accountEmail: conn.accountEmail,
        accountName: conn.accountName,
        calendarId: conn.calendarId,
        lastSyncedAt: conn.lastSyncedAt,
        lastSyncStatus: conn.lastSyncStatus,
        lastSyncMessage: conn.lastSyncMessage,
        syncEnabled: conn.syncEnabled,
        syncFromGoogle: conn.syncFromGoogle,
        syncToGoogle: conn.syncToGoogle,
        syncShoots: conn.syncShoots,
        syncMeetings: conn.syncMeetings,
        syncLocationScout: conn.syncLocationScout,
        syncInternalEvents: conn.syncInternalEvents,
      };
    }
  } catch (err) {
    console.error("Failed to load Google Calendar connection:", err);
  }

  return (
    <GoogleCalendarView
      connection={connection}
      errorMessage={errorMessage}
    />
  );
}
