import { db } from "@/server/db";
import { createGoogleCalendarRepository } from "@/server/db/google-calendar";
import { requireWorkspaceContext } from "@/server/workspace-context";
import { GoogleCalendarView, type GoogleCalendarViewProps } from "./google-calendar-view";

export const dynamic = "force-dynamic";

type ConnectionStatus = "connected" | "disconnected" | "revoked" | "error";

function normalizeConnectionStatus(status: unknown): ConnectionStatus {
  if (status === "revoked" || status === "error" || status === "disconnected") return status;
  return "connected";
}

interface PageProps { searchParams?: { error?: string } }

export default async function GoogleCalendarPage({ searchParams }: PageProps) {
  let connection: GoogleCalendarViewProps["connection"] = null;
  let errorMessage: string | null = searchParams?.error ?? null;
  if (searchParams?.error === "MISSING_GOOGLE_CREDENTIALS") {
    errorMessage = "Hệ thống chưa cấu hình Google OAuth.";
  }

  try {
    const { user, organization } = await requireWorkspaceContext();
    const conn = await createGoogleCalendarRepository(db).getUserConnection(organization.id, user.id);
    if (conn) {
      connection = {
        status: normalizeConnectionStatus(conn.status),
        accountEmail: conn.accountEmail,
        accountName: conn.accountName,
        lastSyncedAt: conn.lastSyncedAt,
        lastSyncStatus: conn.lastSyncStatus,
        lastSyncMessage: conn.lastSyncMessage,
        syncEnabled: conn.syncEnabled,
      };
    }
  } catch (err) {
    console.error("Failed to load Google Calendar connection:", err);
  }

  return <GoogleCalendarView connection={connection} errorMessage={errorMessage} />;
}
