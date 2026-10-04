# G.Lab Calendar — Agent Rules

## Tech stack bắt buộc
- Giữ React / Next.js hiện có.
- UI mới dùng shadcn/ui primitives đã được custom theo G.Lab design system.
- Animation dùng `motion`.
- Drag-and-drop dùng `@dnd-kit`.
- Không tự tạo modal, toast, select, form validation hoặc drag-drop thủ công nếu stack trên đã có primitive phù hợp.

## Design system
- Giữ nguyên G.Lab language: blush pink, black, white, pink `*`,
  typography editorial lớn, card bo mềm, spacing thoáng.
- Không dùng style mặc định của shadcn/ui.
- Không thay font, scale heading hoặc palette G.Lab nếu chưa được yêu cầu.
- Mobile-first, ưu tiên Android; desktop responsive sau.

## An toàn dữ liệu và Google Calendar
- Không tự sync, disconnect hoặc ghi/xóa Google Calendar.
- Không xóa production data hoặc test data.
- Mọi bulk cleanup phải có dry-run, preview số lượng bản ghi và bước xác nhận.
- Không import calendar cá nhân mặc định; chỉ dùng calendar production được chọn.

## Scope và chất lượng
- Đọc `package.json`, cấu trúc source và tài liệu trước khi sửa.
- Không refactor ngoài phạm vi yêu cầu.
- Giữ các luồng Month / Week / Day, shoots, crew, equipment không regression.
- Chạy typecheck, lint và build sau thay đổi.
- Báo cáo: files sửa, test đã chạy, kết quả và việc còn lại.
