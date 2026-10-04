/**
 * Tiện ích đo lường thời gian thực thi của Server Loaders / API
 * Phục vụ Audit và Performance Profiling cho G.Lab Calendar.
 */
export async function measureDuration<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  try {
    const result = await fn();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    if (process.env.NODE_ENV !== "production" || process.env.PERF_DEBUG === "true") {
      console.log(`[PERF] ${name} took ${durationMs}ms`);
    }
    return { result, durationMs };
  } catch (error) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    console.error(`[PERF_ERROR] ${name} failed after ${durationMs}ms:`, error);
    throw error;
  }
}
