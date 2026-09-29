export function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues?: Array<{ message?: unknown }> }).issues;
    const firstMessage = issues?.find((issue) => typeof issue.message === "string")?.message;
    if (typeof firstMessage === "string" && firstMessage.trim()) return firstMessage;
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}
