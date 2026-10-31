---
name: ui-styling
description: Dùng khi chỉnh giao diện, hành vi responsive, trạng thái accessibility hoặc chẩn đoán xung đột CSS và ảnh hưởng style giữa các trang.
---

# Quy trình chỉnh style giao diện

1. Đọc rule về CSS/style và xác minh. Kiểm tra `src/app/globals.css` (token `:root`, utility `glass`), `src/app/(dashboard)/layout.tsx`, class trong component và trang bị ảnh hưởng.
2. Tìm nơi dùng class/token trước khi sửa phần dùng chung (`globals.css`, `common.tsx`, `ui/`). Xác định style là cục bộ hay có chủ đích dùng chung.
3. Ưu tiên Tailwind utility và token theme cho thay đổi cục bộ, ghép class bằng `cn()`. Giữ ngôn ngữ thiết kế hiện tại (light mode, phẳng + kính mờ, primary indigo, `IconTile` theo `tone`). Không thêm hệ thống style mới hoặc reset diện rộng.
4. Triển khai giao diện được yêu cầu mà không thiết kế lại phần không liên quan.
5. Kiểm tra bố cục hẹp/rộng (sidebar ẩn dưới `md`, menu `Sheet`), tràn bảng, focus, hover, disabled và thao tác bàn phím. Không chỉ dùng màu để truyền đạt trạng thái.
6. Kiểm tra mọi nơi sử dụng bị ảnh hưởng và chạy `npm run lint`/`npm run build` phù hợp. Chỉ xác minh trên trình duyệt khi thực sự chạy được (cần BE); báo rõ phần nào đã/chưa kiểm tra trực quan.
