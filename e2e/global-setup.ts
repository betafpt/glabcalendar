import type { FullConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { spawn } from "node:child_process";


function runSeed(env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/seed-demo.mjs"], {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Demo seed exited with code ${code ?? "unknown"}.`));
    });
  });
}

export default async function globalSetup(config?: FullConfig) {
  void config;
  loadEnvConfig(process.cwd());

  const timezone = process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";
  process.env.APP_TIMEZONE = timezone;
  process.env.TZ = timezone;

  if (!process.env.DATABASE_URL) {
    console.warn("[Playwright Global Setup] DATABASE_URL is not set. Skipping demo seed.");
    return;
  }

  console.log(`[Playwright Global Setup] Seeding deterministic demo data for timezone: ${timezone}`);
  await runSeed({
    ...process.env,
    APP_TIMEZONE: timezone,
    TZ: timezone,
  });
}
