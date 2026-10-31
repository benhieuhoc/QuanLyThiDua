---
paths:
  - "src/lib/**/*.ts"
  - "src/hooks/**/*.ts"
  - "src/components/**/*.tsx"
---

# Gọi API và ranh giới xác thực

Áp dụng cho `src/lib/api.ts`, `src/lib/types.ts`, `src/hooks/use-data.ts` và code gọi API.

## Hành vi hiện tại đã xác minh

- `src/lib/api.ts`: `api<T>(path, init)` gọi `fetch(`${API_URL}${path}`)` với `Content-Type: application/json`; `API_URL` lấy từ `NEXT_PUBLIC_API_URL` (fallback `http://localhost:3001`). Response chuẩn của BE là `{ success, data, message }` / `{ success: false, message, errors? }`; hàm trả `data` hoặc ném `ApiError(message, status, errors)` (lỗi mạng: `status = 0`).
- Helper: `fetcher` (cho SWR), `apiPost`, `apiPut`, `apiDelete`, `refreshAll()` (revalidate mọi key SWR), `errorMessage(err)` (tạo nội dung toast từ `message` + `errors[]`).
- `src/hooks/use-data.ts`: một hook SWR cho mỗi API, key là path API kèm query. Bảng cấu hình (`/branches`, `/grades`, `/teachers`, `/classes`, `/school-years`) tải toàn bộ, lọc ở client. Hook có tham số (`useWeeks`, `usePoints`, `useWeeklyScore`, `useSummaryScore`, `useClassScore`) trả key `null` khi thiếu tham số bắt buộc. Bảng điểm lọc phân hiệu/khối ở BE (`ScoreScope`), vì hạng được tính trong phạm vi lọc.
- `useCurrentWeek` (`/weeks/current`) trả 404 khi hôm nay ngoài mọi tuần; đây không phải lỗi trang. `useWeekPicker` dùng nó làm mặc định, nếu không có thì lấy tuần đã bắt đầu gần nhất.
- `src/lib/types.ts`: kiểu khớp response BE (`Branch`, `Grade`, `Teacher`, `ClassItem`, `FieldError`). Không có validate runtime; `data` được ép kiểu theo khai báo.
- Chưa có auth: không gửi header `Authorization`, không lưu token. BE chưa gắn middleware auth.

## Nguồn contract

Contract lấy từ backend, theo thứ tự: `../BE/Ai_rules/code-map.md` (route, body, mã lỗi) → `../BE/Ai_rules/backend.md` (chuẩn response) → `../BE/docs/logic-trien-khai.md` (nghiệp vụ) → source `../BE/src/router|controller|service`. Nếu vẫn chưa rõ hoặc endpoint chưa tồn tại, hỏi người dùng/agent BE; không tự đặt path, trường request hay cấu trúc response, và không sửa code BE từ repo này.

## Quy tắc tích hợp mới

- Đọc dữ liệu: thêm hook vào `src/hooks/use-data.ts` dạng `useSWR<T>("/path", fetcher)`. Nếu cần query (`?branchid=`), đưa vào key để SWR cache riêng.
- Ghi dữ liệu: gọi `apiPost`/`apiPut`/`apiDelete` bên trong `runMutation(...)` hoặc `ConfirmDelete onConfirm`, để có toast và `refreshAll()`. Không gọi `fetch` trực tiếp, không hardcode base URL thứ hai.
- Thêm/cập nhật kiểu response trong `src/lib/types.ts` đúng tên trường BE trả về (chữ thường, vd. `branchid`, `teacherid`, `numgrade`). Tránh `any`.
- Giữ `refreshAll()` sau khi ghi: dữ liệu liên quan nhau (đổi mã phân hiệu đổi tên lớp; GV kèm lớp chủ nhiệm). Không cập nhật lạc quan (optimistic) khi chưa được yêu cầu.
- Hiển thị lỗi từ BE qua `errorMessage`; nếu BE thêm dạng `errors[]` mới, cập nhật `errorMessage` và `FieldError`. Validate ở FE chỉ để báo sớm; BE là nơi kiểm tra cuối.
- Cập nhật mục API trong [code-map.md](../architecture/code-map.md) trong cùng thay đổi mỗi khi thêm, sửa hoặc xóa lời gọi API.
- Khi BE triển khai auth (`../BE/Ai_rules/security.md`: JWT qua `Authorization: Bearer <token>`, role `admin`/`teacher`), việc thêm đăng nhập, lưu token và gửi header là thay đổi có chủ đích, cần người dùng yêu cầu rõ và chốt cách lưu token trước. Ẩn/hiện UI theo role không phải authorization.
- Không log token, mật khẩu, header `Authorization` hoặc toàn bộ response.

## Danh sách kiểm tra

- Contract đã đối chiếu với BE thay vì suy đoán chưa?
- Đã dùng `api.ts`/hook SWR/`runMutation` hiện có và giữ `refreshAll()` chưa?
- Kiểu trong `types.ts` và `code-map.md` đã cập nhật chưa?
