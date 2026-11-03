# Kiến trúc dự án

Tuân theo cấu trúc App Router và ranh giới module đang có. Quy tắc này áp dụng cho source ứng dụng và các file route.

## Cấu trúc đã xác minh

- `src/app/layout.tsx` là root layout: import `globals.css`, font, `TooltipProvider` và `Toaster` (sonner).
- Route group `(dashboard)` có `layout.tsx` dựng sidebar (`Brand`, `SidebarNav`), `AppHeader` và vùng `<main>`. Mọi trang nằm trong group này: thi đua `/`, `/cham-diem`, `/tong-hop`, `/diem-lop`; cấu hình `/nam-hoc`, `/phan-hieu`, `/giao-vien`, `/lop-hoc`, `/hoc-sinh`.
- Mỗi `page.tsx` là server component: chỉ khai báo `metadata` và render một view trong `src/components/views/`. View là client component chứa toàn bộ state, bảng, dialog.
- `src/components/common.tsx` chứa thành phần dùng chung giữa các view; `src/components/scores.tsx` chứa thành phần dùng chung giữa các trang thi đua; `src/components/layout/` chứa sidebar/header và `nav.ts` (danh sách menu); `src/components/ui/` là primitive shadcn.
- Tầng dữ liệu: `src/lib/api.ts` (gọi API), `src/lib/types.ts` (kiểu response BE), `src/hooks/use-data.ts` (hook SWR), `src/hooks/use-week-picker.ts` (chọn năm học + tuần). `src/lib/utils.ts` chỉ chứa `cn()`; `src/lib/format.ts` định dạng ngày/điểm.

## Bản đồ source

- Sơ đồ route, cấu trúc source, mục đích component/nơi sử dụng và API đã quan sát được ghi tại [code-map.md](../architecture/code-map.md). Đọc bản đồ trước khi thay đổi source liên quan.
- Cập nhật `code-map.md` trong cùng thay đổi khi thêm/xóa/di chuyển route hoặc component, thay đổi import/quan hệ sử dụng, hoặc thay đổi request/response API.
- Chỉ ghi chi tiết có thể kiểm chứng từ source FE/BE; phân biệt phần đang dùng với phần chưa có nơi dùng hoặc BE chưa triển khai. Không suy đoán schema response.
- Không đưa secret, token hoặc giá trị `.env` vào code map.

## Quy tắc

- Thêm trang mới: `src/app/(dashboard)/<slug>/page.tsx` (slug tiếng Việt không dấu, gạch nối, như `phan-hieu`) + `src/components/views/<entity>-view.tsx` + mục trong nhóm phù hợp ("Thi đua" hoặc "Cấu hình") của `navSections` trong `src/components/layout/nav.ts`.
- Giữ `page.tsx` gọn; logic và UI đặt trong view. Thành phần dùng ở từ hai view trở lên mới đưa vào `common.tsx`; thành phần chỉ một view dùng thì để trong file view đó (như các dialog hiện có).
- Không đưa nghiệp vụ vào `src/lib/utils.ts`. Code gọi API chỉ ở `src/lib/api.ts`; hook đọc dữ liệu ở `src/hooks/use-data.ts`.
- Không thêm barrel file, alias, thư mục kiến trúc mới (vd. `service/`, `features/`) hoặc thư viện state/fetch mới nếu chưa có nơi dùng cụ thể và được yêu cầu.
- Tránh import vòng. `lib/` và `hooks/` không import từ `components/`.
- Tuân theo alias `@/*` (`src/*`); trong cùng thư mục `layout/` đang dùng import tương đối (`./nav`).
- Tôn trọng ranh giới Server/Client Component; dự án bật `cacheComponents` nên đọc tài liệu trong `node_modules/next/dist/docs/` trước khi thêm data fetching phía server, `use cache`, `params`/`searchParams` hoặc API mới của Next.js.

## Danh sách kiểm tra

- Đã truy vết route, layout, import và nơi gọi chưa?
- Code này dùng chung thật hay nên nằm trong file view?
- Đã tránh di chuyển file hoặc đổi kiến trúc vượt phạm vi yêu cầu chưa?
- Đã cập nhật `code-map.md` (và `nav.ts` nếu thêm trang) chưa?
