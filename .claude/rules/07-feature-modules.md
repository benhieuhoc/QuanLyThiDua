---
paths:
  - "src/app/**/*.tsx"
  - "src/components/**/*.tsx"
---

# Tổ chức trang theo thực thể

Chức năng chính là thi đua (`scoring-view`, `weekly-scores-view`, `summary-view`, `overview-view`); cấu hình gồm `school-years-view`, `branches-view`, `teachers-view`, `classes-view`. Mỗi trang một view; dùng các view hiện có làm mẫu.

- Route: `src/app/(dashboard)/<slug>/page.tsx`, chỉ `metadata` + render view. View: `src/components/views/<entity>-view.tsx`, export `<Entity>View`.
- Cấu trúc view: `PageHeader` (tiêu đề, mô tả, nút thêm) → bộ lọc (nếu có) → `Card` chứa bảng → các dialog thêm/sửa khai báo trong cùng file. Màn hình chỉ đọc tổng hợp (như `overview-view`) dùng `StatCard` + `Card`.
- Dialog/form chỉ dùng trong một view để trong file view đó. Chỉ chuyển lên `common.tsx` khi view khác cũng dùng.
- Lọc, tìm kiếm, đếm (số GV/lớp theo phân hiệu, GV chưa chủ nhiệm) tính ở client từ dữ liệu SWR, vì dữ liệu nhỏ. Chỉ chuyển sang lọc phía server (query `branchid`, `gradeid`) khi được yêu cầu.
- Không có dữ liệu mẫu: không thêm mock/fixture làm dữ liệu dự phòng khi API lỗi; hiển thị `ErrorState`.
- Trang thi đua chọn tuần qua `useWeekPicker` + `WeekPickerControls`; tôn trọng `week.locked` (ẩn/khóa thao tác ghi, BE trả 409). Thành phần dùng ở từ hai trang thi đua trở lên đặt trong `src/components/scores.tsx`.
- Tính năng BE chưa có API (đăng nhập/phân quyền) chỉ làm khi BE đã có endpoint hoặc người dùng yêu cầu rõ phần UI tạm; ghi trạng thái vào `code-map.md`.
- Không tạo tính năng cho học sinh: hệ thống chỉ có role `admin` và `teacher` (theo `../BE/Ai_rules/security.md`).

## Danh sách kiểm tra

- Route gọn, view theo đúng mẫu hiện có chưa?
- Dialog, kiểu dữ liệu, hook và lời gọi API đã nằm đúng chỗ chưa?
- Tính năng có dựa trên endpoint BE thực sự tồn tại không?
