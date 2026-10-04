import fs from "fs";
import path from "path";
import postgres from "postgres";

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1].trim()] = value;
  }
}

loadLocalEnv();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const migrationPath = path.resolve(
  process.cwd(),
  "drizzle/0012_primary_calendar_sync.sql",
);
const migration = fs.readFileSync(migrationPath, "utf8").replace(/^\uFEFF/, "");
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
});

try {
  await sql.begin(async (tx) => {
    await tx.unsafe(migration);
  });
  console.log("MIGRATION_0012=APPLIED");
} finally {
  await sql.end({ timeout: 2 });
}
