import postgres from "postgres";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.trim().match(/^([^#=][^=]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1].trim()] = value;
  }
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.split("=");
  return [key, rest.join("=") || true];
}));
const organizationId = args.get("--organization");
const userId = args.get("--user");
const apply = args.has("--apply");
const confirmed = args.get("--confirm") === "MARK_GOOGLE_BIRTHDAYS_EXCLUDED";

if (typeof organizationId !== "string" || typeof userId !== "string") {
  throw new Error("Usage: node scripts/cleanup-google-birthdays.mjs --organization=<workspace-id> --user=<user-id> [--apply --confirm=MARK_GOOGLE_BIRTHDAYS_EXCLUDED]");
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function getCandidates(tx = sql) {
  return tx`
    SELECT s.id, s.title, s.starts_at, s.sync_policy, s.is_test_data,
           s.source_calendar_id, s.external_event_id,
           scs.external_calendar_id AS mapping_calendar_id,
           scs.external_event_id AS mapping_event_id
    FROM shoots s
    INNER JOIN shoot_calendar_sync scs
      ON scs.organization_id = s.organization_id
      AND scs.shoot_id = s.id
      AND scs.provider = 'google'
      AND scs.user_id = ${userId}
    WHERE s.organization_id = ${organizationId}
      AND s.sync_policy = 'google'
      AND s.project_id IS NULL
      AND s.external_event_id IS NOT NULL
      AND scs.external_event_id = s.external_event_id
      AND (
        LOWER(COALESCE(s.source_calendar_id, '')) LIKE '%#contacts@group.v.calendar.google.com'
        OR LOWER(COALESCE(scs.external_calendar_id, '')) LIKE '%#contacts@group.v.calendar.google.com'
      )
    ORDER BY s.starts_at ASC, s.id ASC
  `;
}

async function main() {
  const candidates = await getCandidates();
  console.log(`WORKSPACE=${organizationId}`);
  console.log(`USER=${userId}`);
  console.log(`SAFE_GOOGLE_BIRTHDAY_CANDIDATES=${candidates.length}`);
  console.table(candidates.map((row) => ({
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    sourceCalendarId: row.source_calendar_id,
    externalEventId: row.external_event_id,
    mappingCalendarId: row.mapping_calendar_id,
    syncPolicy: row.sync_policy,
    isTestData: row.is_test_data,
  })));

  if (!apply) {
    console.log("DRY-RUN ONLY: no database records were changed.");
    return;
  }
  if (!confirmed) throw new Error("Refusing apply without --confirm=MARK_GOOGLE_BIRTHDAYS_EXCLUDED");

  const updated = await sql.begin(async (tx) => {
    const ids = (await getCandidates(tx)).map((row) => row.id);
    if (ids.length === 0) return [];
    return tx`
      UPDATE shoots
      SET sync_policy = 'excluded', is_test_data = true, updated_at = now()
      WHERE organization_id = ${organizationId}
        AND id IN ${tx(ids)}
      RETURNING id
    `;
  });

  console.log(`MARKED_EXCLUDED=${updated.length}`);
  console.log("No Google Calendar delete API was called and no local rows were deleted.");
}

main().finally(() => sql.end());
