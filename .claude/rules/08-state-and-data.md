---
paths:
  - "src/components/**/*.tsx"
  - "src/app/**/*.tsx"
  - "src/hooks/**/*.ts"
  - "src/lib/**/*.ts"
---

# State và dữ liệu

- Dữ liệu server chỉ nằm trong cache SWR (hook trong `use-data.ts`). State cục bộ chỉ cho bộ lọc, ô tìm kiếm, trạng thái dialog và giá trị form chưa lưu.
- Tính view lọc/sắp xếp/đếm từ `data` khi render; không lưu mảng dẫn xuất riêng.
- Trạng thái async của mỗi hook: `isLoading` → `TableSkeleton`; `error` → `ErrorState` với retry `mutate()`; `data` rỗng → `EmptyState`. Màn hình dùng nhiều hook phải xét lỗi/loading của tất cả hook liên quan.
- Sau create/update/delete: dùng `runMutation`/`ConfirmDelete` để gọi `refreshAll()` sau khi BE xác nhận thành công. Không sửa cache để giả định thành công trước.
- Dialog: chỉ đóng khi `runMutation` trả `true` (`if (ok) setOpen(false)`); lỗi thì giữ dialog để người dùng sửa. Chủ động quyết định giữ hay reset giá trị form khi mở lại, theo cách view đang làm.
- Không đổi ý nghĩa nghiệp vụ: tên lớp lấy từ `ClassItem.name` của BE; GV "chưa chủ nhiệm" là `classid === null` từ `GET /teachers`; chỉ GV cùng phân hiệu, chưa chủ nhiệm mới được chọn làm chủ nhiệm.
- Khi thêm phân trang hoặc lọc phía server, reset trang khi bộ lọc đổi và đưa tham số vào key SWR.

## Danh sách kiểm tra

- Nguồn của từng giá trị rõ ràng, không có state dẫn xuất trùng chưa?
- Đã xử lý loading, error, empty cho mọi hook được dùng chưa?
- UI chỉ phản ánh thao tác đã được BE xác nhận chứ?
