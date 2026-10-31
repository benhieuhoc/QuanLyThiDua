---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Xử lý lỗi và phản hồi người dùng

- Mọi lỗi API đi qua `ApiError` (`message`, `status`, `errors?`). Lỗi mạng có `status = 0` và `ErrorState` hiển thị thông báo không kết nối được máy chủ.
- Lỗi khi đọc: `ErrorState` kèm nút thử lại. Lỗi khi ghi: toast `sonner` với nội dung từ `errorMessage(err)` (đã có sẵn trong `runMutation`/`ConfirmDelete`). Không thêm thư viện toast khác.
- Thông báo từ BE đã là tiếng Việt (vd. 409 "Giáo viên đang chủ nhiệm lớp 6A1, không thể xóa"); hiển thị `message` của BE thay vì tự viết lại. `errors[]` có thể là `{ field, message }` (validate) hoặc `{ teacherid, classname? }` (kiểm tra giáo viên).
- Không nuốt lỗi hoặc biến lỗi thành dữ liệu rỗng; không hiển thị thành công khi chưa chắc chắn.
- Chỉ thêm `try/catch` khi xử lý có ý nghĩa. Trạng thái tạm (`pending`) đặt trước `await` phải được khôi phục cả khi lỗi (`finally` hoặc sau `runMutation`, vì hàm này không ném lỗi).
- Không hiển thị stack trace, URL nội bộ, token hay raw response trong UI hoặc `console`.

## Danh sách kiểm tra

- Lỗi đọc/ghi có hiển thị đúng thành phần (`ErrorState`/toast) không?
- Thông báo có hữu ích mà không lộ thông tin nội bộ không?
- Trạng thái loading/disabled có được khôi phục sau lỗi không?
