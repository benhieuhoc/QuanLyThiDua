---
paths:
  - "src/components/**/*.tsx"
  - "src/app/**/*.tsx"
---

# Tái sử dụng component

Hãy tìm kiếm trước khi tạo component. Ưu tiên tái sử dụng nếu vẫn giữ được hành vi yêu cầu mà không làm API khó hiểu hơn.

## Thứ tự tìm kiếm bắt buộc

1. `src/components/ui/`: primitive shadcn (Button, Card, Dialog, AlertDialog, Sheet, Input, Textarea, Label, Select, Checkbox, Badge, Table, Skeleton, Avatar, Tooltip, DropdownMenu, Separator). Đọc file cục bộ để biết variant/size thực tế (vd. `Button size="icon-sm"`), không giả định giống shadcn upstream.
2. `src/components/common.tsx`: `PageHeader`, `StatCard`, `IconTile`, `EmptyState`, `ErrorState`, `TableSkeleton`, `ConfirmDelete`, `runMutation`, `BranchSelect`, `GradeSelect`.
3. `src/components/layout/`: `Brand`, `SidebarNav`, `AppHeader`, `navItems`.
4. Các view trong `src/components/views/`: dialog/bảng tương tự có thể đã có mẫu để làm theo.
5. Kiểm tra import và nơi gọi để xác định có thể mở rộng component hiện có một cách an toàn không.

## Chọn cách triển khai

- Tái sử dụng nguyên trạng nếu component đã đáp ứng yêu cầu.
- Thêm prop tùy chọn có phạm vi hẹp nếu vẫn giữ mặc định hiện có.
- Chỉ chuyển code vào `common.tsx` khi có ít nhất hai view dùng thực tế với cùng trách nhiệm (như `BranchSelect`).
- Cần primitive shadcn chưa có: thêm bằng `npx shadcn add <tên>` (theo `components.json`) sau khi hỏi người dùng, không tự viết tay primitive tương đương.
- Không tạo wrapper chỉ để đổi tên primitive có sẵn.

Trong báo cáo hoàn thành, nêu ngắn gọn component đã tái sử dụng hoặc lý do component hiện tại không phù hợp.
