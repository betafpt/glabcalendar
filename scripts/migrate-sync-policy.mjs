import postgres from "postgres";
import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[match[1].trim()] = val;
      }
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("No DATABASE_URL found.");
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

async function run() {
  console.log("Applying schema extensions for sync policy & test data...");
  try {
    await sql`
      ALTER TABLE shoots 
      ADD COLUMN IF NOT EXISTS sync_policy text NOT NULL DEFAULT 'local_only',
      ADD COLUMN IF NOT EXISTS is_test_data boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS source_calendar_id text,
      ADD COLUMN IF NOT EXISTS external_event_id text;
    `;
    console.log("✓ Added shoots columns (sync_policy, is_test_data, source_calendar_id, external_event_id)");

    await sql`
      CREATE INDEX IF NOT EXISTS shoots_is_test_data_idx ON shoots (organization_id, is_test_data);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS shoots_sync_policy_idx ON shoots (organization_id, sync_policy);
    `;
    console.log("✓ Created indexes on shoots");

    await sql`
      ALTER TABLE google_calendar_connections
      ADD COLUMN IF NOT EXISTS target_calendar_id text,
      ADD COLUMN IF NOT EXISTS source_calendar_ids text;
    `;
    console.log("✓ Added google_calendar_connections columns (target_calendar_id, source_calendar_ids)");

    console.log("All migration steps succeeded!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
