import { NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/server/workspace-context";
import { maybeAutoPullGoogleCalendar } from "@/server/services/google-calendar-auto-pull";

export async function POST() {
  try {
    const { user, organization } = await requireWorkspaceContext({ allowRedirect: false });
    const result = await maybeAutoPullGoogleCalendar(organization.id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message.startsWith("UNAUTHORIZED") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
