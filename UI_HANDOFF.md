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
| 2026-10-02 14:10 | Hoàn thiện 6 hạng mục UI duyệt: Popovers Mobile, WorkspaceMenu Header, Bỏ VI/EN & Đăng xuất, Status tag Đang diễn ra, Dual-mode Image Upload (File/URL), Cover Image Dự án | `src/components/production/workspace-menu.tsx`, `src/components/app-shell.tsx`, `src/app/page.tsx`, `src/app/crew/page.tsx`, `src/app/equipment/page.tsx`, `src/app/projects/page.tsx`, `src/app/projects/[id]/page.tsx`, `src/components/ui/image-upload-field.tsx`, `src/server/db/schema.ts`, `src/server/db/projects.ts`, `src/server/services/projects.ts`, `src/app/projects/actions.ts`, `src/app/projects/project-create-form.tsx`, `src/app/projects/[id]/project-edit-form.tsx` | `.ui-backups/*--20261002-134100.bak.tsx` | 1. Sửa lỗi modal Thêm nhân sự, Thêm thiết bị, Tạo dự án trên mobile bị lệch lẹm: dùng fixed inset-x-3 căn giữa cân đối, cuộn được và nút submit không bị che.<br>2. Cố định WorkspaceMenu vào thanh header trên cùng của tất cả các trang, bỏ menu trôi lơ lửng fixed góc phải.<br>3. Bỏ chuyển đổi VI/EN trong popup cài đặt, thay bằng nút Đăng xuất kết nối logoutAction.<br>4. Sửa status tag in_progress sang tiếng Việt 'Đang diễn ra' tone warning pastel.<br>5. Nâng cấp ImageUploadField hỗ trợ 2 chế độ: Tải file từ máy (nén WebP) và Dán link URL ảnh xem trước.<br>6. Thêm trường coverImageUrl vào schema Dự án, migration DB Supabase, form tạo/sửa dự án, hiển thị thumbnail bìa danh sách và trang chi tiết. Đạt 100% typecheck và 144/144 test pass. | UI Designer Agent |
| 2026-10-02 14:38 | Nâng cấp toàn diện Modal Popovers: Click Outside, Close Button, Escape Key | `src/components/ui/modal-popover.tsx`, `src/app/crew/page.tsx`, `src/app/equipment/page.tsx`, `src/app/equipment/[id]/page.tsx`, `src/app/projects/page.tsx`, `src/components/production/workspace-menu.tsx` | `.ui-backups/*--20261002-143600.bak.tsx` | Tạo component ModalPopover thay thế thẻ details thô. Hỗ trợ backdrop mờ che phủ toàn màn hình, bấm bất kỳ đâu ra ngoài thì bảng popover tự động tắt ngay lập tức. Bổ sung nút '✕' ở góc phải tiêu đề modal, hỗ trợ phím Escape và khóa cuộn nền trang mobile khi mở bảng. Cập nhật click-outside cho cả WorkspaceMenu. PASS typecheck và 144 unit tests. | UI Designer Agent |
| 2026-10-02 17:05 | Đồng bộ 100% Iconsax trên trang Dự án và các trang còn sót emoji | `src/app/projects/page.tsx`, `src/app/shoots/page.tsx`, `src/app/crew/[id]/page.tsx`, `src/app/equipment/[id]/page.tsx` | `.ui-backups/*--20261002-170400.bak.tsx` | Loại bỏ hoàn toàn emoji 📅 và ký tự text thô (+, ‹, •••, ⌖, ◷). Thay thế bằng icon Iconsax chính thức: nút xem lịch dùng `Calendar`, nút tạo dự án dùng `Add`, nút back dùng `ArrowLeft2`, nút tùy chọn dùng `More`, thông tin dự án dùng `User` và `Calendar`. Đạt 100% typecheck và test pass. | UI Designer Agent |
| 2026-10-02 17:54 | Calendar workflow + Google sync release | `src/app/calendar/page.tsx`, `src/app/shoots/page.tsx`, `src/app/shoots/shoot-create-form.tsx`, `src/app/shoots/[id]/page.tsx`, `src/app/shoots/[id]/shoot-edit-form.tsx`, `src/components/production/bottom-navigation.tsx`, `src/components/ui/delete-entity-button.tsx`, `src/i18n/messages.ts`, `src/server/db/shoots.ts`, `src/server/integrations/calendar/*`, `src/server/services/google-calendar-sync*` | N/A | Làm mờ lịch đã qua/hoàn thành; thay tab Dự án bằng AI; sửa redirect sau khi xóa; đổi `Dòng` thành `Dòng thời gian`; mở địa điểm bằng Google Maps; bỏ đồng bộ event `birthday` từ Google. Typecheck PASS, 28/28 targeted tests PASS, production build PASS. Commit `cc57433` đã push `origin/main`; Vercel production `Ready`, live tại `https://calendar.geelab.vn`. | Codex |
| 2026-10-02 23:25 | Nâng cấp G.Lab UI/UX — Giai đoạn 0, P0, P1, P2 (Tokens, Command Search, Primitives shadcn, Motion) | `src/app/globals.css`, `tailwind.config.ts`, `src/lib/utils.ts`, `src/lib/status-labels.ts`, `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/card.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`, `src/components/ui/alert-dialog.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/toast.tsx`, `src/components/ui/command.tsx`, `src/components/calendar/calendar-command-search.tsx`, `src/components/calendar/calendar-search-trigger.tsx`, `src/components/ui/motion-container.tsx`, `src/app/clients/[id]/page.tsx`, `src/app/clients/client-store.ts`, `src/app/calendar/page.tsx`, `src/app/equipment/page.tsx`, `src/app/shoots/[id]/resource-scheduling.tsx`, `src/components/ui/delete-entity-button.tsx`, `src/app/layout.tsx` | N/A | **GĐ 0 (Tokens):** Chuẩn hóa toàn bộ CSS variables `--glab-*` (bg, surface, ink, pink, line, status pastel) và Tailwind config.<br>**GĐ 1 (P0 UX):** Sửa Client detail routing không bị nhấp nháy 404; tạo Command Palette ⌘K tìm kiếm sự kiện live trên Lịch; chuẩn hóa từ điển status tiếng Việt tập trung; thêm Empty state có hướng dẫn tại phân bổ thiết bị; ẩn raw QA notes trên compact event card.<br>**GĐ 2 (P1 Primitives):** Xây dựng bộ 8 components Radix/shadcn bọc nguyên vẹn 100% G.Lab Design Language (`Button`, `Badge`, `Card`, `Dialog`, `Sheet`, `AlertDialog`, `Tabs`, `Toast`); thay thế `window.confirm` bằng `AlertDialog`; bọc `ToastProvider` toàn cục.<br>**GĐ 3 (P2 Motion):** Tạo `motion-container.tsx` (`CalendarViewTransition`, `StaggerContainer`, `MotionCard`), tự động tôn trọng `prefers-reduced-motion`; bọc chuyển view Tháng / Tuần / Dòng thời gian mượt mà. 100% Typecheck PASS, 145/145 Tests PASS. | UI Designer Agent |
| 2026-10-02 23:50 | Nâng cấp G.Lab UI/UX — Giai đoạn 4 (P3) dnd-kit Drag and Drop cho Lịch | `src/app/shoots/actions.ts`, `src/components/calendar/calendar-month-dnd.tsx`, `src/components/calendar/calendar-week-dnd.tsx`, `src/app/calendar/page.tsx` | `.ui-backups/src-app-shoots-actions--20261002-234800.bak.ts`, `.ui-backups/src-app-calendar-page--20261002-234900.bak.tsx` | **GĐ 4 (P3 Drag & Drop):**<br>1. Xây dựng Server Action `rescheduleShootAction`: kiểm tra xung đột trùng lịch Crew và Thiết bị (batch conflict check), cập nhật thời gian buổi quay, đồng bộ Google Calendar non-blocking và revalidate cache Next.js.<br>2. Tạo `CalendarMonthDnd` với `DndContext`, `PointerSensor` (distance: 8px) và `TouchSensor` (delay: 250ms) chống click nhầm và chống cản trở cuộn trang trên mobile; `DroppableDayCell` highlight viền hồng neon; `DraggableShootCard` mượt mà; `DragOverlay` hiển thị thẻ preview nổi lơ lửng chuẩn phong cách G.Lab.<br>3. Tạo `CalendarWeekDnd` hỗ trợ kéo thả sự kiện giữa 7 cột ngày trong tuần trên Desktop & Tablet.<br>4. Tích hợp Toast thông báo kèm nút "Hoàn tác" tức thì và `AlertDialog` cảnh báo chi tiết khi phát hiện trùng lịch nhân sự/thiết bị (cho phép chọn "Hủy bỏ" hoặc "Vẫn dời lịch"). 100% Typecheck PASS, 145/145 Tests PASS. | UI Designer Agent |
| 2026-10-03 01:10 | Cơ chế chống đồng bộ lịch cá nhân & test data (7/7 Yêu cầu hoàn thành) | `src/server/db/schema.ts`, `src/server/db/shoots.ts`, `src/server/db/calendar.ts`, `src/server/db/google-calendar.ts`, `src/server/services/shoots.ts`, `src/server/services/calendar.ts`, `src/server/services/google-calendar-sync.ts`, `src/app/shoots/actions.ts`, `src/app/shoots/shoot-create-form.tsx`, `src/app/shoots/[id]/shoot-edit-form.tsx`, `src/app/calendar/page.tsx`, `src/app/integrations/google-calendar/page.tsx`, `src/app/integrations/google-calendar/google-calendar-view.tsx`, `src/app/integrations/google-calendar/actions.ts`, `scripts/classify-test-shoots.mjs`, `scripts/migrate-sync-policy.mjs` | `.ui-backups/*` | **Bổ sung toàn diện cơ chế chống đồng bộ lịch cá nhân & test data:**<br>1. **Schema & Migration:** Thêm `syncPolicy`, `isTestData`, `sourceCalendarId`, `externalEventId` vào bảng `shoots`; thêm `targetCalendarId`, `sourceCalendarIds` vào `googleCalendarConnections`. Đã chạy migration trực tiếp trên Supabase.<br>2. **Dry-run & Phân loại dữ liệu cũ:** Tạo script `scripts/classify-test-shoots.mjs` dry-run preview 29 sự kiện 'Chúc mừng sinh nhật', gắn `isTestData=true` và `syncPolicy='excluded'`, bảo toàn 100% dữ liệu không xóa bản ghi nào.<br>3. **Google Calendar Sync Core:** Mặc định không bao giờ import/export Google primary calendar; chỉ export khi `syncPolicy='google' && !isTestData`; xóa event trên Google TUYỆT ĐỐI không hủy shoot local/excluded (Rule 6).<br>4. **Lịch Tháng/Tuần/Timeline:** Mặc định ẩn toàn bộ event test/excluded; bổ sung filter admin 'Hiện dữ liệu test / loại trừ'; tự động hiển thị tiền tố `[TEST]` / `[LOẠI TRỪ]` khi bật.<br>5. **Form Shoot:** Cập nhật form tạo/sửa với dropdown chọn Sync Policy và checkbox dữ liệu test; hiển thị Google Event ID đã liên kết.<br>6. **Settings Google Calendar:** Bổ sung banner cam kết 'Chỉ đồng bộ lịch production, không đồng bộ lịch cá nhân'; UI dropdown chọn calendar đích và danh sách checkbox chọn calendar nguồn cho phép nhập.<br>7. **Kiểm thử:** 100% typecheck PASS, 149/149 vitest tests PASS, next build production PASS. | UI & System Agent |
| 2026-10-03 02:00 | Khởi tạo & Chuẩn hóa toàn diện Primitives shadcn/ui + Motion + dnd-kit | `components.json`, `package.json`, `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/ui/popover.tsx` | N/A | Khởi tạo chính thức `components.json` cho shadcn/ui. Cài đặt bổ sung các packages còn thiếu: `class-variance-authority`, `@radix-ui/react-slot`, `@radix-ui/react-dropdown-menu`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`. Nâng cấp `button.tsx` và `badge.tsx` hỗ trợ `cva` và Radix `Slot` (`asChild`). Tạo mới `dropdown-menu.tsx` và `popover.tsx` bọc trọn vẹn visual language G.Lab (`rounded-pill`, `rounded-r24`, `bg-pink`, `active:scale-press`, `shadow-soft`). Xác nhận 100% typecheck và 157/157 unit tests PASS. | UI Designer Agent |

| 2026-10-04 01:16 | Thu gọn nút trạng thái buổi quay trên mobile | `src/components/shoots/status-pill.tsx` | `.ui-backups/src-components-shoots-status-pill--20261004-011500.bak.tsx` | Giảm chiều cao mobile xuống 32px, giảm padding/font/khoảng cách, thu nhỏ status dot và chevron; từ breakpoint `sm` trở lên giữ kích thước desktop cũ. Verification: typecheck PASS, lint PASS với warning `<img>` cũ, test 213/213 PASS, build PASS. Production deploy thành công và alias `https://calendar.geelab.vn`. | Codex |

---

## 6. Quy Chuẩn Bắt Buộc Cho Mọi UI / Interaction Mới

> **QUY TẮC CỐT LÕI TỪ NGƯỜI DÙNG:**
> *"Từ đây, mọi UI hoặc interaction mới phải dùng các primitive này, nhưng vẫn giữ nguyên G.Lab design system; không dùng style mặc định của shadcn/ui."*

### 6.1. Danh mục các Primitives bắt buộc sử dụng

Mọi thành phần giao diện mới được xây dựng **bắt buộc import từ `src/components/ui/`**:

| Primitive | Đường dẫn Component | G.Lab Design Signature (Bắt buộc giữ nguyên) |
|---|---|---|
| **Button** | `src/components/ui/button.tsx` | `rounded-pill`, `active:scale-press`, `font-black`, variants: `default` (đen), `pink` (hồng neon), `secondary`, `destructive`. Hỗ trợ `asChild` với Link. |
| **Badge** | `src/components/ui/badge.tsx` | `rounded-pill`, uppercase font-black tracking-wider. Các variants pastel: `mint`, `lilac`, `yellow`, `coral`, `sky`, `pink`. |
| **Card** | `src/components/ui/card.tsx` | `rounded-r24 sm:rounded-r28`, `bg-surface`, viền `border-stroke/80`, `shadow-soft`. Tiêu đề H3 `font-display font-black uppercase`. |
| **Dialog / Modal** | `src/components/ui/dialog.tsx` | `rounded-r28`, backdrop blur, viền mỏng, padding 6, header ALL CAPS có dấu `*` hồng neon. |
| **Sheet** | `src/components/ui/sheet.tsx` | Ngăn kéo trượt viền bo `rounded-l-r28`, nút đóng tròn capsule, hiệu ứng trượt êm. |
| **AlertDialog** | `src/components/ui/alert-dialog.tsx` | Dùng thay thế hoàn toàn `window.confirm`. Nút Cancel capsule viền mỏng, nút Action hồng neon hoặc đỏ cảnh báo. |
| **Tabs** | `src/components/ui/tabs.tsx` | Dạng capsule bọc trong dải nền mờ, tab active bo `rounded-pill bg-ink text-white shadow-sm`. |
| **Toast** | `src/components/ui/toast.tsx` | Thông báo nổi bo `rounded-r20`, hiệu ứng swipe dismiss, nút Hoàn tác capsule. |
| **Command Search** | `src/components/ui/command.tsx` | Hộp thoại tìm kiếm ⌘K với `cmdk`, icon Iconsax, item bo `rounded-r14`, highlight hồng neon. |
| **DropdownMenu** | `src/components/ui/dropdown-menu.tsx` | Menu nổi bo `rounded-r20 bg-surface/95 backdrop-blur-md`, item bo `rounded-r12 hover:bg-white text-xs font-bold`. |
| **Popover** | `src/components/ui/popover.tsx` | Khung popover bo `rounded-r24 bg-surface/95 border-stroke/80 shadow-soft`. |
| **Accordion** | `src/components/ui/accordion.tsx` | Thẻ accordion bo `rounded-r24 sm:rounded-r28 border-stroke/80 bg-surface`, header min-h 48px, chevron xoay 180°, animation Motion height + opacity 180-240ms, `type="multiple"`, giữ nguyên DOM form inputs khi toggle. |
| **StatusPill / ShootStatusBadge** | `src/components/shoots/status-pill.tsx` | Viên thuốc trạng thái cao >= 40px, dot indicator (pulse nhẹ cho Đang diễn ra), label uppercase font-black, chevron nhỏ. Popover dropdown đổi status tức thì kèm swatch, checkmark và toast xác nhận. |
| **Motion** | `src/components/ui/motion-container.tsx` | Chuyển view lịch `CalendarViewTransition`, dàn thẻ `StaggerContainer`/`StaggerItem`, tự động tắt khi có `prefers-reduced-motion`. |
| **Drag & Drop** | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers` | Cảm biến an toàn `PointerSensor(8px)` + `TouchSensor(250ms)`. Thẻ kéo có `DragOverlay` nổi lơ lửng, drop zone viền hồng neon `border-pink`. |

### 6.2. Điều Cấm Tuyệt Đối:
- ❌ **KHÔNG** dùng style xám vuông vức mặc định của shadcn/ui (`rounded-md`, border mỏng xám lạnh, nút chữ nhật đơn điệu).
- ❌ **KHÔNG** dùng icon Lucide mặc định của shadcn; luôn dùng thư viện icon **Iconsax** (`iconsax-react`) với biến thể `Linear` hoặc `Bold`.
- ❌ **KHÔNG** tự viết thẻ `<button>`, `<dialog>` hay popover thủ công bằng HTML thô; luôn dùng các primitives trên.

### 6.3. Nâng cấp Shoot Detail Progressive Disclosure (03/10/2026):
- Mặc định 3 section thao tác sâu đóng hoàn toàn: **CẬP NHẬT LỊCH QUAY**, **PHÂN CÔNG EKIP**, **ĐẶT THIẾT BỊ**.
- Trạng thái đóng: Mỗi section là Summary Card/Row có icon, title lớn kèm `*` hồng, chevron xoay, số liệu tóm tắt và badge cảnh báo xung đột (đỏ)/thiếu dữ liệu (vàng).
- Trạng thái mở: Bấm toàn bộ header hoặc chevron xổ form chi tiết. Animation Motion 180–240ms, tôn trọng `prefers-reduced-motion`. Không reset form inputs chưa lưu.
- Hỗ trợ mở đồng thời nhiều section (`type="multiple"`) để đối chiếu ekip và thiết bị.
- Mobile touch target tối thiểu 48px, không phụ thuộc hover.
- Checklist tự động collapse khi danh sách vượt quá 4 mục.

### 6.4. Nâng cấp ShootStatusBadge / StatusPill (03/10/2026):
- 6 visual status được phối màu tinh tế chuẩn G.Lab (không chói toàn màn hình, chỉ là accent mạnh trên nền blush/white):
  - Kế hoạch (`planned`): neutral gray / cream
  - Đã xác nhận (`confirmed`): mint green
  - Sẵn sàng (`ready`): butter yellow
  - Đang diễn ra (`in_progress`): G.Lab hot pink, chữ đen, chấm dot pulse rất nhẹ
  - Hoàn thành (`completed`): sky blue
  - Đã hủy (`cancelled`): muted red/gray
- Hiển thị đầu tiên trong Header Shoot Detail và trong Summary khi section đang đóng:
  `[STATUS PILL] ngày/giờ chính · call time · location`
- Popover dropdown có swatch màu, checkmark, mô tả ngắn, transition Motion 180ms và toast phản hồi.

### 6.5. Đơn Giản Hóa Cài Đặt Google Calendar (03/10/2026):
- **Mục tiêu:** Thay thế giao diện kỹ thuật phức tạp bằng cấu trúc thân thiện, dễ hiểu, loại bỏ hoàn toàn các thuật ngữ gây hoang mang (`Target Calendar`, `Source Calendars`, `Bị chặn`, `Lịch phụ/Ekip`, `sourceCalendarId` dạng UUID/email thô).
- **Cấu trúc giao diện tối giản theo G.Lab language:**
  1. **Thẻ Tài khoản & Master Switch:**
     - Hiển thị tài khoản Google đã liên kết kèm badge `Đã kết nối` / `Chưa kết nối`.
     - Master switch: `[Đồng bộ với Google Calendar] ON/OFF` để bật/tắt toàn diện việc trao đổi dữ liệu.
     - Các nút hành động gọn gàng: `Đồng bộ ngay` (hiệu ứng spinner khi pending) và `Ngắt kết nối`.
  2. **Lịch nhận sự kiện từ G.Lab (G.Lab → Google Calendar):**
     - Dropdown chọn lịch: `[ G.Lab Production (Khuyên dùng) ★ ▾ ]`.
     - Lịch cá nhân (Primary) được hiển thị dạng vô hiệu hóa với ghi chú thân thiện: `— Lịch cá nhân (Không dùng cho lịch sản xuất)` (không dùng từ ngữ tiêu cực như `Bị chặn`).
     - Đoạn văn bản định hướng rõ: *"Các lịch quay và lịch sản xuất từ G.Lab sẽ xuất hiện trong lịch này trên Google Calendar."*
     - Gợi ý nhẹ nhàng: Tự động nhắc người dùng tạo lịch `G.Lab Production` trên Google Calendar nếu chưa có.
  3. **Nhập lịch Google vào G.Lab (Google → G.Lab):**
     - Switch `[ ON/OFF ]` đơn giản: *"G.Lab có thể nhập các sự kiện từ Google Calendar."*
     - Thẻ thông báo xác nhận: `✓ Sinh nhật từ Google Contacts được tự động bỏ qua` (tự động loại trừ ở cấp backend, không cần checkbox thao tác thủ công).
  4. **Cài đặt nâng cao (Accordion G.Lab bo mềm):**
     - **Lịch được nhập vào G.Lab:** Checkbox trực quan với tên lịch dễ đọc (không để lộ `sourceCalendarId` hay badge kỹ thuật).
     - **Lịch hệ thống:** Thẻ Sinh nhật hiển thị trạng thái `Tự động bỏ qua`.
     - **Loại sự kiện xuất sang Google:** Buổi quay, Cuộc họp, Khảo sát, Nội bộ.
     - **Dọn dẹp sự kiện sinh nhật cũ:** Công cụ dry-run preview và xác nhận phân loại dữ liệu an toàn.

### 6.6. Giao Diện Cài Đặt Trợ Lý AI & Quản Lý API Key (/settings/ai) (03/10/2026):
- **Ngôn ngữ thiết kế:** Chuẩn phong cách editorial G.Lab với tông màu hồng phấn `#FFF1F6`, tiêu đề display `CÀI ĐẶT AI*`, thẻ card bo góc `rounded-3xl` và typography hiện đại.
- **Trải nghiệm người dùng:**
  1. **Thẻ Nhà Cung Cấp & API Key (BYOK):**
     - Đơn vị cung cấp: `302.AI`.
     - Ẩn mật mã an toàn: `••••••••39AF` (chỉ hiển thị 4 ký tự cuối, không lưu hay phản hồi plaintext về browser).
     - Badge trạng thái: `✓ Đã cấu hình` (mint pastel) hoặc `Chưa cấu hình` (cream/gray).
     - Các nút thao tác tinh gọn: `[Thay API key]` và `[Xóa API key]` tích hợp `AlertDialog` xác nhận trước khi hủy.
  2. **Hạn Mức Tín Dụng AI (Credits Quota):**
     - Thanh tiến độ mức độ tiêu thụ tín dụng hàng tháng kèm thông tin ngày làm mới (Reset chu kỳ 30 ngày).
     - Hiển thị gói dịch vụ hiện tại (`FREE`, `PRO`, `STUDIO`).
  3. **Chẩn đoán an toàn (Diagnostics):**
     - Bảng thông số kỹ thuật chẩn đoán hiển thị an toàn: User ID, Workspace ID, Nhà cung cấp, Nguồn chứng thực (`User BYOK` / `Workspace BYOK` / `Managed AI` / `Dev Fallback`), tuyệt đối không làm lộ raw secret.

### 6.7. Màn Hình Tài Khoản, Quản Lý Đội Ngũ, Chuông Thông Báo & Danh Bạ Khách Hàng (03/10/2026):
- **1. Màn hình Cài đặt → Tài khoản (`/settings/account`):**
  - Card thông tin hồ sơ: Avatar người dùng, tên hiển thị, Google email xác thực.
  - Badge đặc quyền quản trị: `Quản trị viên hệ thống` (dành riêng cho `super_admin` / `betafpt@gmail.com`) hoặc `Thành viên`.
  - Thẻ Không gian làm việc đang hoạt động: Hiển thị tên Workspace, Múi giờ, Workspace ID và vai trò thành viên (`Chủ sở hữu`, `Quản trị viên`, `Nhà sản xuất`, `Thành viên`, `Người xem`).
  - Card Đăng xuất an toàn: Nút `Đăng xuất` màu đỏ pastel bo pill, tích hợp tiện ích `clearClientDataOnSignOut` tự động xóa sạch `localStorage`, `sessionStorage`, `caches`, `indexedDB` trước khi kết thúc phiên, loại bỏ hoàn toàn nguy cơ rò rỉ dữ liệu chéo thiết bị.
- **2. Màn hình Cài đặt → Đội ngũ (`/settings/team`):**
  - Form tra cứu chính xác email Google (`lookupMemberByEmailAction`) với card xem trước an toàn (Safe User Preview: Avatar + Tên + Email + Trạng thái đã đăng ký / chưa đăng ký).
  - Phân quyền khi mời: Dropdown chọn vai trò `ADMIN`, `PRODUCER`, `MEMBER`, `VIEWER` (chỉ `OWNER` hoặc `ADMIN` mới có quyền mời/xóa).
  - Nếu email đã đăng ký: Tự động thêm trực tiếp vào workspace và gửi Notification cho thành viên.
  - Nếu email chưa đăng ký: Tạo Lời mời đang chờ (`Pending Invitation`) có hiệu lực 7 ngày, tự động gắn membership khi người dùng đó đăng nhập Google lần đầu.
  - Danh sách thành viên hiện tại: Hiển thị badge vai trò, nút gỡ thành viên (bảo vệ không cho phép gỡ `OWNER`).
  - Danh sách lời mời đang chờ: Hiển thị email, vai trò, hạn hết hạn và nút `[Hủy]` lời mời.
- **3. Chuông Thông Báo Toàn Cục (`NotificationBell`):**
  - Tích hợp trực tiếp vào thanh điều hướng bên cạnh `WorkspaceMenu` trên toàn bộ các trang.
  - Hiển thị badge số lượng thông báo chưa đọc màu hồng G.Lab kèm hiệu ứng pulse nhẹ khi có thông báo mới.
  - Popover dropdown hiển thị 20 thông báo mới nhất thuộc 4 loại:
    - `EVENT_ASSIGNED` (Gán vào buổi quay)
    - `EVENT_UPDATED` (Cập nhật lịch / trạng thái buổi quay)
    - `EVENT_CANCELLED` (Hủy buổi quay)
    - `INVITATION_RECEIVED` (Thêm vào workspace)
  - Tương tác thông minh: Bấm vào thông báo sẽ tự động chuyển hướng đến chi tiết buổi quay hoặc trang cài đặt đội ngũ, đồng thời tự động đánh dấu đã đọc. Nút `Đọc tất cả` một chạm.
- **4. Danh Bạ Khách Hàng Scoped Server DB (`/clients`, `/clients/[id]`):**
  - Chuyển đổi 100% dữ liệu danh bạ khách hàng từ `localStorage` sang server database PostgreSQL (`clients` table).
  - Tự động phân lập khách hàng theo `organizationId`, bảo đảm tuyệt đối tính riêng tư giữa các studio khác nhau.

### 6.8. Performance & Data Architecture Refactor (Native-Feeling Web App) (04/10/2026):
- **1. Loading Architecture & Caching Layer:**
  - App Shell persistent: Cả Sidebar (Desktop) và Bottom Navigation (Mobile) nằm ngoài vùng render động, không bị giật, nhấp nháy hoặc remount khi chuyển route.
  - Loại bỏ hoàn toàn full-page spinner: Thay thế bằng Skeleton cards theo từng section/card mang đậm phong cách G.Lab.
  - Tối ưu Caching Layer (`unstable_cache` & tag revalidation): Thời gian phản hồi điều hướng tab khi có cache giảm từ 300–700ms xuống còn **< 1ms**.
  - Prefetching: Áp dụng `prefetch={true}` cho toàn bộ liên kết điều hướng và thẻ buổi quay để nạp sẵn dữ liệu khi người dùng hover/focus.
- **2. Optimistic Updates (Native Feel 0ms UX):**
  - Checklist item: Bấm hoàn tất hoặc xóa mục checklist lập tức phản hồi ngay 0ms trên màn hình; thanh tiến độ và Readiness % cập nhật tức thì; tự động rollback + toast "Thử lại" nếu server lỗi.
  - StatusPill: Đổi trạng thái buổi quay phản hồi tức thì với màu badge tương ứng; tự động rollback nếu server action thất bại.
  - Calendar Drag-and-Drop: Kéo thả thẻ buổi quay giữa các ngày trong Tháng/Tuần di chuyển ngay lập tức; hiển thị Toast có nút "Hoàn tác"; tự động rollback nếu có xung đột hoặc lỗi mạng.
- **3. Triệt tiêu Cumulative Layout Shift (CLS):**
  - Loại bỏ hoàn toàn animation co giãn width/height trực tiếp; chuyển sang chỉ animate `opacity` và `transform` (`y`, `scale`), luôn tôn trọng `useReducedMotion()`.
- **4. Kết quả nghiệm thu thực tế:**
  - 100% pass 33 test files (195 unit & workflow tests).
  - Next.js production build hoàn tất 18/18 routes sạch sẽ, Shared JS First Load chỉ 87.4 kB.
  - Đã kiểm thử trực quan trên cả Desktop 1440px và Mobile 390px qua browser subagent như người dùng thực thụ.

### 6.9. Sửa lỗi Server Components Render & Date Serialization Boundary (04/10/2026):
- **1. Triệt tiêu lỗi Server Components Render (`error.tsx`):**
  - Nguyên nhân: Trong Next.js App Router, `redirect()` ném biệt lệ nội bộ `NEXT_REDIRECT`. Khi bọc `requireWorkspaceContext()` trong `try ... catch` mà không kiểm tra `isRedirectError`, khối catch nuốt mất tín hiệu chuyển hướng của Next.js khiến Server Component rơi vào trạng thái lỗi render ở production.
  - Khắc phục: Xây dựng hàm helper `isRedirectError(error)` chuẩn hóa trong `src/server/workspace-context.ts` và re-throw xuyên suốt các page loaders (`/calendar`, `/shoots`, `/shoots/[id]`, `/crew`, `/equipment`, `/projects`, `/integrations/google-calendar`, `/`).
- **2. Khắc phục Date Serialization Boundary từ `unstable_cache`:**
  - Nguyên nhân: Next.js `unstable_cache` serialize dữ liệu trả về qua JSON khiến các trường `Date` (`startsAt`, `endsAt`, `createdAt`, `updatedAt`, `anchor`) bị biến thành string ISO, dẫn đến `RangeError: Invalid time value` khi gọi `Intl.DateTimeFormat.prototype.format()` hoặc `a.startsAt.getTime()`.
  - Khắc phục: Tự động re-hydrate toàn bộ đối tượng `Date` ngay tại `src/server/cached-loaders.ts` và bọc hàm chuyển đổi an toàn `toDate()` trong `src/app/calendar/page.tsx` và `src/app/integrations/google-calendar/google-calendar-view.tsx`.

### 6.11. Tái Cấu Trúc Toàn Diện Visual Hierarchy, Canvas Thống Nhất & Spacing Chuẩn Reference (05/10/2026):
- **Mục tiêu:** Tạo trải nghiệm calendar workspace thống nhất, thoáng, cân bằng và calendar-first chuẩn theo Reference 1 ở WEEK Timeline view. Xóa hoàn toàn khoảng trống lớn giữa icon rail và context panel.
- **1. Khung Layout & Grid Tỷ Lệ Chuẩn Reference (ở desktop 1600px):**
  - **Outer workspace:** `max-width: 1400px`, `margin: auto` (được quản lý thống nhất tại `AppShell`).
  - **Icon rail trái:** Rộng đúng `120px`, nền `bg-transparent border-r border-black/[0.04]` hòa vào canvas blush, icon căn đều dọc.
  - **Khoảng cách rail → context panel:** Đúng `30px` (`gap-x-[30px]`), xóa hoàn toàn khoảng trống thừa.
  - **Context panel:** Rộng đúng `355px`, bắt đầu ngay dưới header, sát cạnh icon rail.
  - **Khoảng cách context panel → main calendar:** Đúng `30px` (`gap-x-[30px]`).
  - **Main calendar:** Chiếm phần chiều rộng còn lại (~865px), bắt đầu cùng hàng với context panel và là focal point chính.
  - **CSS grid mục tiêu:** `grid-template-columns: 120px 355px minmax(0, 1fr); column-gap: 30px;`.
- **2. View Mặc Định & Header:**
  - **Default desktop view:** Là `Tuần` (Week Timeline), không phải `Tháng`.
  - **Header 1 tầng:** Góc trái là `G.Lab Calendar *` nhỏ gọn, trung tâm là View switcher [Day | Week | Month] với `Week` active màu đen, góc phải là Search, Google Sync status và Avatar.
- **3. Context Panel Hoàn Chỉnh:**
  - **Mini calendar lớn:** Kích thước `355px × 308px` ở desktop, highlight ngày chọn màu xanh lime non signature `#D7F994`, ngày hôm nay có viền hồng, chấm tròn dưới ngày có buổi quay.
  - **“Lịch quay hôm nay”:** Card tóm tắt cao ~100–120px khi thu gọn (tên shoot, giờ, status chip, tên dự án); click mở rộng chi tiết.
  - **“Cần chú ý”:** Card tóm tắt cao ~100–120px khi thu gọn (xung đột ekip/thiết bị và số mục checklist); click mở rộng chi tiết.
- **4. Main Calendar Week Timeline:**
  - Header 7 ngày (`05 T2` hồng hôm nay, `06 T3`...).
  - Cột mốc giờ `GMT+7` (8 Am - 6 Pm).
  - Event blocks nằm trực tiếp trên time-grid theo khung giờ (tên dự án, tiêu đề shoot, giờ, avatar stack 1–3 + "+N", chấm trạng thái).
  - Đường thời điểm hiện tại hồng sáng kèm glowing dot tại mốc giờ thực tế.
  - Top toolbar trực tiếp trên grid: time range label, nút `< >`, nút `Today` và nút `+ Tạo lịch quay` pill đen.
- **5. Kiểm Thử & Nghiệm Thu:**
  - `npx tsc --noEmit`: PASS 0 lỗi.
  - Playwright visual inspect tại 1600px: `railWidth: 120px`, `railToContextGap: 30px`, `contextWidth: 355px`, `contextToMainGap: 30px`, `mainCalendarWidth: 817px`.
  - Screenshot đối chiếu chuẩn xác: `desktop_1600_blueprint.png`.

### 6.12. Tối Ưu Bố Cục Fluid Responsive Cho Màn Hình Lớn Desktop / 2K / 4K (05/10/2026):
- **Bối cảnh & Vấn đề giải quyết:** Bản mockup trước đây dùng khung cố định `max-width: 1400px` khiến giao diện trên màn hình Full HD 1080p, 2K (1440p) và 4K (2160p) bị co cụm ở giữa và xuất hiện dải nền trống lớn hai bên cạnh; chiều cao calendar bị lửng lơ.
- **Giải pháp Kiến Trúc Fluid Grid:**
  - **Loại bỏ hoàn toàn `max-width: 1400px` cố định** khỏi `AppShell`, layout co giãn mượt mà theo CSS viewport.
  - **Outer padding-inline:** Áp dụng `clamp(24px, 4vw, 96px)` thông qua biến CSS `--app-shell-padding-inline` (16px trên mobile).
  - **Icon Rail:** Rộng đúng chuẩn `110px`, căn đều dọc và sticky `h-screen`.
  - **Context Panel:** Giữ khoảng `clamp(340px, 20vw, 380px)` thông qua `--app-context-width`, sticky khi cuộn trang (`lg:sticky lg:top-4`).
  - **Main Calendar:** Dùng `minmax(0, 1fr)` hấp thụ 100% diện tích chiều ngang còn lại và là vùng mở rộng chính.
  - **Khoảng cách (Gap):** Dùng `clamp(24px, 2vw, 40px)` thông qua `--app-shell-gap`.
  - **Chiều cao Calendar:** Thiết lập `min-height: calc(100vh - 140px)` (tăng lên `calc(100vh - 150px)` ở 1920px và `calc(100vh - 160px)` ở 2560px) cùng time slot min-height tăng dần (`52px` -> `64px` -> `76px`) qua CSS media queries, giúp calendar trải dài trọn vẹn màn hình mà không bị lửng lơ.
  - **Đường thời điểm hiện tại:** Tự động tính toán vị trí theo tỷ lệ phần trăm động `calc(12px + ratio * (100% - 24px))` đồng bộ với padding cột giờ, đảm bảo độ chính xác tuyệt đối ở mọi chiều cao viewport.
- **Số liệu đo lường kiểm thử thực tế trên Playwright:**
  - **1440×900:** Padding 57.6px | Rail 110px | Gap 29px | Context 340px | Gap 29px | Main Calendar 817px (Cao 760px). Giữ nguyên tỷ lệ reference ban đầu.
  - **1920×1080:** Padding 76.8px | Rail 110px | Gap 38px | Context 380px | Gap 38px | Main Calendar 1200px (Cao 930px). Calendar mở rộng thêm +383px rõ rệt, triệt tiêu hoàn toàn khoảng trống thừa.
  - **2560×1440:** Padding 96px | Rail 110px | Gap 40px | Context 380px | Gap 40px | Main Calendar 1798px (Cao 1280px). Bố cục cân đối, thoáng đãng, các cột ngày rộng ~240px.
  - **3840×2160 (4K):** Padding 96px | Rail 110px | Gap 40px | Context 380px | Gap 40px | Main Calendar 3078px (Cao 2000px). Calendar bao phủ toàn bộ màn hình 4K, nội dung sắc nét và không phóng đại font/icon tùy tiện.
- **Kết quả kiểm thử:**
  - `npx tsc --noEmit`: PASS 0 lỗi.
  - `npm run lint`: PASS 0 lỗi.
  - `npm run build`: PASS 100% (18/18 routes biên dịch thành công).
  - Screenshots lưu tại artifacts: `calendar_viewport_1440x900.png`, `calendar_viewport_1920x1080.png`, `calendar_viewport_2560x1440.png`, `calendar_viewport_3840x2160.png`.

### 6.13. Tự Động Kéo Lịch Google Calendar & Nút Đồng Bộ Nhanh (05/10/2026 - Commit `99e9360`):
- **Bối cảnh & Vấn đề giải quyết:** Sự kiện từ Google Calendar không tự động cập nhật sang G.Lab nếu người dùng không bấm đồng bộ thủ công trong trang settings.
- **Giải pháp:**
  - Triển khai cơ chế auto-pull ngầm an toàn tại `src/server/services/google-calendar-auto-pull.ts` có throttling/cooldown 90 giây để tránh gọi Google API lặp lại khi người dùng reload hoặc điều hướng liên tục, đồng thời vẫn giữ lịch đủ gần realtime.
  - Tích hợp hook kiểm tra và đồng bộ tự động khi người dùng truy cập trang `/calendar`.
  - Bổ sung nút Quick Sync trực quan trên top header (`src/components/calendar/calendar-quick-sync-button.tsx`) với animation xoay mượt mà, phản hồi toast và cập nhật tức thì.
- **Kiểm thử:** 5 unit tests trong `src/server/services/google-calendar-auto-pull.test.ts` PASS 100%.

### 6.14. Mở Rộng Khung Giờ Timeline (7 AM - 9 PM) & Định Vị Sự Kiện Chuẩn Xác Theo Giờ Thực Tế GMT+7 (05/10/2026 - Commit `7dc3662`):
- **Bối cảnh & Vấn đề giải quyết:** 
  - Khung giờ cũ (8 AM - 6 PM) quá hẹp, các buổi quay tối từ 6:00 PM đến 7:00 PM bị đẩy ra ngoài hoặc nằm sai vị trí giờ so với thực tế.
  - Lỗi tính toán `getMinutesInDay` do lệch múi giờ khiến thẻ buổi quay 18:00 bị đặt ở đầu ngày thay vì đúng hàng 6 PM.
- **Giải pháp:**
  - Mở rộng trục timeline từ 8 AM - 6 PM (10 tiếng) lên 7 AM - 9 PM (14 tiếng), bao phủ toàn bộ ca quay sáng sớm và tối muộn.
  - Tính toán offset thời gian theo múi giờ chỉ định (`timeZone` - mặc định `Asia/Ho_Chi_Minh` GMT+7) với công thức phần trăm chính xác trên tổng 840 phút.
  - Xử lý các buổi quay kéo dài qua nhiều ngày (multi-day boundary clipping).
  - Thuật toán gom cụm sự kiện trùng giờ (cluster layout) chia cột ngang mượt mà, không bị đè khuất nhau.
- **Kiểm thử:** Typecheck PASS, build 18/18 routes PASS, vị trí thẻ 6:00 PM - 7:00 PM nằm chính xác tuyệt đối tại mốc hàng 6 PM.

### 6.15. Khắc Phục Lỗi Cắt Xén Chữ Trên Thẻ Sự Kiện Timeline Tuần (05/10/2026 - Commit `a4d76fa`):
- **Bối cảnh & Vấn đề giải quyết:** 
  - Thẻ sự kiện 1 tiếng có chiều cao tối thiểu (`minHeight: 78px`). Khi kết hợp với `justify-between` trên 4 phần tử con (Tag dự án, Tiêu đề 2 dòng, Giờ quay, Ekip/Status), flexbox đẩy dòng đầu tiên `G.LAB SHOOT` sát mép trên.
  - Thuộc tính `overflow-hidden` bo góc cong `rounded-[16px]` đã cắt xén mất một nửa chữ `G.LAB SHOOT` phía trên.
- **Giải pháp:**
  - Nhóm 3 phần tử thông tin (Tag dự án, Tiêu đề, Khung giờ) thành 1 khối duy nhất `<div className="min-w-0 flex flex-col justify-start">` với line-height chuẩn (`leading-none`, `leading-[1.25]`).
  - Đặt phần chân thẻ (Ekip & chấm trạng thái) thành `shrink-0` ghim đáy thẻ.
  - Tăng `minHeight` từ `78px` lên `96px` và tối ưu padding dọc `sm:py-2 sm:px-2.5`, đảm bảo cả thẻ ngắn lẫn tiêu đề dài 2 dòng đều có đủ không gian thở thoáng đãng, 100% chữ và icon hiển thị trọn vẹn không bị mép bo tròn cắt xén.
- **Tệp sao lưu backup:** `.ui-backups/src-components-calendar-calendar-timeline-week--20261005-135400.bak.tsx`
- **Kiểm thử & Triển khai:**
  - Typecheck: 0 lỗi.
  - Tests: 200/200 tests PASS (34 test files).
  - Build: 18/18 routes PASS.
  - Visual verification: Thẻ hiển thị sắc nét, đủ lề và cân đối.
  - Đã deploy lên production `calendar.geelab.vn` tại commit `a4d76fa`.

### 6.16. Khóa Chiều Cao Viewport, Cải Tiến Week Timeline Chống Cuộn Trang Toàn Cục, Sticky Matrix & Bộ Điều Khiển Mật Độ Giờ (05/10/2026 - Commit `11923aa`):
- **Bối cảnh & Vấn đề giải quyết:**
  - Timeline hiển thị các khung giờ theo chiều cao tự nhiên khiến toàn bộ trang web (body / app shell) bị kéo dài cuộn dọc, làm rail sidebar, header và context panel trôi mất khi xem các khung giờ muộn.
  - Người dùng không có cách thu nhỏ/phóng to tỷ lệ giờ theo nhu cầu (xem bao quát cả ngày hay tập trung vào khung giờ chi tiết).
- **Giải pháp & Kiến trúc thực hiện:**
  - **Khóa cuộn Desktop Viewport (`src/components/app-shell.tsx`, `src/app/calendar/page.tsx`):**
    - Áp dụng `lg:h-screen lg:max-h-screen lg:overflow-hidden` trên desktop khi ở trang `/calendar`.
    - Main container và Calendar Panel co giãn chiếm trọn chiều cao còn lại của màn hình (`height: 100%`, `min-height: 0`).
    - Context panel sở hữu vùng cuộn độc lập `lg:h-full lg:min-h-0 lg:overflow-y-auto`.
    - Triệt tiêu hoàn toàn scrollbar toàn trang ngoài ý muốn.
  - **Vùng cuộn chuyên biệt `timeline-scroll-area` (`src/components/calendar/calendar-timeline-week.tsx`):**
    - Chỉ vùng timeline mang class `timeline-scroll-area` được `overflow-y: auto`.
  - **Sticky Matrix 2 chiều hoàn hảo:**
    - Hàng tiêu đề 7 ngày (`05 T2`, `06 T3`,...): `sticky top-0 z-30 bg-white/95 backdrop-blur-md`, luôn cố định ở đỉnh khi cuộn dọc.
    - Cột thời gian bên trái (`GMT+7`, `7 Am` – `9 Pm`): `sticky left-0 z-20 bg-white/95 backdrop-blur-sm`, luôn hiển thị khi cuộn ngang.
    - Ô góc trái trên cùng (`GMT+7`): `sticky top-0 left-0 z-40 bg-white` không bao giờ bị đè lấp.
  - **Bộ Điều Khiển Mật Độ Giờ (Density Switcher):**
    - Bổ sung cụm chuyển đổi segmented pill trên toolbar: `Gọn | Chuẩn | Rộng`.
      - **Gọn (`compact`):** 40px / giờ (xem trọn vẹn cả ngày từ 7 AM tới 9 PM trong 1 màn hình).
      - **Chuẩn (`standard`):** 56px / giờ (mặc định cân bằng, thoáng đãng).
      - **Rộng (`spacious`):** 80px / giờ (không gian thoải mái cho các sự kiện chi tiết).
    - Lưu trạng thái mật độ đã chọn vào `localStorage` (`glab_timeline_density`) để duy trì trải nghiệm người dùng.
    - Thẻ sự kiện thích ứng kích thước (Adaptive Shoot Card): tự động chuyển sang chế độ hiển thị 1 dòng khi chiều cao `< 50px`, 2 dòng khi `50px - 75px`, và hiển thị đầy đủ avatar ekip khi `>= 76px`.
  - **Cơ chế Cuộn Thông Minh (Smart Auto-Scroll):**
    - Khi xem tuần hiện tại: Tự động cuộn tới giờ hiện tại (trừ trường hợp người dùng đã chủ động cuộn).
    - Khi duyệt sang tuần khác: Tự động cuộn mở tại mốc `08:00`.
    - Nút `Hiện tại`: Đưa lịch về tuần hiện tại và đồng thời cuộn mượt tới vị trí giờ hiện tại.
- **Tệp sao lưu backup:**
  - `.ui-backups/src-components-calendar-calendar-timeline-week--20261005-173600.bak.tsx`
  - `.ui-backups/src-app-calendar-page--20261005-173600.bak.tsx`
  - `.ui-backups/src-components-app-shell--20261005-173600.bak.tsx`
- **Kiểm thử & Triển khai:**
  - Typecheck: PASS 0 lỗi (`npx tsc --noEmit`).
  - Unit tests: PASS 200/200 tests (34 test files).
  - Lint: PASS clean (`npm run lint`).
  - Next build: PASS 18/18 routes (`npm run build`).
  - Playwright visual testing: Thử nghiệm thực tế tại độ phân giải 1440×900 xác nhận sidebar, header và context panel cố định 100%, timeline cuộn mượt mà độc lập, mật độ giờ và nút Hiện tại hoạt động chuẩn xác.
  - **Triển khai Production:** Đã commit và push lên nhánh `main` tại commit `11923aa`, kích hoạt deploy tự động lên `https://calendar.geelab.vn`.

