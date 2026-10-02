# G.LAB Production — Codex UI Handoff Package

Bộ tài liệu này là **source of truth** để Codex triển khai UI cho app quản lý lịch quay/chụp G.LAB Production.

## Mục tiêu

Tạo một ứng dụng production scheduling dành cho filmmaker / photographer / studio với visual language bám sát các ảnh trong `reference/primary/`.

**Ưu tiên:**
1. Mobile-first.
2. React tương tác thật, không phải ảnh tĩnh.
3. Android-friendly ngay từ đầu.
4. Kiến trúc component/token có thể tái sử dụng cho web responsive về sau.
5. Animation rõ ràng, nhanh, tactile, không lạm dụng.

## Cách dùng với Codex

1. Copy toàn bộ thư mục này vào root project, ví dụ `docs/ui-handoff/`.
2. Mở `docs/CODEX_MASTER_PROMPT.md` và gửi nguyên prompt đó cho Codex.
3. Yêu cầu Codex xem **tất cả ảnh trong `reference/primary/` trước khi code**.
4. `reference/primary/` có ưu tiên cao hơn mọi mô tả chữ nếu có khác biệt về thẩm mỹ.
5. `reference/secondary/` dùng để bổ sung screen/flow chưa xuất hiện đầy đủ trong bộ primary.

## File quan trọng

- `docs/CODEX_MASTER_PROMPT.md` — prompt tổng để đưa vào Codex.
- `AGENTS.md` — quy tắc thường trực cho agent.
- `docs/VISUAL_SYSTEM.md` — màu, typography, spacing, shape, hierarchy.
- `docs/SCREEN_SPECS.md` — đặc tả từng page.
- `docs/COMPONENT_LIBRARY.md` — component cần tái sử dụng.
- `docs/MOTION_INTERACTION.md` — animation, gesture, transition.
- `docs/RESPONSIVE_PLATFORM.md` — Android + web responsive.
- `docs/IMPLEMENTATION_PLAN.md` — thứ tự triển khai.
- `docs/QA_ACCEPTANCE.md` — checklist visual/interaction QA.
- `design-tokens.json` — token máy đọc được.

## Nguyên tắc quan trọng

Không được "làm giống vibe" theo cách chung chung. Codex phải coi ảnh primary là bản thiết kế tham chiếu trực tiếp cho:
- mật độ nội dung,
- tỷ lệ chữ,
- độ bo góc,
- card hierarchy,
- pastel color blocking,
- icon placement,
- sticky bottom navigation,
- floating action buttons,
- cách hiển thị avatar / gear thumbnail / status / progress.
