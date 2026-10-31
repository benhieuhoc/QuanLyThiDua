---
name: component-refactor
description: Dùng khi tạo, tách, đơn giản hóa hoặc loại bỏ trùng lặp giữa React component/UI dùng chung; chú trọng tìm component hiện có và giữ tương thích với nơi gọi.
---

# Quy trình tạo và refactor component

1. Đọc các rule về quản lý và tái sử dụng component; kiểm tra worktree.
2. Tìm trong `src/components/ui/` (shadcn), `src/components/common.tsx`, `src/components/layout/` và các view trong `src/components/views/`. Đọc các kết quả phù hợp thay vì chỉ dựa vào tên.
3. Truy vết mọi nơi sử dụng và xác định props/giá trị mặc định hiện tại. Chọn: tái sử dụng, thêm prop tương thích ngược, composition, đưa vào `common.tsx` khi có từ hai view dùng, hoặc giữ trong file view.
4. Định nghĩa props có kiểu và ngữ nghĩa hỗ trợ accessibility (`Label` + `id`, `aria-label` cho nút icon). Giữ state ở component sở hữu hành vi; dữ liệu server lấy từ hook SWR, không sao chép vào state.
5. Chỉ thực hiện thay đổi được yêu cầu. Với component dùng chung, cập nhật/kiểm tra mọi nơi gọi và giữ mặc định hiện có. Cần primitive shadcn mới thì hỏi trước rồi dùng `npx shadcn add`.
6. Kiểm tra style responsive/focus/disabled, key `id` ổn định, import và TypeScript. Cập nhật `code-map.md` nếu nơi dùng component thay đổi. Chạy `npm run lint` (và `npm run build` nếu đổi kiểu/route).
7. Báo cáo quyết định tái sử dụng, nơi gọi bị ảnh hưởng, bước kiểm tra và giới hạn (nếu có).
