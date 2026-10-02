import postgres from "postgres";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const DEMO_ORGANIZATION_ID = "10000000-0000-0000-0000-000000000001";
const DEMO_PROJECT_IDS = [
  "20000000-0000-0000-0000-000000000001",
  "20000000-0000-0000-0000-000000000002",
  "20000000-0000-0000-0000-000000000003",
  "20000000-0000-0000-0000-000000000004",
];
const DEMO_SHOOT_IDS = [
  "30000000-0000-0000-0000-000000000001",
  "30000000-0000-0000-0000-000000000002",
  "30000000-0000-0000-0000-000000000003",
  "30000000-0000-0000-0000-000000000004",
  "30000000-0000-0000-0000-000000000005",
  "30000000-0000-0000-0000-000000000006",
];
const DEMO_CREW_IDS = [
  "40000000-0000-0000-0000-000000000001",
  "40000000-0000-0000-0000-000000000002",
  "40000000-0000-0000-0000-000000000003",
  "40000000-0000-0000-0000-000000000004",
  "40000000-0000-0000-0000-000000000005",
  "40000000-0000-0000-0000-000000000006",
];
const DEMO_EQUIPMENT_IDS = [
  "50000000-0000-0000-0000-000000000001",
  "50000000-0000-0000-0000-000000000002",
  "50000000-0000-0000-0000-000000000003",
  "50000000-0000-0000-0000-000000000004",
  "50000000-0000-0000-0000-000000000005",
  "50000000-0000-0000-0000-000000000006",
  "50000000-0000-0000-0000-000000000007",
  "50000000-0000-0000-0000-000000000008",
];
const DEMO_CHECKLIST_IDS = [
  "60000000-0000-0000-0000-000000000001",
  "60000000-0000-0000-0000-000000000002",
  "60000000-0000-0000-0000-000000000003",
  "60000000-0000-0000-0000-000000000004",
  "60000000-0000-0000-0000-000000000005",
  "60000000-0000-0000-0000-000000000006",
  "60000000-0000-0000-0000-000000000007",
  "60000000-0000-0000-0000-000000000008",
];

async function counts(sql) {
  const [projects, shoots, crew, equipment, checklist, assignments, bookings] = await Promise.all([
    sql`select count(*)::int as count from projects where id in ${sql(DEMO_PROJECT_IDS)}`,
    sql`select count(*)::int as count from shoots where id in ${sql(DEMO_SHOOT_IDS)}`,
    sql`select count(*)::int as count from crew_members where id in ${sql(DEMO_CREW_IDS)}`,
    sql`select count(*)::int as count from equipment_items where id in ${sql(DEMO_EQUIPMENT_IDS)}`,
    sql`select count(*)::int as count from shoot_checklist_items where id in ${sql(DEMO_CHECKLIST_IDS)}`,
    sql`select count(*)::int as count from shoot_crew_assignments where shoot_id in ${sql(DEMO_SHOOT_IDS)} or crew_member_id in ${sql(DEMO_CREW_IDS)}`,
    sql`select count(*)::int as count from equipment_bookings where shoot_id in ${sql(DEMO_SHOOT_IDS)} or equipment_item_id in ${sql(DEMO_EQUIPMENT_IDS)}`,
  ]);

  return {
    projects: projects[0].count,
    shoots: shoots[0].count,
    crew: crew[0].count,
    equipment: equipment[0].count,
    checklist: checklist[0].count,
    assignments: assignments[0].count,
    bookings: bookings[0].count,
  };
}

async function totals(sql) {
  const [projects, shoots, crew, equipment, organizations] = await Promise.all([
    sql`select count(*)::int as count from projects`,
    sql`select count(*)::int as count from shoots`,
    sql`select count(*)::int as count from crew_members`,
    sql`select count(*)::int as count from equipment_items`,
    sql`select id, name from organizations order by created_at asc`,
  ]);

  return {
    projects: projects[0].count,
    shoots: shoots[0].count,
    crew: crew[0].count,
    equipment: equipment[0].count,
    organizations,
  };
}

loadEnvConfig(process.cwd());
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const sql = postgres(databaseUrl, { max: 1 });

try {
  console.log("Demo rows before cleanup:", await counts(sql));
  console.log("Database totals:", await totals(sql));

  if (process.argv.includes("--check")) {
    process.exitCode = 0;
  } else {

    await sql.begin(async (tx) => {
      await tx`set local lock_timeout = '5s'`;
      await tx`set local statement_timeout = '20s'`;
    await tx`
      delete from shoot_crew_assignments
      where shoot_id in ${tx(DEMO_SHOOT_IDS)}
         or crew_member_id in ${tx(DEMO_CREW_IDS)}
    `;
    await tx`
      delete from equipment_bookings
      where shoot_id in ${tx(DEMO_SHOOT_IDS)}
         or equipment_item_id in ${tx(DEMO_EQUIPMENT_IDS)}
    `;
    await tx`delete from shoot_checklist_items where id in ${tx(DEMO_CHECKLIST_IDS)}`;
    await tx`delete from shoots where id in ${tx(DEMO_SHOOT_IDS)}`;
    await tx`delete from projects where id in ${tx(DEMO_PROJECT_IDS)}`;
    await tx`delete from crew_members where id in ${tx(DEMO_CREW_IDS)}`;
    await tx`delete from equipment_items where id in ${tx(DEMO_EQUIPMENT_IDS)}`;
    await tx`
      update organizations
      set name = 'G.Lab Studio', updated_at = now()
      where id = ${DEMO_ORGANIZATION_ID} and name = 'G.Lab Studio Demo'
    `;
    });

    console.log("Demo rows after cleanup:", await counts(sql));
    console.log("Database totals after cleanup:", await totals(sql));
  }
} finally {
  await sql.end();
}
