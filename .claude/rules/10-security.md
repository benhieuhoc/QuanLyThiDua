---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Bảo mật frontend

- Không commit secret, mật khẩu, token. Biến `NEXT_PUBLIC_*` (như `NEXT_PUBLIC_API_URL`) được đóng gói vào bundle trình duyệt, chỉ chứa thông tin công khai. File `.env*` bị ignore, trừ `.env.example`.
- Hiện chưa có auth. Khi triển khai theo `../BE/Ai_rules/security.md` (JWT, `Authorization: Bearer <token>`, payload `{ id, role }`, role `admin`/`teacher`):
  - Chỉ làm khi người dùng yêu cầu; thống nhất cách lưu token trước khi code.
  - Không log token, mật khẩu, header `Authorization`; không đưa token vào URL.
  - Đăng nhập sai: hiển thị thông báo chung từ BE, không suy đoán tài khoản tồn tại hay không.
  - Ẩn/hiện menu, nút theo role chỉ phục vụ hiển thị; BE mới thực thi phân quyền (vd. teacher chỉ sửa điểm lớp mình chủ nhiệm).
- Coi dữ liệu từ API và input người dùng là không tin cậy; render bằng JSX, không dùng `dangerouslySetInnerHTML`.
- Không log dữ liệu cá nhân (tên giáo viên...) hoặc dump response để debug trong code được giữ lại.
- Không thêm setting, hook hoặc quyền tự chạy command quá rộng trong `.claude/`.

## Danh sách kiểm tra

- Nội dung không tin cậy được render an toàn chưa?
- Có lộ secret/token trong code, log, URL không?
- Thay đổi có đụng tới auth mà không được yêu cầu không?
