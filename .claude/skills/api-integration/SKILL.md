---
name: api-integration
description: Dùng khi thêm/thay đổi lời gọi API tới BE, hook SWR, kiểu response, xử lý lỗi API, lời gọi liên quan xác thực hoặc UI dùng dữ liệu từ xa.
---

# Quy trình tích hợp API

1. Đọc các rule về API, state/dữ liệu, xử lý lỗi, bảo mật và kiểm thử; đọc mục API trong `.claude/architecture/code-map.md`.
2. Kiểm tra `src/lib/api.ts`, `src/lib/types.ts`, `src/hooks/use-data.ts`, `runMutation`/`ConfirmDelete` trong `src/components/common.tsx` và view sẽ dùng dữ liệu. Hiện chưa có auth.
3. Xác minh method, path, query/body, kiểu response, mã lỗi và dạng `errors[]` từ `../BE/Ai_rules/code-map.md`, `../BE/Ai_rules/backend.md`, `../BE/docs/logic-trien-khai.md` và source `../BE/src/router|controller|service`. Nếu BE chưa có endpoint hoặc còn thiếu thông tin, dừng lại và hỏi người dùng/agent BE; không tự đặt contract, không sửa BE.
4. Thêm/cập nhật kiểu trong `src/lib/types.ts` đúng tên trường BE.
5. Đọc dữ liệu: thêm hook `useSWR<T>("/path", fetcher)` vào `src/hooks/use-data.ts` (query đưa vào key). Ghi dữ liệu: gọi `apiPost`/`apiPut`/`apiDelete` trong `runMutation` hoặc `ConfirmDelete onConfirm`, giữ `refreshAll()`.
6. Kết nối UI với `TableSkeleton` (loading), `ErrorState` (lỗi, có retry), `EmptyState` (rỗng); lỗi ghi hiển thị bằng toast qua `errorMessage`. Không dùng dữ liệu giả khi API lỗi.
7. Nếu chạm đến auth (đăng nhập, token, header), chỉ làm khi được yêu cầu rõ và đã chốt cách lưu token; tuân theo `../BE/Ai_rules/security.md`. Không log token/mật khẩu.
8. Cập nhật mục API trong `code-map.md`, review diff, chạy `npm run lint`/`npm run build`. Báo bằng chứng contract, file đã sửa và thông tin chưa xác minh.
