---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Quy ước đặt tên và chất lượng code

- File kebab-case (`classes-view.tsx`, `use-data.ts`); component/kiểu PascalCase (`ClassesView`, `ClassItem`); hàm/biến camelCase; hook `useXxx`.
- Route slug tiếng Việt không dấu, gạch nối (`phan-hieu`, `giao-vien`, `lop-hoc`); văn bản giao diện tiếng Việt có dấu.
- Tên trường dữ liệu giữ đúng như BE trả về (`branchid`, `teacherid`, `numgrade`, `created_at`); không đổi sang camelCase hay map lại.
- Comment ngắn bằng tiếng Việt, chỉ giải thích lý do không hiển nhiên (mẫu: comment trên `refreshAll`, `useBranches`).
- Style code theo file lân cận: file trong `src/components/` và `src/lib/` không dùng dấu chấm phẩy, dùng nháy kép; giữ nguyên style của file đang sửa (vd. `app/layout.tsx` có dấu chấm phẩy).
- Tái sử dụng dependency và tiện ích có sẵn (`cn`, primitive `ui/`, `api.ts`, `common.tsx`) thay vì thêm thư viện hay helper trùng lặp.
- Tránh literal không giải thích, code chết, import không dùng, `any` và phương án dự phòng giả dạng thành công.
- Không format hàng loạt hoặc refactor file không liên quan.

## Danh sách kiểm tra

- Tên và vị trí file theo đúng quy ước chưa?
- Đã tái sử dụng helper hiện có và tránh logic trùng lặp chưa?
- Diff có tập trung và không chứa hành vi không được giải thích không?
