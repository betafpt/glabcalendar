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

async function runMigrations() {
  console.log("=== APPLYING G.LAB ARCHITECTURE MIGRATIONS ===");
  try {
    // 1. Users table extension
    console.log("1. Updating users table...");
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone_number text,
      ADD COLUMN IF NOT EXISTS phone_verified timestamp with time zone,
      ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
    `;

    // 2. Organization Memberships
    console.log("2. Creating organization_memberships table...");
    await sql`
      CREATE TABLE IF NOT EXISTS organization_memberships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role text NOT NULL DEFAULT 'MEMBER',
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS organization_memberships_user_org_uidx 
      ON organization_memberships (user_id, organization_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS organization_memberships_org_idx 
      ON organization_memberships (organization_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS organization_memberships_user_idx 
      ON organization_memberships (user_id);
    `;

    // 3. Crew Members user_id
    console.log("3. Updating crew_members table...");
    await sql`
      ALTER TABLE crew_members 
      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL;
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS crew_members_user_id_idx 
      ON crew_members (user_id);
    `;

    // 4. Google Calendar Connections user_id
    console.log("4. Updating google_calendar_connections table...");
    await sql`
      ALTER TABLE google_calendar_connections 
      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS google_calendar_connections_user_id_idx 
      ON google_calendar_connections (user_id);
    `;

    // 5. Clients table
    console.log("5. Creating clients table...");
    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        id text PRIMARY KEY,
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name text NOT NULL,
        projects integer NOT NULL DEFAULT 0,
        email text,
        phone text,
        website text,
        address text,
        description text,
        notes text,
        contacts text,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS clients_organization_id_idx 
      ON clients (organization_id);
    `;

    // 6. Shoot Assignees (Event Assignees)
    console.log("6. Creating shoot_assignees table...");
    await sql`
      CREATE TABLE IF NOT EXISTS shoot_assignees (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        shoot_id uuid NOT NULL REFERENCES shoots(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role text,
        status text NOT NULL DEFAULT 'pending',
        assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
        assigned_at timestamp with time zone NOT NULL DEFAULT now(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS shoot_assignees_shoot_user_uidx 
      ON shoot_assignees (shoot_id, user_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS shoot_assignees_shoot_idx 
      ON shoot_assignees (shoot_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS shoot_assignees_user_idx 
      ON shoot_assignees (user_id);
    `;

    // 7. Pending Invitations
    console.log("7. Creating pending_invitations table...");
    await sql`
      CREATE TABLE IF NOT EXISTS pending_invitations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email text NOT NULL,
        role text NOT NULL DEFAULT 'MEMBER',
        invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
        status text NOT NULL DEFAULT 'pending',
        token text NOT NULL UNIQUE,
        expires_at timestamp with time zone NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS pending_invitations_email_status_idx 
      ON pending_invitations (email, status);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS pending_invitations_org_idx 
      ON pending_invitations (organization_id);
    `;

    // 8. Notifications
    console.log("8. Creating notifications table...");
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        type text NOT NULL,
        title text NOT NULL,
        message text NOT NULL,
        entity_type text,
        entity_id text,
        read_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS notifications_user_read_idx 
      ON notifications (user_id, read_at);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS notifications_user_created_idx 
      ON notifications (user_id, created_at);
    `;

    // 9. AI Provider Credentials
    console.log("9. Creating ai_provider_credentials table...");
    await sql`
      CREATE TABLE IF NOT EXISTS ai_provider_credentials (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_type text NOT NULL,
        owner_id text NOT NULL,
        provider text NOT NULL,
        encrypted_secret text NOT NULL,
        secret_last4 text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        last_used_at timestamp with time zone,
        revoked_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS ai_provider_credentials_owner_provider_status_idx 
      ON ai_provider_credentials (owner_type, owner_id, provider, status);
    `;

    // 10. AI Entitlements
    console.log("10. Creating ai_entitlements table...");
    await sql`
      CREATE TABLE IF NOT EXISTS ai_entitlements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_type text NOT NULL,
        owner_id text NOT NULL,
        plan text NOT NULL DEFAULT 'free',
        status text NOT NULL DEFAULT 'active',
        monthly_credits integer NOT NULL DEFAULT 100,
        used_credits integer NOT NULL DEFAULT 0,
        reset_at timestamp with time zone NOT NULL,
        allow_byok boolean NOT NULL DEFAULT true,
        allow_managed_ai boolean NOT NULL DEFAULT false,
        allowed_models text NOT NULL DEFAULT 'gpt-4o',
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS ai_entitlements_owner_uidx 
      ON ai_entitlements (owner_type, owner_id);
    `;

    // 11. AI Usages
    console.log("11. Creating ai_usages table...");
    await sql`
      CREATE TABLE IF NOT EXISTS ai_usages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text,
        workspace_id text,
        provider text NOT NULL,
        model text NOT NULL,
        capability text NOT NULL,
        input_tokens integer NOT NULL DEFAULT 0,
        output_tokens integer NOT NULL DEFAULT 0,
        total_tokens integer NOT NULL DEFAULT 0,
        estimated_cost text,
        credits_used integer NOT NULL DEFAULT 1,
        credential_source text NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS ai_usages_user_time_idx 
      ON ai_usages (user_id, created_at);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS ai_usages_workspace_time_idx 
      ON ai_usages (workspace_id, created_at);
    `;

    // 12. Bootstrap SUPER_ADMIN and Workspace Ownership
    console.log("12. Bootstrapping betafpt@gmail.com and workspace ownership...");
    const superAdminEmail = (process.env.GLAB_SUPER_ADMIN_EMAIL || "betafpt@gmail.com").trim().toLowerCase();
    
    // Update role for super admin
    await sql`
      UPDATE users 
      SET role = 'super_admin' 
      WHERE lower(trim(email)) = ${superAdminEmail};
    `;

    const superAdminUsers = await sql`
      SELECT id, email, name FROM users WHERE lower(trim(email)) = ${superAdminEmail}
    `;

    if (superAdminUsers.length > 0) {
      const superAdmin = superAdminUsers[0];
      console.log(`   - Verified super_admin user: ${superAdmin.email} (${superAdmin.id})`);

      // Find G.Lab Studio organization
      const defaultOrgs = await sql`
        SELECT id, name FROM organizations WHERE id = '10000000-0000-0000-0000-000000000001'
      `;
      let orgId = defaultOrgs[0]?.id;
      if (!orgId) {
        const anyOrgs = await sql`SELECT id, name FROM organizations LIMIT 1`;
        orgId = anyOrgs[0]?.id;
      }

      if (orgId) {
        // Link superAdmin as OWNER of G.Lab Studio
        await sql`
          INSERT INTO organization_memberships (organization_id, user_id, role)
          VALUES (${orgId}, ${superAdmin.id}, 'OWNER')
          ON CONFLICT (user_id, organization_id) 
          DO UPDATE SET role = 'OWNER', updated_at = now();
        `;
        console.log(`   - Assigned OWNER of workspace ${orgId} to ${superAdmin.email}`);

        // Update google_calendar_connections user_id
        await sql`
          UPDATE google_calendar_connections 
          SET user_id = ${superAdmin.id}
          WHERE organization_id = ${orgId} AND account_email = ${superAdmin.email};
        `;
        console.log(`   - Associated Google Calendar connection with user ${superAdmin.id}`);
      }
    }

    // Also check other existing users like betafpt2108@gmail.com (USER_B)
    const otherUsers = await sql`
      SELECT id, email, name FROM users WHERE lower(trim(email)) != ${superAdminEmail}
    `;
    for (const u of otherUsers) {
      // Check if user has any membership
      const existingMemberships = await sql`
        SELECT id FROM organization_memberships WHERE user_id = ${u.id}
      `;
      if (existingMemberships.length === 0) {
        // Create an isolated workspace for USER_B
        const wsName = `${u.name || u.email.split("@")[0]}'s Studio`;
        const [newOrg] = await sql`
          INSERT INTO organizations (name, timezone)
          VALUES (${wsName}, 'Asia/Ho_Chi_Minh')
          RETURNING id, name;
        `;
        await sql`
          INSERT INTO organization_memberships (organization_id, user_id, role)
          VALUES (${newOrg.id}, ${u.id}, 'OWNER');
        `;
        console.log(`   - Created isolated workspace "${newOrg.name}" (${newOrg.id}) for user ${u.email} as OWNER`);
      }
    }

    console.log("\n✓ All schema extensions and bootstraps successfully applied!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
