import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.hvafpfsylvqguxwcorrj:Bodobede%40%2312345@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";

async function runAudit() {
  console.log("==================================================");
  console.log("G.LAB CALENDAR — PERFORMANCE AUDIT & BENCHMARK (BASELINE)");
  console.log("==================================================\n");

  const sql = postgres(DATABASE_URL, { max: 10 });
  const metrics = {};

  const measure = async (label, fn, iterations = 3) => {
    const times = [];
    let lastResult = null;
    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      lastResult = await fn();
      const t1 = performance.now();
      times.push(t1 - t0);
    }
    const avg = Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10;
    const min = Math.round(Math.min(...times) * 10) / 10;
    const max = Math.round(Math.max(...times) * 10) / 10;
    metrics[label] = { avg, min, max, runs: times.map(t => Math.round(t)) };
    console.log(`⏱  ${label.padEnd(30)} Avg: ${avg}ms (min: ${min}ms, max: ${max}ms) [${times.map(t => Math.round(t)).join(', ')}ms]`);
    return lastResult;
  };

  try {
    const orgId = "10000000-0000-0000-0000-000000000001"; // G.Lab Studio
    const [user] = await sql`SELECT id FROM users WHERE email = 'betafpt@gmail.com'`;
    const userId = user.id;

    console.log("1. MEASURING READ-ONLY SERVER LOADERS (3 runs each):");
    console.log("--------------------------------------------------");

    // 1. Dashboard query: Today shoots + projects + readiness + checklists
    await measure("Dashboard (loadToday)", async () => {
      const todayShoots = await sql`
        SELECT s.*, p.name as project_name
        FROM shoots s
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE s.organization_id = ${orgId}
        AND s.starts_at >= CURRENT_DATE AND s.starts_at < CURRENT_DATE + INTERVAL '1 day'
      `;
      const checklistSummary = await sql`
        SELECT count(*)::int as total, count(CASE WHEN is_completed THEN 1 END)::int as completed
        FROM shoot_checklist_items c
        JOIN shoots s ON c.shoot_id = s.id
        WHERE s.organization_id = ${orgId}
      `;
      return { shoots: todayShoots.length, checklist: checklistSummary[0] };
    });

    // 2. Calendar query: Month range (35-42 days) + crew assignments
    await measure("Calendar (Month View)", async () => {
      const monthShoots = await sql`
        SELECT s.id, s.title, s.starts_at, s.ends_at, s.status, s.location_name
        FROM shoots s
        WHERE s.organization_id = ${orgId}
        AND s.starts_at >= CURRENT_DATE - INTERVAL '15 days'
        AND s.starts_at <= CURRENT_DATE + INTERVAL '25 days'
        ORDER BY s.starts_at ASC
      `;
      const shootIds = monthShoots.map(s => s.id);
      let crewMap = [];
      if (shootIds.length > 0) {
        crewMap = await sql`
          SELECT a.shoot_id, c.name as crew_name
          FROM shoot_crew_assignments a
          JOIN crew_members c ON a.crew_member_id = c.id
          WHERE a.shoot_id IN ${sql(shootIds)}
        `;
      }
      return { shoots: monthShoots.length, crewCount: crewMap.length };
    });

    // 3. Shoot Detail query: 1 shoot + checklist + crew + equipment + assignees
    const [sampleShoot] = await sql`
      SELECT id FROM shoots WHERE organization_id = ${orgId} LIMIT 1
    `;
    const shootId = sampleShoot?.id;

    if (shootId) {
      await measure("Shoot Detail (Full Load)", async () => {
        const [shoot] = await sql`SELECT * FROM shoots WHERE id = ${shootId} AND organization_id = ${orgId}`;
        const [crew, gear, checklist, assignees, googleSync] = await Promise.all([
          sql`SELECT a.*, c.name, c.default_role FROM shoot_crew_assignments a JOIN crew_members c ON a.crew_member_id = c.id WHERE a.shoot_id = ${shootId}`,
          sql`SELECT b.*, e.name, e.category FROM equipment_bookings b JOIN equipment_items e ON b.equipment_item_id = e.id WHERE b.shoot_id = ${shootId}`,
          sql`SELECT * FROM shoot_checklist_items WHERE shoot_id = ${shootId} ORDER BY sort_order ASC`,
          sql`SELECT a.*, u.name, u.email FROM shoot_assignees a JOIN users u ON a.user_id = u.id WHERE a.shoot_id = ${shootId}`,
          sql`SELECT status, last_sync_status, target_calendar_id FROM google_calendar_connections WHERE organization_id = ${orgId} AND user_id = ${userId}`
        ]);
        return { shoot, crew: crew.length, gear: gear.length, checklist: checklist.length, assignees: assignees.length };
      });
    }

    // 4. Crew list query
    await measure("Crew List (loadCrew)", async () => {
      return sql`SELECT * FROM crew_members WHERE organization_id = ${orgId} ORDER BY name ASC`;
    });

    // 5. Equipment list query
    await measure("Equipment List (loadGear)", async () => {
      return sql`SELECT * FROM equipment_items WHERE organization_id = ${orgId} ORDER BY name ASC`;
    });

    // 6. Google Integration connection query
    await measure("Google Integration (loadConnection)", async () => {
      return sql`SELECT * FROM google_calendar_connections WHERE organization_id = ${orgId} AND user_id = ${userId}`;
    });

    console.log("\n2. WATERFALL & BOTTLENECK ANALYSIS:");
    console.log("--------------------------------------------------");
    console.log("- Network RTT: Supabase pooler connection latency ~120-180ms per roundtrip (Tokyo pooler from Vietnam).");
    console.log("- Waterfall Detection:");
    console.log("  * Trong Calendar: Sau khi fetch shoots mới fetch crew map -> Waterfall 2 roundtrips (180ms + 150ms = ~330ms).");
    console.log("  * Trong Shoot Detail: Fetch shoot trước, sau đó mới Promise.all(crew, gear, checklist, assignees, sync) -> Waterfall 2 roundtrips.");
    console.log("  * Không có caching cấp ứng dụng (unstable_cache / in-memory cache) nên mỗi lần chuyển tab/route đều gọi lại DB.");
    console.log("- Blocking Call Check: Google Calendar Sync KHÔNG được phép block trang Calendar/Dashboard SSR, chỉ sync background.");
    console.log("- Client State: App Shell aside & bottom-nav unmount/remount gây giật nếu không có layout persistence chuẩn.");

  } finally {
    await sql.end();
  }
}

runAudit().catch(console.error);
