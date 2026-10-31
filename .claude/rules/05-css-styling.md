---
paths:
  - "src/app/**/*.css"
  - "src/components/**/*.tsx"
---

# CSS và style

Áp dụng cho style của component và stylesheet.

## Hiện trạng

- Chỉ có một stylesheet: `src/app/globals.css`, import `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`; định nghĩa token theme trong `:root` (light mode, primary indigo, `--card` bán trong suốt), khối `.dark` mặc định của shadcn (chưa dùng) và utility `@utility glass` (bề mặt kính mờ).
- `next.config.ts` cấu hình Turbopack xử lý `*.css` bằng `@tailwindcss/turbopack`.
- Giao diện: light mode, thiết kế phẳng kết hợp kính mờ; nền dashboard là các mảng màu mờ trong `(dashboard)/layout.tsx`. Bề mặt kính dùng `glass` hoặc `Card` (đã có `backdrop-blur`). Ô icon dùng `IconTile` với `tone`.
- Font: Be Vietnam Pro (`--font-sans`, hỗ trợ tiếng Việt), Geist Mono (`--font-mono`), khai báo trong root layout.

## Quy tắc

- Dùng Tailwind utility và token theme (`bg-primary`, `text-muted-foreground`, `border`, `rounded-lg`...). Ghép class bằng `cn()` từ `@/lib/utils`.
- Không hardcode màu hex/oklch trong component khi đã có token; màu nhấn theo nhóm dùng `tone` của `IconTile` hoặc palette Tailwind như code hiện có.
- Chỉ thêm vào `globals.css` khi cần dùng chung (token mới, `@utility` mới). Không thêm selector element trần hoặc `!important`; không định nghĩa lại token toàn dự án cho một component.
- Không thêm stylesheet riêng, CSS module hay thư viện style mới nếu không được yêu cầu.
- Bố cục responsive: sidebar ẩn dưới `md` và thay bằng `Sheet` trong `AppHeader`; kiểm tra bảng/dialog ở màn hình hẹp (tràn ngang, nút thao tác).
- Kiểm tra trạng thái hover/focus/disabled và thao tác bàn phím. Không chỉ dùng màu để biểu thị trạng thái (kèm chữ/icon, như `Badge`).

## Danh sách kiểm tra

- Đã dùng token và utility hiện có thay vì giá trị cứng chưa?
- Thay đổi `globals.css` có ảnh hưởng mọi trang không, đã kiểm tra chưa?
- Bố cục hẹp/rộng và trạng thái tương tác vẫn dùng được chứ?
