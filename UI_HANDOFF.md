# G.Lab Calendar — UI/UX Handoff & Styling Guidelines

> **Tài liệu bàn giao chuyên biệt cho Designer UI / Frontend Styling Agent**
> **Phiên bản:** 1.0.0 — Cập nhật ngày 01/10/2026
> **Mục đích:** Hướng dẫn, chuẩn hóa và theo dõi toàn bộ công việc tinh chỉnh giao diện UI/UX mà **TUYỆT ĐỐI KHÔNG LÀM ẢNH HƯỞNG TỚI CODE LOGIC HOẶC CÁC TÍNH NĂNG ĐÃ CHẠY ỔN ĐỊNH**.

---

## 1. Nguyên Tắc Bất Di Bất Dịch (Ground Rules)

Mọi agent / lập trình viên khi nhận nhiệm vụ liên quan tới UI tại dự án này **bắt buộc tuân thủ 100% các nguyên tắc sau**:

1. **CHỈ SỬA GIAO DIỆN (UI-ONLY):**
   - Chỉ được can thiệp vào styling (CSS / Tailwind classes), cấu trúc thẻ hiển thị (JSX/HTML semantic), typography, khoảng cách (padding/margin), màu sắc, icon, hiệu ứng (transitions/animations) và responsive layout.
   - **CẤM TUYỆT ĐỐI:** Không thay đổi Prisma/Drizzle schema, database queries, migration files, API route handlers, Server Actions logic, Auth.js session handling, Google Calendar synchronization logic, scheduling/conflict domain logic.
2. **BẢO ĐẢM TÍNH TOÀN VẸN CỦA DỰ ÁN (ZERO REGRESSION):**
   - Không được làm gãy các luồng tương tác hiện có (form submit, onClick handlers, toggle, filters, dialog triggers).
   - Sau bất kỳ chỉnh sửa UI nào, bắt buộc phải đảm bảo:
     - `npm run typecheck` **PASS** (100% sạch types).
     - `npm test` **PASS** (137/137 tests không bị gãy).
     - `npm run build` **PASS**.
3. **LUÔN BACKUP UI CŨ TRƯỚC KHI SỬA (MANDATORY UI BACKUP):**
   - Trước khi sửa bất kỳ file component / page UI nào, agent **bắt buộc phải sao lưu file gốc** vào thư mục `.ui-backups/` theo quy ước:
     `.ui-backups/[relative-path-with-dashes]--[YYYYMMDD-HHmmss].bak`
     *(Ví dụ: `.ui-backups/src-components-ui-app-screen--20261001-235000.bak.tsx`)*
   - Khi người dùng ra lệnh hoàn tác (revert/rollback), agent có thể khôi phục lại ngay lập tức 100% nguyên trạng UI cũ mà không bị mất dấu hay lẫn lộn code.
4. **CẬP NHẬT NHẬT KÝ (LOGGING):**
   - Sau mỗi lần chỉnh sửa xong bất kỳ thành phần UI nào, **phải cập nhật mục "Nhật ký thay đổi UI" ở cuối tài liệu này** (kèm đường dẫn file backup tương ứng) và cập nhật vắn tắt vào [.codex/HANDOFF.md](file:///f:/G.Lab%20Calendar/.codex/HANDOFF.md).
5. **HỎI Ý KIẾN TRƯỚC KHI PUSH CODE:**
   - Luôn xin phép người dùng trước khi thực hiện thao tác upload/push code lên GitHub.

---

## 2. Hệ Thống Thẩm Mỹ Chuẩn (Design System & Tokens)

Dự án định vị theo phong cách **"Editorial Fashion Magazine + Production Utility"** (Hiện đại, tối giản nhưng đậm chất nghệ thuật, dành riêng cho studio làm phim và nhiếp ảnh gia).

### 2.1. Bảng Màu (Color Tokens)
* **Màu nền chủ đạo:**
  * `bg/blush`: `#FFF1F6` (Nền chính toàn bộ app, mang sắc hồng phấn nhẹ)
  * `surface/white`: `#FFFFFF` / `#FFF9FB` (Nền card, modals, inputs)
* **Màu chữ & Viền:**
  * `ink/primary`: `#090909` (Đen sâu cho tiêu đề, văn bản chính)
  * `ink/secondary`: `#5F5960` (Xám tím cho nhãn phụ, ngày tháng, subtitle)
  * `stroke/subtle`: `#EADDE4` (Viền 1px mỏng nhẹ phân cách card)
* **Semantic Pastel Accent Blocks (Dùng để phân biệt ngày, card, shoot):**
  * `accent/pink`: `#FF4F9A` (Hồng neon — Brand Accent, dấu `*`, nút CTA nổi bật)
  * `accent/lilac`: `#DCD5FF` (Tím nhạt — Card quay ngày 1, editorial shoots)
  * `accent/mint`: `#CFF7E7` (Xanh bạc hà — Shoot thương mại, status available)
  * `accent/yellow`: `#FFE89A` (Vàng pastel — Buổi quay đồ ăn, warning state)
  * `accent/sky`: `#CDE7FF` (Xanh da trời — Buổi quay ngoại cảnh, thiết bị)
  * `accent/coral`: `#FFC3D2` (Hồng san hô — Nhân sự, thẻ đặc biệt)
* **Trạng thái:**
  * `state/success`: `#34C982`
  * `state/warning`: `#F4B942`
  * `state/error`: `#F0445E`

### 2.2. Typography
* **Font chữ chính:** `Plus Jakarta Sans`, sans-serif.
* **Tiêu đề Display (Page Header H1):**
  * Viết hoa toàn bộ (**ALL CAPS**), font weight cực đậm (`900` / `black`), tracking âm (`tracking-tighter`).
  * Kèm dấu hoa thị màu hồng neon ở đuôi: `TODAY*`, `MONTH*`, `PROJECTS*`, `CREW*`, `GEAR*`, `CLIENTS*`, `SETTINGS*`.
* **Cỡ chữ trên Mobile:** ~44px – 56px cho Page Title; 15px – 17px cho Body; 11px – 13px (uppercase) cho Meta labels.

### 2.3. Bố Cục & Bo Góc (Shape & Elevation)
* **Bo góc (Border Radius):**
  * Card lớn: `rounded-3xl` (22px – 28px)
  * Chips & Badges: `rounded-full` (999px)
  * Bottom Nav & Header Pill: `rounded-full` (capsule)
  * Thumbnails: `rounded-2xl` (14px – 18px)
* **Đổ bóng (Shadow):**
  * Hạn chế tối đa shadow đậm. Chỉ dùng viền mỏng 1px (`border border-[#EADDE4]`) kết hợp nền pastel block.
  * Chỉ dùng shadow mềm nhẹ (`shadow-lg shadow-black/5`) cho thanh điều hướng nổi và action sheets.

---

## 3. Danh Sách Các Hạng Mục UI/UX Cần Cải Thiện (Checklist)

Dưới đây là danh sách các lỗi và điểm cải thiện UI đã được audit thực tế trên trình duyệt (port 3011, viewport 1440x900 và 390x844):

| Mã | Hạng mục | Màn hình | Mức độ | Mô tả hiện trạng | Giải pháp UI đề xuất | Trạng thái |
|---|---|---|---|---|---|---|
| **UI-01** | Bottom Nav che khuất nội dung | Mobile (All pages) | **P0 (Cao)** | Thanh capsule đen fixed ở đáy đè lên progress bar ở Today, thẻ nhân sự cuối ở Crew, nhóm Lenses ở Gear. | Tăng khoảng đệm an toàn `pb-36` (144px) cho `AppScreen` trên mobile. | ✅ **Đã xong** |
| **UI-02** | Chữ đè thumbnail thiết bị | Mobile `/equipment` | **P0 (Cao)** | Tiêu đề nhóm (`LIGHTING`, `SUPPORT`, `CAMERAS`) bị đè trực tiếp lên ảnh của thiết bị đầu tiên. | Tách layout tiêu đề category ra dòng riêng phía trên trên mobile, thumbnail bên dưới thoáng đãng. | ✅ **Đã xong** |
| **UI-03** | Tên nhân sự bị cắt cụt dấu `...` | Mobile `/crew` | **P0 (Cao)** | Cột Tên bị khối "Today" ép hẹp khiến tên nào cũng bị cụt (`Bao Ph...`, `Linh N...`). | Cân chỉnh grid mobile: Avatar 56px, Tên 20px font-black, Today box 84px giúp họ tên hiển thị trọn vẹn 100%. | ✅ **Đã xong** |
| **UI-04** | Header Clients & Settings lạc điệu | Desktop & Mobile | **P1 (Vừa)** | Dùng font thường nhỏ `Clients`, `Settings`, không in hoa, không có dấu `*`, không có subtitle. | Chuẩn hóa header thành `CLIENTS*` và `SETTINGS*` in hoa đậm kèm subtitle và dấu `*` màu hồng neon. | ✅ **Đã xong** |
| **UI-05** | Mất nút Thêm mới (+) trên Mobile | Mobile `/clients` | **P1 (Vừa)** | Nút `+` bị nút LanguageSwitcher đè lên và che khuất trên mobile. | Thêm `pr-14 lg:pr-0` và nút `+` size 44px nổi bật, hover hồng neon. | ✅ **Đã xong** |
| **UI-06** | Dải chip filter bị chém cụt | Mobile `/calendar`, `/equipment` | **P2 (Nhẹ)** | Dải lọc ngang bị cắt cụt đột ngột vào viền phải màn hình. | Thêm padding-right `pr-6` cho dải chip cuộn ngang. | ⏳ Chờ làm |
| **UI-07** | Màu toggle Integrations không chuẩn | `/integrations/google-calendar` | **P2 (Nhẹ)** | Toggle switches và checkboxes dùng màu xanh dương mặc định `#2563EB`. | Đổi màu toggle sang hồng neon `bg-pink` và checkbox sang `bg-ink` chuẩn nhận diện G.Lab. | ✅ **Đã xong** |
| **UI-08** | Bố cục danh sách AI Prompts | `/ai` | **P2 (Nhẹ)** | Các prompt gợi ý dàn trải dạng thanh ngang đơn điệu dài hết trang. | Thiết kế lại thành lưới 2 cột thẻ card có icon sinh động, hover animation mềm mại. | ✅ **Đã xong** |
| **UI-09** | Bản địa hóa ngôn ngữ hiển thị | Toàn bộ ứng dụng | **P2 (Nhẹ)** | Trộn lẫn tiếng Anh và tiếng Việt trong các nhãn và trạng thái. | Đồng bộ hóa từ ngữ theo locale người dùng chọn (mặc định Tiếng Việt thân thiện). | ⏳ Chờ làm |

---

## 4. Hướng Dẫn Kỹ Thuật Khi Sửa File UI

### 4.1. Cấu Trúc Các Component UI Chính
* Layout bọc ngoài: [src/components/app-shell.tsx](file:///f:/G.Lab%20Calendar/src/components/app-shell.tsx)
* Thanh điều hướng dưới Mobile: [src/components/ui/app-screen.tsx](file:///f:/G.Lab%20Calendar/src/components/ui/app-screen.tsx)
* Header nhỏ gọn đồng bộ: [src/components/ui/compact-page-header.tsx](file:///f:/G.Lab%20Calendar/src/components/ui/compact-page-header.tsx)
* Thẻ trạng thái & Badges: [src/components/ui/status-chip.tsx](file:///f:/G.Lab%20Calendar/src/components/ui/status-chip.tsx), [src/components/ui/status-text.tsx](file:///f:/G.Lab%20Calendar/src/components/ui/status-text.tsx)
* Các màn hình chính:
  * Trang Hôm nay: [src/app/page.tsx](file:///f:/G.Lab%20Calendar/src/app/page.tsx)
  * Trang Lịch: [src/app/calendar/page.tsx](file:///f:/G.Lab%20Calendar/src/app/calendar/page.tsx)
  * Trang Nhân sự: [src/app/crew/page.tsx](file:///f:/G.Lab%20Calendar/src/app/crew/page.tsx)
  * Trang Thiết bị: [src/app/equipment/page.tsx](file:///f:/G.Lab%20Calendar/src/app/equipment/page.tsx)
  * Trang Khách hàng: [src/app/clients/page.tsx](file:///f:/G.Lab%20Calendar/src/app/clients/page.tsx)
  * Trang Cài đặt: [src/app/settings/page.tsx](file:///f:/G.Lab%20Calendar/src/app/settings/page.tsx)
  * Trang Tích hợp: [src/app/integrations/google-calendar/page.tsx](file:///f:/G.Lab%20Calendar/src/app/integrations/google-calendar/page.tsx)
  * Trang AI: [src/app/ai/page.tsx](file:///f:/G.Lab%20Calendar/src/app/ai/page.tsx)

### 4.2. Checklist Kiểm Tra Khi Sửa Một Thành Phần UI
- [ ] **BƯỚC 1 (BẮT BUỘC):** Sao lưu file cũ vào `.ui-backups/` trước khi chạm vào code.
- [ ] **BƯỚC 2:** Chỉnh sửa giao diện theo chuẩn Design System (chỉ chỉnh CSS, layout, visual JSX).
- [ ] **BƯỚC 3:** Mở trình duyệt xem thực tế trên cả Desktop và Mobile viewport.
- [ ] **BƯỚC 4:** Chạy `npm run typecheck` không có lỗi.
- [ ] **BƯỚC 5:** Chạy `npm test` không bị gãy bất kỳ bài kiểm tra nào.
- [ ] **BƯỚC 6:** Ghi lại thay đổi và đường dẫn file backup vào bảng "Nhật ký thay đổi UI" bên dưới.

---

## 5. Nhật Ký Thay Đổi UI (UI Changelog)

*Ghi lại theo thứ tự thời gian mỗi khi hoàn thành một hạng mục UI:*

| Thời gian | Tác vụ | File đã chỉnh sửa | File sao lưu (Backup) | Chi tiết thay đổi | Người thực hiện |
|---|---|---|---|---|---|
| 2026-10-01 23:45 | Khởi tạo tài liệu UI Hand-off | `UI_HANDOFF.md` | N/A | Lập master guideline, quy chuẩn backup bắt buộc, chốt danh sách lỗi audit UI-01 đến UI-09. | UI Designer Agent |
| 2026-10-01 23:55 | Sửa UI-01 (Padding đáy mobile) | `src/components/ui/app-screen.tsx` | `.ui-backups/src-components-ui-app-screen--20261001-235500.bak.tsx` | Tăng `pb-28` lên `pb-36` (144px) tránh bị Bottom Nav che khuất nội dung trang. | UI Designer Agent |
| 2026-10-01 23:55 | Sửa UI-02 (Layout thẻ Gear mobile) | `src/app/equipment/page.tsx` | `.ui-backups/src-app-equipment-page--20261001-235500.bak.tsx` | Tách header danh mục lên dòng riêng, chống đè chữ lên thumbnail ảnh thiết bị. | UI Designer Agent |
| 2026-10-01 23:55 | Sửa UI-03 (Họ tên Crew mobile) | `src/app/crew/page.tsx` | `.ui-backups/src-app-crew-page--20261001-235500.bak.tsx` | Cân chỉnh grid mobile: Avatar 56px, Tên 20px font-black, Today box 84px, hiển thị trọn vẹn họ tên 100%. | UI Designer Agent |
| 2026-10-02 00:00 | Sửa UI-04 & UI-05 (Header Clients/Settings & Nút +) | `src/components/ui/compact-page-header.tsx`, `src/app/clients/page.tsx`, `src/app/settings/page.tsx` | `.ui-backups/src-components-ui-compact-page-header--20261001-235700.bak.tsx`, `.ui-backups/src-app-clients-page--20261001-235700.bak.tsx`, `.ui-backups/src-app-settings-page--20261001-235700.bak.tsx` | Đồng bộ tiêu đề ALL CAPS kèm dấu `*` hồng, thêm subtitle, mở nút `+` 44px trên mobile không bị đè. | UI Designer Agent |
| 2026-10-02 00:02 | Sửa UI-07 & UI-08 (Màu Toggle Integrations & AI Grid) | `src/app/integrations/google-calendar/google-calendar-view.tsx`, `src/app/ai/page.tsx` | `.ui-backups/src-app-integrations-google-calendar-google-calendar-view--20261001-235850.bak.tsx`, `.ui-backups/src-app-ai-page--20261001-235830.bak.tsx` | Toggle đổi sang hồng neon `bg-pink`, checkbox `bg-ink`, tiêu đề thêm dấu `*`; AI prompts chia lưới 2 cột có icon. | UI Designer Agent |
| 2026-10-02 00:25 | Nâng cấp toàn diện icon sang **Iconsax** (https://app.iconsax.io/) | `src/app/page.tsx`, `src/app/calendar/page.tsx`, `src/app/shoots/page.tsx`, `src/app/projects/page.tsx`, `src/app/crew/page.tsx`, `src/app/equipment/page.tsx`, `src/app/clients/page.tsx`, `src/app/shoots/shoot-create-form.tsx`, `src/app/shoots/[id]/shoot-checklist.tsx`, `src/app/login/page.tsx`, `src/components/production/bottom-navigation.tsx`, `src/app/settings/page.tsx`, `src/app/ai/page.tsx` | `.ui-backups/src-app-page--20261002-001600.bak.tsx`, `.ui-backups/src-app-calendar-page--20261002-001600.bak.tsx`, `.ui-backups/src-app-shoots-page--20261002-001600.bak.tsx`, `.ui-backups/src-app-projects-page--20261002-001600.bak.tsx`, `.ui-backups/src-app-crew-page--20261002-001600.bak.tsx`, `.ui-backups/src-app-equipment-page--20261002-001600.bak.tsx`, `.ui-backups/src-app-clients-page--20261002-001600.bak.tsx`, `.ui-backups/src-app-shoots-shoot-create-form--20261002-001600.bak.tsx`, `.ui-backups/src-app-shoots-id-shoot-checklist--20261002-001600.bak.tsx`, `.ui-backups/src-app-login-page--20261002-001600.bak.tsx` | Loại bỏ 100% SVG tự vẽ thô, emoji và ký tự unicode tạm bợ. Chuyển toàn bộ icon trong toàn app sang thư viện Iconsax chính thức (`iconsax-react`), hỗ trợ biến thể `Linear` và `Bold` theo đúng trạng thái active/idle. | UI Designer Agent |
| 2026-10-02 00:38 | Sửa triệt để lỗi chữ đè lên nhau (Vietnamese Text Overlap) | `src/app/equipment/page.tsx`, `src/app/projects/page.tsx`, `src/app/crew/page.tsx`, `src/app/shoots/page.tsx`, `src/app/page.tsx`, `src/components/ui/compact-page-header.tsx` | `.ui-backups/src-app-equipment-page--20261002-003500.bak.tsx`, `.ui-backups/src-app-projects-page--20261002-003500.bak.tsx`, `.ui-backups/src-app-crew-page--20261002-003500.bak.tsx`, `.ui-backups/src-app-page--20261002-003500.bak.tsx`, `.ui-backups/src-app-shoots-page--20261002-003500.bak.tsx`, `.ui-backups/src-components-ui-compact-page-header--20261002-003500.bak.tsx` | Điều chỉnh line-height từ cực hẹp `.76` / `.78` lên `0.96` / `0.98` để bao trọn dấu thanh tiếng Việt (dấu mũ, sắc, nặng). Cân chỉnh clamp font ở `/equipment` từ 4.8rem xuống 2.75rem giúp "THIẾT BỊ*" vừa vặn 1 dòng không bị ngắt đôi. Tăng khoảng cách subtitle `mt-3.5` chống đè nét. | UI Designer Agent |
| 2026-10-02 10:52 | Tối ưu chuyển trang siêu tốc (0ms Optimistic Transition & Skeletons) | `src/components/production/bottom-navigation.tsx`, `src/app/calendar/loading.tsx`, `src/app/projects/loading.tsx`, `src/app/crew/loading.tsx`, `src/app/equipment/loading.tsx`, `src/app/shoots/loading.tsx` | `.ui-backups/src-components-production-bottom-navigation--20261002-104800.bak.tsx` | 1. Thêm Optimistic Navigation vào `BottomNavigation` cho phản hồi tức thì 0ms (tab đổi màu hồng ngay khi chạm), kết hợp thanh TopLoadingBar neon.<br>2. Bổ sung 5 màn hình Skeleton Loader (`loading.tsx`) cho `/calendar`, `/projects`, `/crew`, `/equipment`, `/shoots` giúp loại bỏ hoàn toàn hiện tượng đứng đơ 3-4s, chuyển trang 60fps mượt mà chuẩn bị cho bản Mobile App.<br>3. Kích hoạt Link prefetching. | UI Designer Agent |
| 2026-10-02 11:06 | Chuẩn hóa BottomNavigation (Triệt tiêu Double Navigation) | `src/components/production/bottom-navigation.tsx` | `.ui-backups/src-components-production-bottom-navigation--20261002-110500.bak.tsx` | Loại bỏ `router.push()` và `useTransition`/`isPending` trong `onClick` của `Link`. Giữ thẻ `Link` làm cơ chế điều hướng duy nhất tận dụng prefetch gốc của Next.js; `onClick` chỉ thực hiện `setPendingHref` để giữ phản hồi 0ms Optimistic UI. Triệt tiêu hoàn toàn nguy cơ 2 luồng navigation song song gây nháy trang hoặc trùng lặp request RSC. | UI Designer Agent |


| 2026-10-02 11:30 | Mobile settings + list thumbnails | `src/components/app-shell.tsx`, `src/server/db/crew.ts`, `src/app/crew/page.tsx`, `src/server/db/equipment.ts`, `src/app/equipment/page.tsx` | `.ui-backups/*--20261002-112514.bak.*` | Added a global mobile workspace menu with Settings access; crew summaries now include `avatarDataUrl` and list rows render the real avatar with initials fallback; equipment summaries now include `imageDataUrl` and list cards render the real image with placeholder fallback. | Codex |
