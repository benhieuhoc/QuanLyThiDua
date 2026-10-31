# Quản lý lớp học: Front-end

Dashboard quản lý phân hiệu, giáo viên và lớp học. Next.js 16 (App Router, Cache Components) + shadcn/ui (radix-nova) + Tailwind CSS 4 + SWR. Gọi API của BE trong `../BE`.

Nghiệp vụ và API: xem [BE/docs/logic-trien-khai.md](../BE/docs/logic-trien-khai.md).

## Chạy

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                  # http://localhost:3000
```

BE phải chạy trước (`npm run dev` trong `../BE`) và đã chạy `cscript/migration.sql`. CORS của BE chỉ cho phép `http://localhost:3000`, nên FE phải chạy ở cổng 3000.

`npm run build` để build, `npm run lint` để kiểm tra ESLint.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `src/app/(dashboard)/` | Layout dashboard (sidebar, header, nền) và các trang. Thi đua: `/`, `/cham-diem`, `/bang-diem`, `/tong-hop`. Cấu hình: `/nam-hoc`, `/phan-hieu`, `/giao-vien`, `/lop-hoc` |
| `src/components/scores.tsx` | Thành phần dùng chung các trang thi đua: chọn năm học/tuần, lọc phân hiệu/khối, khóa tuần, hạng, dialog điểm theo tuần của lớp |
| `src/hooks/use-week-picker.ts` | Chọn năm học + tuần; mặc định là tuần hiện tại |
| `src/lib/format.ts` | Định dạng ngày `YYYY-MM-DD`, điểm có dấu |
| `src/components/views/` | Nội dung từng trang (client component): bảng, bộ lọc, dialog thêm/sửa/xóa |
| `src/components/common.tsx` | Thành phần dùng chung: `PageHeader`, `StatCard`, `EmptyState`, `ErrorState`, `ConfirmDelete`, `BranchSelect`, `GradeSelect`, `runMutation` |
| `src/components/layout/` | Sidebar, header, danh sách menu (`nav.ts`) |
| `src/components/ui/` | Component shadcn (sinh bằng `npx shadcn add`) |
| `src/lib/api.ts` | Gọi API, `ApiError`, `refreshAll` |
| `src/lib/types.ts` | Kiểu dữ liệu khớp response của BE |
| `src/hooks/use-data.ts` | Hook SWR theo từng API: phân hiệu, khối, giáo viên, lớp, năm học, tuần, lượt chấm, bảng điểm |

## Quy ước

- **Dữ liệu:** tải ở trình duyệt bằng SWR, mỗi bảng một key (`/branches`, `/teachers`...), lọc ở client. Sau mỗi thao tác ghi, `runMutation` gọi `refreshAll()` để tải lại tất cả, vì tên lớp phụ thuộc phân hiệu và danh sách giáo viên kèm lớp chủ nhiệm.
- **Trang:** `page.tsx` là server component chỉ khai báo `metadata` và render view tương ứng trong `components/views/`.
- **Giao diện:** light mode, thiết kế phẳng kết hợp kính mờ. Màu lấy từ token trong `src/app/globals.css` (primary indigo). Bề mặt kính dùng utility `glass` hoặc `Card` (đã có `backdrop-blur`). Ô icon dùng màu phẳng qua `IconTile` với `tone`.
- **Ngôn ngữ:** giao diện tiếng Việt, font Be Vietnam Pro.
- **Lỗi từ BE:** hiển thị `message` và `errors[]` bằng toast (`errorMessage` trong `lib/api.ts`). Validate ở FE chỉ để báo sớm; BE vẫn là nơi kiểm tra cuối cùng.
- **Next.js 16** khác nhiều so với các bản trước: đọc `node_modules/next/dist/docs/` trước khi dùng API mới (xem `AGENTS.md`).
