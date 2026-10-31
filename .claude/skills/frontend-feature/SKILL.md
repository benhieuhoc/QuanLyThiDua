---
name: frontend-feature
description: Dùng khi triển khai route, màn hình hoặc tính năng frontend mới có thể liên quan đến component, dữ liệu API, state hoặc CSS. Hướng dẫn khảo sát repository, triển khai và xác minh.
---

# Quy trình triển khai tính năng frontend

1. Đọc `CLAUDE.md`, `AGENTS.md`, `.claude/architecture/code-map.md` và các rule phù hợp về kiến trúc, tái sử dụng, tổ chức trang, API, state, lỗi, style, bảo mật và xác minh.
2. Kiểm tra `git status`; giữ nguyên chỉnh sửa không liên quan. Truy vết route trong `src/app/(dashboard)/`, view liên quan, `common.tsx`, hook và kiểu dữ liệu. Tìm UI hiện có trước khi tạo component.
3. Xác nhận hành vi mong muốn và endpoint trong `../BE/Ai_rules/code-map.md` / `../BE/docs/logic-trien-khai.md`. Tính năng BE chưa có API (hiện là đăng nhập/phân quyền) thì dừng lại hỏi người dùng/agent BE; không bịa hành vi backend.
4. Xác định tập file nhỏ nhất cần sửa — thường là `page.tsx`, view, hook trong `use-data.ts`, kiểu trong `types.ts`, mục menu trong `layout/nav.ts` — và mô tả kế hoạch nếu thay đổi đi qua nhiều module hoặc đổi hành vi.
5. Triển khai theo mẫu view hiện có: `PageHeader` → bộ lọc → `Card` + bảng → dialog trong cùng file; thao tác ghi qua `runMutation`/`ConfirmDelete`; trạng thái loading/error/empty đầy đủ.
6. Cập nhật `code-map.md`. Review diff về phạm vi, tương thích API, accessibility và thay đổi ngoài ý muốn.
7. Chạy `npm run lint` và `npm run build`; nếu chạy thử được với BE (cổng 3001, FE cổng 3000) thì kiểm tra trên trình duyệt. Báo kết quả chính xác và mọi hành vi chưa xác minh.

Không refactor code không liên quan, thêm dependency, deploy hoặc dùng dữ liệu giả làm dữ liệu thật.
