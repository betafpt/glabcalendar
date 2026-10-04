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

async function dryRun() {
  console.log("=== G.LAB DRY-RUN MIGRATION REPORT ===");
  try {
    const users = await sql`SELECT id, name, email, role, created_at FROM users`;
    console.log(`\n1. Users count: ${users.length}`);
    for (const u of users) {
      console.log(`   - User: ${u.email} (id: ${u.id}, name: ${u.name}, role: ${u.role})`);
    }

    const accounts = await sql`SELECT user_id, provider, provider_account_id FROM accounts`;
    console.log(`\n2. Accounts count: ${accounts.length}`);
    for (const a of accounts) {
      console.log(`   - Account: provider=${a.provider}, user_id=${a.user_id}, provider_account_id=${a.provider_account_id}`);
    }

    const orgs = await sql`SELECT id, name, timezone, created_at FROM organizations`;
    console.log(`\n3. Organizations count: ${orgs.length}`);
    for (const o of orgs) {
      console.log(`   - Org: ${o.name} (id: ${o.id}, tz: ${o.timezone})`);
    }

    const googleConns = await sql`SELECT id, organization_id, calendar_id, account_email, account_name, sync_enabled FROM google_calendar_connections`;
    console.log(`\n4. Google Calendar Connections count: ${googleConns.length}`);
    for (const gc of googleConns) {
      console.log(`   - Conn: org_id=${gc.organization_id}, email=${gc.account_email}, name=${gc.account_name}, enabled=${gc.sync_enabled}`);
    }

    const projectsCount = await sql`SELECT count(*)::int as count FROM projects`;
    const shootsCount = await sql`SELECT count(*)::int as count FROM shoots`;
    const crewCount = await sql`SELECT count(*)::int as count FROM crew_members`;
    const equipCount = await sql`SELECT count(*)::int as count FROM equipment_items`;

    console.log(`\n5. Entity Counts:`);
    console.log(`   - Projects: ${projectsCount[0].count}`);
    console.log(`   - Shoots: ${shootsCount[0].count}`);
    console.log(`   - Crew: ${crewCount[0].count}`);
    console.log(`   - Equipment: ${equipCount[0].count}`);

    // Check if tables exist
    const checkTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('organization_memberships', 'workspace_memberships', 'pending_invitations', 'shoot_assignees', 'notifications', 'clients', 'ai_provider_credentials', 'ai_entitlements', 'ai_usages');
    `;
    console.log(`\n6. Modern Architecture Tables in DB:`);
    console.log(`   Existing tables:`, checkTables.map(t => t.table_name));

  } catch (err) {
    console.error("Dry run error:", err);
  } finally {
    await sql.end();
  }
}

dryRun();
