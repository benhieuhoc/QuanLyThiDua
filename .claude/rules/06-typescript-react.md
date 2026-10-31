---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# TypeScript, React và Next.js

Dự án dùng TypeScript strict, Next.js 16.4.3 (bật `cacheComponents`, `partialPrefetching`) và React 19.3.0. Tuân theo hành vi của các package đã cài, không dựa vào cách dùng cũ của framework.

- Giữ nguyên `strict`. Dùng kiểu miền trong `src/lib/types.ts` thay vì tạo cấu trúc song song; tránh `any`, ép kiểu rộng, `as unknown as`.
- Định kiểu props, state, event, callback. Giá trị `Select` là chuỗi: dùng `String(id)` khi truyền vào và `Number(value)` khi gửi API, như code hiện có.
- Chỉ gọi Hook ở cấp cao nhất. Tính dữ liệu lọc/đếm trực tiếp khi render từ `data` của SWR; không sao chép dữ liệu SWR vào `useState` hay đồng bộ bằng `useEffect`.
- `"use client"` chỉ đặt ở view, `common.tsx`, component layout có state/hook và primitive cần client. `page.tsx` và `(dashboard)/layout.tsx` giữ là server component.
- Root layout dùng kiểu toàn cục `LayoutProps<"/">` do Next sinh ra; khi thêm route có tham số, đọc docs về `PageProps`/`params` (Promise) trong `node_modules/next/dist/docs/`.
- Không truy cập `window`, `document`, storage khi server render.
- Key danh sách dùng `id` của bản ghi.
- Chỉ memoize khi có lợi ích rõ (mẫu: `useMemo` lọc giáo viên trong `teachers-view`). Không thêm `useMemo`/`useCallback` theo thói quen.
- Trước thay đổi phụ thuộc phiên bản Next.js, đọc tài liệu liên quan tại `node_modules/next/dist/docs/`.

## Danh sách kiểm tra

- Thay đổi có qua được kiểm tra kiểu của `npm run build` không?
- Ranh giới client/server có chính xác không?
- Hook và key danh sách hợp lệ, state ở mức tối thiểu chưa?
