---
description: Tìm UI có thể tái sử dụng và tạo component có kiểu, hỗ trợ accessibility trong đúng module.
argument-hint: [yêu cầu component]
---

Tạo hoặc refactor component được yêu cầu: $ARGUMENTS

Thực hiện theo skill `component-refactor`. Trước khi tạo file, tìm trong `src/components/ui/`, `src/components/common.tsx`, `src/components/layout/` và view đích. Xác định ranh giới component (trong file view hay `common.tsx`), props và nơi gọi; tái sử dụng primitive hiện có nếu phù hợp. Chỉ triển khai phần component được yêu cầu, xác minh import/cách dùng/style, chạy bước kiểm tra phù hợp và giải thích lý do cần abstraction mới nếu có tạo.
