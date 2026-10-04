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

const isExecute = process.argv.includes("--execute");

async function run() {
  console.log("=================================================");
  console.log(" G.LAB CALENDAR: CLASSIFY TEST & BIRTHDAY EVENTS ");
  console.log(` Mode: ${isExecute ? ">>> EXECUTE (LIVE UPDATE) <<<" : "DRY-RUN (PREVIEW ONLY)"}`);
  console.log("=================================================\n");

  try {
    // Tìm các sự kiện có tiêu đề liên quan đến sinh nhật hoặc test data
    // và chưa được đánh dấu là excluded + test
    const candidates = await sql`
      SELECT 
        id, 
        title, 
        status, 
        starts_at, 
        sync_policy, 
        is_test_data
      FROM shoots
      WHERE (
        title ILIKE '%sinh nhật%' 
        OR title ILIKE '%chúc mừng sinh nhật%' 
        OR title ILIKE '%birthday%'
        OR title ILIKE '%[test]%'
        OR title ILIKE '%test data%'
        OR title ILIKE '%thử nghiệm%'
      )
      ORDER BY starts_at DESC;
    `;

    console.log(`Tìm thấy tổng cộng: ${candidates.length} sự kiện sinh nhật/thử nghiệm trong cơ sở dữ liệu.\n`);

    if (candidates.length === 0) {
      console.log("Không có sự kiện sinh nhật hoặc test data nào cần cập nhật.");
      return;
    }

    console.log("--- DANH SÁCH XEM TRƯỚC (PREVIEW) ---");
    candidates.forEach((row, index) => {
      const dateStr = new Date(row.starts_at).toLocaleDateString("vi-VN");
      const currentStatus = `policy: ${row.sync_policy}, isTest: ${row.is_test_data}`;
      const nextStatus = `=> policy: 'excluded', isTest: true`;
      console.log(`${index + 1}. [${dateStr}] "${row.title}" (ID: ${row.id})`);
      console.log(`   Hiện tại: [${currentStatus}] ${nextStatus}`);
    });
    console.log("-------------------------------------\n");

    const toUpdate = candidates.filter((c) => c.sync_policy !== "excluded" || !c.is_test_data);
    console.log(`Số bản ghi cần cập nhật trạng thái: ${toUpdate.length} / ${candidates.length}`);

    if (!isExecute) {
      console.log("\n[DRY-RUN] Chưa có bất kỳ thay đổi nào được ghi vào cơ sở dữ liệu.");
      console.log("Tất cả dữ liệu lịch sinh nhật được giữ nguyên vẹn 100% (không bị xóa).");
      console.log("Để thực thi cập nhật, chạy lệnh:");
      console.log("  node scripts/classify-test-shoots.mjs --execute\n");
      return;
    }

    if (toUpdate.length === 0) {
      console.log("Tất cả các sự kiện trên đã được gắn isTestData=true và syncPolicy='excluded'. Không cần cập nhật thêm.");
      return;
    }

    const idsToUpdate = toUpdate.map((c) => c.id);
    await sql`
      UPDATE shoots
      SET 
        sync_policy = 'excluded',
        is_test_data = true,
        updated_at = NOW()
      WHERE id IN ${sql(idsToUpdate)};
    `;

    console.log(`\n✓ ĐÃ CẬP NHẬT THÀNH CÔNG ${toUpdate.length} BẢN GHI!`);
    console.log("Các sự kiện trên hiện có:");
    console.log("  - syncPolicy = 'excluded' (Không bị export sang Google Calendar)");
    console.log("  - isTestData = true (Ẩn mặc định trên Lịch, chỉ hiện khi bật bộ lọc admin)");
    console.log("  - Không có bất kỳ bản ghi nào bị xóa khỏi database.\n");
  } catch (err) {
    console.error("Lỗi khi phân loại sự kiện:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
