import postgres from "postgres";
import nextEnv from "@next/env";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const { loadEnvConfig } = nextEnv;

export const ids = {
  organization: "10000000-0000-0000-0000-000000000001",
  projects: {
    autumn: "20000000-0000-0000-0000-000000000001",
    coffee: "20000000-0000-0000-0000-000000000002",
    fashion: "20000000-0000-0000-0000-000000000003",
    documentary: "20000000-0000-0000-0000-000000000004",
  },
  shoots: {
    today: "30000000-0000-0000-0000-000000000001",
    tomorrow: "30000000-0000-0000-0000-000000000002",
    dayAfter: "30000000-0000-0000-0000-000000000003",
    nextWeek: "30000000-0000-0000-0000-000000000004",
    completed: "30000000-0000-0000-0000-000000000005",
    cancelled: "30000000-0000-0000-0000-000000000006",
  },
  crew: {
    dop: "40000000-0000-0000-0000-000000000001",
    photo: "40000000-0000-0000-0000-000000000002",
    producer: "40000000-0000-0000-0000-000000000003",
    gaffer: "40000000-0000-0000-0000-000000000004",
    sound: "40000000-0000-0000-0000-000000000005",
    assistant: "40000000-0000-0000-0000-000000000006",
  },
  gear: {
    fx3: "50000000-0000-0000-0000-000000000001",
    light600d: "50000000-0000-0000-0000-000000000002",
    fx6: "50000000-0000-0000-0000-000000000003",
    lens2470: "50000000-0000-0000-0000-000000000004",
    lens70200: "50000000-0000-0000-0000-000000000005",
    wireless: "50000000-0000-0000-0000-000000000006",
    tripod: "50000000-0000-0000-0000-000000000007",
    light300x: "50000000-0000-0000-0000-000000000008",
  },
  checklist: {
    batteries: "60000000-0000-0000-0000-000000000001",
    lighting: "60000000-0000-0000-0000-000000000002",
    callSheet: "60000000-0000-0000-0000-000000000003",
    mediaCards: "60000000-0000-0000-0000-000000000004",
    weather: "60000000-0000-0000-0000-000000000005",
    exteriorKit: "60000000-0000-0000-0000-000000000006",
    productCups: "60000000-0000-0000-0000-000000000007",
    stylingList: "60000000-0000-0000-0000-000000000008",
  },
};

function zoneOffsetMinutes(date, timeZone) {
  const zoneName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = zoneName.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
}

function zonedMidnightUtc(year, month, day, timeZone) {
  const guess = new Date(Date.UTC(year, month - 1, day));
  let result = new Date(guess.getTime() - zoneOffsetMinutes(guess, timeZone) * 60_000);
  result = new Date(guess.getTime() - zoneOffsetMinutes(result, timeZone) * 60_000);
  return result;
}

function zonedDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

export function createZonedDate(baseDate, dayOffset, hour, minute = 0, timeZone = "Asia/Ho_Chi_Minh") {
  const { year, month, day } = zonedDateParts(baseDate, timeZone);
  const midnight = zonedMidnightUtc(year, month, day + dayOffset, timeZone);
  return new Date(midnight.getTime() + (hour * 60 + minute) * 60 * 1000);
}

export function buildDeterministicSchedule(baseDate = new Date(), timezone = "Asia/Ho_Chi_Minh") {
  return {
    todayStart: createZonedDate(baseDate, 0, 9, 0, timezone),
    todayEnd: createZonedDate(baseDate, 0, 13, 0, timezone),
    tomorrowStart: createZonedDate(baseDate, 1, 10, 0, timezone),
    tomorrowEnd: createZonedDate(baseDate, 1, 15, 0, timezone),
    dayAfterStart: createZonedDate(baseDate, 2, 9, 0, timezone),
    dayAfterEnd: createZonedDate(baseDate, 2, 14, 0, timezone),
    nextWeekStart: createZonedDate(baseDate, 7, 10, 0, timezone),
    nextWeekEnd: createZonedDate(baseDate, 7, 15, 0, timezone),
    completedStart: createZonedDate(baseDate, -3, 9, 0, timezone),
    completedEnd: createZonedDate(baseDate, -3, 13, 0, timezone),
    cancelledStart: createZonedDate(baseDate, 4, 10, 0, timezone),
    cancelledEnd: createZonedDate(baseDate, 4, 14, 0, timezone),
  };
}

export async function seedDemo(options = {}) {
  loadEnvConfig(process.cwd());

  const databaseUrl = options.databaseUrl || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed demo data.");
  }

  const timezone = options.timezone || process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";
  const baseDate = options.now instanceof Date ? options.now : new Date();
  const schedule = buildDeterministicSchedule(baseDate, timezone);

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await sql.begin(async (tx) => {
      await tx`
        insert into organizations (id, name, timezone)
        values (${ids.organization}, 'G.Lab Studio Demo', ${timezone})
        on conflict (id) do update
        set name = excluded.name, timezone = excluded.timezone, updated_at = now()
      `;

      await tx`
        insert into projects (id, organization_id, name, client_name, status, starts_on, ends_on, notes)
        values
          (${ids.projects.autumn}, ${ids.organization}, 'Autumn Brand Film', 'Maison Studio', 'active', current_date - 7, current_date + 14, 'Hero film and social cutdowns for the autumn launch.'),
          (${ids.projects.coffee}, ${ids.organization}, 'ROMRA Summer Menu', 'ROMRA Coffee', 'active', current_date - 2, current_date + 10, 'Product photography and short-form beverage campaign.'),
          (${ids.projects.fashion}, ${ids.organization}, 'Aura Editorial', 'Aura Magazine', 'planned', current_date + 5, current_date + 24, 'Editorial fashion story with studio and exterior setups.'),
          (${ids.projects.documentary}, ${ids.organization}, 'Hoi An Makers', 'G.Lab Originals', 'completed', current_date - 30, current_date - 3, 'Short documentary portrait series.')
        on conflict (id) do update
        set name = excluded.name, client_name = excluded.client_name, status = excluded.status,
            starts_on = excluded.starts_on, ends_on = excluded.ends_on, notes = excluded.notes, updated_at = now()
      `;

      await tx`
        insert into crew_members (id, organization_id, name, default_role, phone, email, status, notes)
        values
          (${ids.crew.dop}, ${ids.organization}, 'Minh Tran', 'DOP', '+84901234001', 'minh@example.com', 'active', 'Cinema camera and lighting specialist.'),
          (${ids.crew.photo}, ${ids.organization}, 'Linh Nguyen', 'Photographer', '+84901234002', 'linh@example.com', 'active', 'Product and lifestyle photographer.'),
          (${ids.crew.producer}, ${ids.organization}, 'Mai Anh', 'Producer', '+84901234003', 'mai@example.com', 'active', 'Production, client coordination and call sheets.'),
          (${ids.crew.gaffer}, ${ids.organization}, 'Quang Le', 'Gaffer', '+84901234004', 'quang@example.com', 'active', 'Lighting and grip.'),
          (${ids.crew.sound}, ${ids.organization}, 'Bao Pham', 'Sound Recordist', '+84901234005', 'bao@example.com', 'active', 'Location sound and wireless systems.'),
          (${ids.crew.assistant}, ${ids.organization}, 'Thao Vo', 'Camera Assistant', '+84901234006', 'thao@example.com', 'inactive', 'Demo inactive crew member for filtering states.')
        on conflict (id) do update
        set name = excluded.name, default_role = excluded.default_role, phone = excluded.phone,
            email = excluded.email, status = excluded.status, notes = excluded.notes, updated_at = now()
      `;

      await tx`
        insert into equipment_items (id, organization_id, name, category, asset_code, serial_number, status, notes)
        values
          (${ids.gear.fx3}, ${ids.organization}, 'Sony FX3', 'Camera', 'CAM-001', 'FX3-DEMO-001', 'available', 'A-cam compact cinema body.'),
          (${ids.gear.light600d}, ${ids.organization}, 'Aputure LS 600d Pro', 'Lighting', 'LGT-001', '600D-DEMO-001', 'available', 'Daylight COB with softbox.'),
          (${ids.gear.fx6}, ${ids.organization}, 'Sony FX6', 'Camera', 'CAM-002', 'FX6-DEMO-002', 'available', 'Full-frame cinema camera.'),
          (${ids.gear.lens2470}, ${ids.organization}, 'Sony 24-70mm GM II', 'Lens', 'LEN-001', '2470-DEMO-001', 'available', 'Standard zoom.'),
          (${ids.gear.lens70200}, ${ids.organization}, 'Sony 70-200mm GM II', 'Lens', 'LEN-002', '70200-DEMO-001', 'maintenance', 'Inspection scheduled after focus ring issue.'),
          (${ids.gear.wireless}, ${ids.organization}, 'DJI Mic 2', 'Audio', 'AUD-001', 'MIC2-DEMO-001', 'available', 'Dual wireless microphone kit.'),
          (${ids.gear.tripod}, ${ids.organization}, 'Sachtler Flowtech 75', 'Support', 'SUP-001', 'FLOW-DEMO-001', 'available', 'Carbon tripod with fluid head.'),
          (${ids.gear.light300x}, ${ids.organization}, 'Aputure LS 300x', 'Lighting', 'LGT-002', '300X-DEMO-002', 'retired', 'Retired demo asset for status-state testing.')
        on conflict (id) do update
        set name = excluded.name, category = excluded.category, asset_code = excluded.asset_code,
            serial_number = excluded.serial_number, status = excluded.status, notes = excluded.notes, updated_at = now()
      `;

      await tx`
        insert into shoots (id, organization_id, project_id, title, status, starts_at, ends_at, call_time, location_name, location_address, notes)
        values
          (${ids.shoots.today}, ${ids.organization}, ${ids.projects.autumn}, 'Lifestyle Campaign — Day 1', 'confirmed', ${schedule.todayStart}, ${schedule.todayEnd}, ${schedule.todayStart}, 'G.Lab Studio', 'Hoi An, Quang Nam', 'Hero lifestyle interiors and product inserts.'),
          (${ids.shoots.tomorrow}, ${ids.organization}, ${ids.projects.autumn}, 'Lifestyle Campaign — Day 2', 'planned', ${schedule.tomorrowStart}, ${schedule.tomorrowEnd}, ${schedule.tomorrowStart}, 'Old Town Exterior', 'Hoi An Ancient Town', 'Golden-hour exterior unit.'),
          (${ids.shoots.dayAfter}, ${ids.organization}, ${ids.projects.coffee}, 'ROMRA Drinks — Product Day', 'confirmed', ${schedule.dayAfterStart}, ${schedule.dayAfterEnd}, ${schedule.dayAfterStart}, 'ROMRA Coffee', 'Hoi An, Quang Nam', 'Menu hero stills plus vertical motion clips.'),
          (${ids.shoots.nextWeek}, ${ids.organization}, ${ids.projects.fashion}, 'Aura Editorial — Studio', 'planned', ${schedule.nextWeekStart}, ${schedule.nextWeekEnd}, ${schedule.nextWeekStart}, 'G.Lab Studio', 'Hoi An, Quang Nam', 'Wardrobe editorial with two lighting setups.'),
          (${ids.shoots.completed}, ${ids.organization}, ${ids.projects.documentary}, 'Hoi An Makers — Ceramic Artist', 'completed', ${schedule.completedStart}, ${schedule.completedEnd}, ${schedule.completedStart}, 'Thanh Ha Pottery Village', 'Hoi An, Quang Nam', 'Completed demo shoot.'),
          (${ids.shoots.cancelled}, ${ids.organization}, ${ids.projects.coffee}, 'ROMRA Sunset Exterior', 'cancelled', ${schedule.cancelledStart}, ${schedule.cancelledEnd}, ${schedule.cancelledStart}, 'An Bang Beach', 'Hoi An, Quang Nam', 'Cancelled demo shoot for status-state testing.')
        on conflict (id) do update
        set project_id = excluded.project_id, title = excluded.title, status = excluded.status,
            starts_at = excluded.starts_at, ends_at = excluded.ends_at, call_time = excluded.call_time,
            location_name = excluded.location_name, location_address = excluded.location_address,
            notes = excluded.notes, updated_at = now()
      `;

      await tx`
        insert into shoot_crew_assignments (organization_id, shoot_id, crew_member_id, role, notes)
        values
          (${ids.organization}, ${ids.shoots.today}, ${ids.crew.dop}, 'DOP', 'A-cam lead'),
          (${ids.organization}, ${ids.shoots.today}, ${ids.crew.photo}, 'Photographer', 'Still campaign unit'),
          (${ids.organization}, ${ids.shoots.today}, ${ids.crew.producer}, 'Producer', 'Client and schedule'),
          (${ids.organization}, ${ids.shoots.today}, ${ids.crew.gaffer}, 'Gaffer', 'Lighting'),
          (${ids.organization}, ${ids.shoots.tomorrow}, ${ids.crew.dop}, 'DOP', null),
          (${ids.organization}, ${ids.shoots.tomorrow}, ${ids.crew.producer}, 'Producer', null),
          (${ids.organization}, ${ids.shoots.dayAfter}, ${ids.crew.photo}, 'Photographer', 'Hero products'),
          (${ids.organization}, ${ids.shoots.dayAfter}, ${ids.crew.producer}, 'Producer', null),
          (${ids.organization}, ${ids.shoots.nextWeek}, ${ids.crew.dop}, 'DOP', null),
          (${ids.organization}, ${ids.shoots.nextWeek}, ${ids.crew.gaffer}, 'Gaffer', null),
          (${ids.organization}, ${ids.shoots.completed}, ${ids.crew.sound}, 'Sound Recordist', null)
        on conflict (shoot_id, crew_member_id) do update
        set role = excluded.role, notes = excluded.notes
      `;

      await tx`
        insert into equipment_bookings (organization_id, shoot_id, equipment_item_id, quantity, notes)
        values
          (${ids.organization}, ${ids.shoots.today}, ${ids.gear.fx3}, 1, 'A-cam'),
          (${ids.organization}, ${ids.shoots.today}, ${ids.gear.light600d}, 1, 'Key light'),
          (${ids.organization}, ${ids.shoots.today}, ${ids.gear.lens2470}, 1, null),
          (${ids.organization}, ${ids.shoots.tomorrow}, ${ids.gear.fx6}, 1, 'Exterior A-cam'),
          (${ids.organization}, ${ids.shoots.tomorrow}, ${ids.gear.tripod}, 1, null),
          (${ids.organization}, ${ids.shoots.dayAfter}, ${ids.gear.fx3}, 1, 'Video clips'),
          (${ids.organization}, ${ids.shoots.dayAfter}, ${ids.gear.light600d}, 1, 'Product key'),
          (${ids.organization}, ${ids.shoots.dayAfter}, ${ids.gear.wireless}, 1, 'BTS interview'),
          (${ids.organization}, ${ids.shoots.nextWeek}, ${ids.gear.fx6}, 1, null),
          (${ids.organization}, ${ids.shoots.nextWeek}, ${ids.gear.lens2470}, 1, null)
        on conflict (shoot_id, equipment_item_id) do update
        set quantity = excluded.quantity, notes = excluded.notes
      `;

      await tx`
        insert into shoot_checklist_items (id, organization_id, shoot_id, title, is_completed, sort_order, assigned_crew_member_id, completed_at)
        values
          (${ids.checklist.batteries}, ${ids.organization}, ${ids.shoots.today}, 'Charge camera batteries', true, 10, ${ids.crew.dop}, now()),
          (${ids.checklist.lighting}, ${ids.organization}, ${ids.shoots.today}, 'Pack lighting kit', true, 20, ${ids.crew.gaffer}, now()),
          (${ids.checklist.callSheet}, ${ids.organization}, ${ids.shoots.today}, 'Confirm client call sheet', false, 30, ${ids.crew.producer}, null),
          (${ids.checklist.mediaCards}, ${ids.organization}, ${ids.shoots.today}, 'Format media cards', false, 40, ${ids.crew.dop}, null),
          (${ids.checklist.weather}, ${ids.organization}, ${ids.shoots.tomorrow}, 'Check weather and permits', false, 10, ${ids.crew.producer}, null),
          (${ids.checklist.exteriorKit}, ${ids.organization}, ${ids.shoots.tomorrow}, 'Prepare exterior camera kit', false, 20, ${ids.crew.dop}, null),
          (${ids.checklist.productCups}, ${ids.organization}, ${ids.shoots.dayAfter}, 'Clean hero product cups', true, 10, ${ids.crew.photo}, now()),
          (${ids.checklist.stylingList}, ${ids.organization}, ${ids.shoots.dayAfter}, 'Confirm beverage styling list', false, 20, ${ids.crew.producer}, null)
        on conflict (id) do update
        set shoot_id = excluded.shoot_id, title = excluded.title, is_completed = excluded.is_completed,
            sort_order = excluded.sort_order, assigned_crew_member_id = excluded.assigned_crew_member_id,
            completed_at = excluded.completed_at, updated_at = now()
      `;
    });

    console.log("Demo data seeded successfully.");
    console.log("Projects: 4 | Shoots: 6 | Crew: 6 | Equipment: 8");
  } finally {
    await sql.end();
  }
}

const isDirectExecution = Boolean(
  process.argv[1] &&
    (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
      process.argv[1].endsWith("seed-demo.mjs") ||
      process.argv[1].endsWith("seed-demo.js"))
);

if (isDirectExecution) {
  seedDemo().catch((error) => {
    console.error("Failed to seed demo data:", error);
    process.exit(1);
  });
}

export default seedDemo;
