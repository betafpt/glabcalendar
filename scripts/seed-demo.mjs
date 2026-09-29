import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required to seed demo data.");

const sql = postgres(databaseUrl, { max: 1 });
const ids = {
  organization: "10000000-0000-0000-0000-000000000001",
  project: "20000000-0000-0000-0000-000000000001",
  shootToday: "30000000-0000-0000-0000-000000000001",
  shootTomorrow: "30000000-0000-0000-0000-000000000002",
  crewDop: "40000000-0000-0000-0000-000000000001",
  crewPhoto: "40000000-0000-0000-0000-000000000002",
  camera: "50000000-0000-0000-0000-000000000001",
  light: "50000000-0000-0000-0000-000000000002",
};

const now = Date.now();
const todayStart = new Date(now - 30 * 60 * 1000);
const todayEnd = new Date(now + 3.5 * 60 * 60 * 1000);
const tomorrowStart = new Date(now + 24 * 60 * 60 * 1000);
const tomorrowEnd = new Date(now + 28 * 60 * 60 * 1000);

try {
  await sql.begin(async (tx) => {
    await tx`insert into organizations (id, name, timezone) values (${ids.organization}, 'G.Lab Studio Demo', ${process.env.APP_TIMEZONE ?? "Asia/Ho_Chi_Minh"}) on conflict (id) do update set name = excluded.name, timezone = excluded.timezone, updated_at = now()`;
    await tx`insert into projects (id, organization_id, name, client_name, status, notes) values (${ids.project}, ${ids.organization}, 'Autumn Brand Film', 'Demo Client', 'active', 'Demo dataset for UI testing') on conflict (id) do update set name = excluded.name, client_name = excluded.client_name, status = excluded.status, notes = excluded.notes, updated_at = now()`;
    await tx`insert into crew_members (id, organization_id, name, default_role, email, status) values (${ids.crewDop}, ${ids.organization}, 'Minh Tran', 'DOP', 'minh@example.com', 'active'), (${ids.crewPhoto}, ${ids.organization}, 'Linh Nguyen', 'Photographer', 'linh@example.com', 'active') on conflict (id) do update set name = excluded.name, default_role = excluded.default_role, email = excluded.email, status = excluded.status, updated_at = now()`;
    await tx`insert into equipment_items (id, organization_id, name, category, asset_code, status) values (${ids.camera}, ${ids.organization}, 'Sony FX3', 'Camera', 'CAM-001', 'available'), (${ids.light}, ${ids.organization}, 'Aputure 600D', 'Lighting', 'LGT-001', 'available') on conflict (id) do update set name = excluded.name, category = excluded.category, asset_code = excluded.asset_code, status = excluded.status, updated_at = now()`;
    await tx`insert into shoots (id, organization_id, project_id, title, status, starts_at, ends_at, call_time, location_name) values (${ids.shootToday}, ${ids.organization}, ${ids.project}, 'Lifestyle Campaign — Day 1', 'confirmed', ${todayStart}, ${todayEnd}, ${todayStart}, 'G.Lab Studio'), (${ids.shootTomorrow}, ${ids.organization}, ${ids.project}, 'Lifestyle Campaign — Day 2', 'planned', ${tomorrowStart}, ${tomorrowEnd}, ${tomorrowStart}, 'Old Town Exterior') on conflict (id) do update set title = excluded.title, status = excluded.status, starts_at = excluded.starts_at, ends_at = excluded.ends_at, call_time = excluded.call_time, location_name = excluded.location_name, updated_at = now()`;
    await tx`insert into shoot_crew_assignments (organization_id, shoot_id, crew_member_id, role) values (${ids.organization}, ${ids.shootToday}, ${ids.crewDop}, 'DOP'), (${ids.organization}, ${ids.shootToday}, ${ids.crewPhoto}, 'Photographer') on conflict (shoot_id, crew_member_id) do update set role = excluded.role`;
    await tx`insert into equipment_bookings (organization_id, shoot_id, equipment_item_id, quantity) values (${ids.organization}, ${ids.shootToday}, ${ids.camera}, 1), (${ids.organization}, ${ids.shootToday}, ${ids.light}, 1) on conflict (shoot_id, equipment_item_id) do update set quantity = excluded.quantity`;
    await tx`delete from shoot_checklist_items where organization_id = ${ids.organization} and shoot_id = ${ids.shootToday}`;
    await tx`insert into shoot_checklist_items (organization_id, shoot_id, title, is_completed, sort_order, assigned_crew_member_id, completed_at) values (${ids.organization}, ${ids.shootToday}, 'Charge camera batteries', true, 10, ${ids.crewDop}, now()), (${ids.organization}, ${ids.shootToday}, 'Pack lighting kit', false, 20, ${ids.crewPhoto}, null), (${ids.organization}, ${ids.shootToday}, 'Confirm call sheet', false, 30, null, null)`;
  });
  console.log("Demo data seeded successfully.");
} finally {
  await sql.end();
}
