---
paths:
  - "src/components/**/*.tsx"
  - "src/app/**/*.tsx"
---

# Tạo và bảo trì component

Áp dụng cho component React/TSX trong `src/`.

- Quy ước hiện có: file kebab-case (`teachers-view.tsx`, `app-header.tsx`), component export có tên PascalCase (`TeachersView`, `AppHeader`), không dùng default export ngoài `page.tsx`/`layout.tsx`. Giữ quy ước này cho file mới; không đổi tên file cũ.
- Props khai báo inline bằng object type như trong `common.tsx`, hoặc `type` riêng khi được tái sử dụng. Định kiểu đầu vào/đầu ra của callback (vd. `onConfirm: () => Promise<unknown>`).
- View gồm: component trang (`<Entity>View`) giữ hook dữ liệu và state lọc; dialog thêm/sửa là function riêng trong cùng file, nhận dữ liệu cần thiết qua props. Làm theo cấu trúc này cho view mới.
- Form: dùng `useState` + `<form onSubmit>` + `Input`/`Select`/`Textarea`/`Label`, kiểm tra hợp lệ trước khi submit (biến `valid`), trạng thái `pending` để disable nút. Không thêm thư viện form.
- Bảng: dùng `src/components/ui/table.tsx` trong `Card`; loading `TableSkeleton`, lỗi `ErrorState` (truyền `onRetry={() => x.mutate()}`), rỗng `EmptyState`. Key là `id` của bản ghi.
- Xóa: dùng `ConfirmDelete`; thêm/sửa: bọc lời gọi API trong `runMutation`. Không tự viết lại toast/refresh.
- Trước khi sửa component dùng chung (`common.tsx`, `layout/`, `ui/`), tìm tất cả nơi dùng và giữ nguyên mặc định/hành vi. Chỉ thêm prop tùy chọn với giá trị mặc định an toàn.
- Dùng HTML ngữ nghĩa, `Label` gắn `htmlFor`/`id`, control thao tác được bằng bàn phím. Nút chỉ có icon phải có `aria-label` (mẫu: `ConfirmDelete`).
- Văn bản giao diện bằng tiếng Việt có dấu.

## Danh sách kiểm tra

- Đã tìm component tương tự và truy vết nơi sử dụng chưa?
- Props/callback đã được định kiểu, control có accessibility chưa?
- Đã xử lý loading/error/empty và dùng `runMutation`/`ConfirmDelete` cho thao tác ghi chưa?
