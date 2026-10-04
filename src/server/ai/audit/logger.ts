
export interface LogAIMutationParams {
  organizationId: string;
  userId?: string | null;
  originalRequest: string;
  actionType: string;
  proposedAction: Record<string, unknown>;
  validatedAction: Record<string, unknown>;
  affectedEntityIds: string[];
  result: "confirmed_executed" | "cancelled_by_user" | "rejected_validation_error";
}

export async function logAIMutation(params: LogAIMutationParams): Promise<void> {
  try {
    const { db } = await import("@/server/db");
    const { aiAuditLogs } = await import("@/server/db/schema");
    await db.insert(aiAuditLogs).values({
      organizationId: params.organizationId,
      userId: params.userId ?? null,
      originalRequest: params.originalRequest,
      actionType: params.actionType,
      proposedAction: JSON.stringify(params.proposedAction),
      validatedAction: JSON.stringify(params.validatedAction),
      affectedEntityIds: JSON.stringify(params.affectedEntityIds),
      result: params.result,
    });
  } catch (err) {
    // In test environment or disconnected database, do not crash application
    console.warn("Failed to write AI audit log:", err instanceof Error ? err.message : String(err));
  }
}

