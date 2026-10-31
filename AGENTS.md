# Hướng dẫn cho coding agent

Đây là bộ hướng dẫn nền tảng dùng chung ở cấp repository cho các coding agent. Claude Code cũng đọc `CLAUDE.md`, trong đó nhập nội dung file này; `.claude/rules/` chứa các quy tắc chuyên đề dành riêng cho Claude Code. Không mặc định rằng các agent khác hỗ trợ những file chỉ dành cho Claude Code.

## Thông tin dự án đã xác minh

- Frontend "Quản lý lớp học": mục đích chính là chấm điểm thi đua các lớp theo tuần (Nề nếp + Học tập), xếp hạng và tổng hợp. Phân hiệu, giáo viên, lớp, năm học/tuần là phần cấu hình. Backend là Express + PostgreSQL ở `../BE`; FE chỉ gọi REST API của BE.
- Next.js 16.4.3 App Router (bật `cacheComponents`, `partialPrefetching` trong `next.config.ts`), React 19.3.0, TypeScript 5 với `strict: true`.
- Tailwind CSS 4 + shadcn/ui (style `radix-nova`, package `radix-ui`, icon `lucide-react`) trong `src/components/ui/`; toast bằng `sonner`; tải dữ liệu bằng `swr`. Không dùng Axios, React Hook Form hay Zod.
- Route nằm trong `src/app/(dashboard)/`; nội dung trang là client component trong `src/components/views/`; thành phần dùng chung trong `src/components/common.tsx` và `src/components/layout/`.
- Tầng API: `src/lib/api.ts` (hàm `api<T>` dùng `fetch`, đọc response chuẩn `{ success, data, message }` của BE, ném `ApiError`), kiểu dữ liệu `src/lib/types.ts`, hook SWR `src/hooks/use-data.ts`.
- Chưa có xác thực: FE không gửi token, BE chưa gắn middleware auth. Thiết kế quyền (`admin`, `teacher`) nằm ở `../BE/Ai_rules/security.md` nhưng chưa triển khai.
- Không có dữ liệu mẫu viết tay; mọi dữ liệu lấy từ BE. Riêng bản demo (`NEXT_PUBLIC_DEMO_MODE=true`) đọc snapshot response BE trong `public/demo-data/` (`npm run snapshot:demo`) và chặn mọi thao tác ghi.
- Cột ngày của BE trả chuỗi `"YYYY-MM-DD"`; định dạng bằng `src/lib/format.ts`, không đưa qua `new Date()` (lệch múi giờ). Với `cacheComponents`, gọi `new Date()` lúc prerender sẽ lỗi build: chỉ tính "hôm nay" sau khi đã có dữ liệu API (xem `todayISO`).
- Alias TypeScript `@/*` ánh xạ tới `src/*`.

## Bản đồ source bắt buộc duy trì

- Đọc [`.claude/architecture/code-map.md`](.claude/architecture/code-map.md) trước khi thay đổi route, layout, component, module dùng chung hoặc API.
- Cập nhật bản đồ trong cùng thay đổi khi thêm/xóa/di chuyển source, đổi quan hệ import/route/component, hoặc thêm/sửa/xóa request API.
- Chỉ ghi nhận hành vi và contract đã kiểm chứng từ source FE, source BE hoặc `../BE/Ai_rules/code-map.md`; đánh dấu rõ phần chưa xác minh, không suy đoán response.
- Không ghi token, mật khẩu, secret hoặc giá trị trong `.env` vào bản đồ. Chỉ mô tả tên biến cấu hình khi cần.

## Quy trình làm việc bắt buộc

1. Kiểm tra `git status` và đúng các file liên quan trước khi chỉnh sửa. Giữ nguyên các thay đổi không liên quan trong worktree và đọc hướng dẫn hiện có trước khi sửa chúng.
2. Truy vết import và nơi sử dụng thay vì suy đoán chức năng từ tên file. Tìm component, helper, hook, kiểu dữ liệu hiện có trước khi tạo mới.
3. Giữ thay đổi trong phạm vi yêu cầu. Không tự đặt contract API, quy tắc nghiệp vụ hoặc hành vi xác thực; contract lấy từ BE (`../BE/Ai_rules/code-map.md`, `../BE/docs/logic-trien-khai.md`, source BE). Nêu rõ điều chưa biết và hỏi người dùng/agent BE nếu quyết định đó làm thay đổi hành vi quan sát được.
4. Với API: gọi qua `api`/`apiPost`/`apiPut`/`apiDelete` trong `src/lib/api.ts`, khai báo kiểu response trong `src/lib/types.ts`, đọc dữ liệu qua hook SWR trong `src/hooks/use-data.ts` (key là path API), ghi dữ liệu qua `runMutation`/`ConfirmDelete` để có toast và `refreshAll()`. Không gọi `fetch` trực tiếp trong component.
5. Tái sử dụng UI primitive và component trong `common.tsx` khi phù hợp. Tránh refactor diện rộng, abstraction trùng lặp, dependency mới hoặc sửa CSS toàn cục nếu yêu cầu không cần.
6. Khai báo kiểu dữ liệu tường minh; xử lý trạng thái loading/error/empty (`TableSkeleton`, `ErrorState`, `EmptyState`); không để lộ thông tin xác thực hoặc chi tiết lỗi nội bộ trong log hay thông báo cho người dùng.
7. Xác minh bằng các script hiện có phù hợp (`npm run lint`, `npm run build`) và báo chính xác lệnh nào đã chạy, phần nào chưa thể kiểm tra. Không được tuyên bố một bước kiểm tra thành công nếu chưa chạy.

## Yêu cầu tương thích Next.js

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Tóm tắt: đây KHÔNG phải phiên bản Next.js quen thuộc. Trước khi viết code dùng API của framework, đọc hướng dẫn liên quan trong `node_modules/next/dist/docs/` và lưu ý cảnh báo ngừng hỗ trợ.

## Chi tiết riêng của dự án

Đọc `CLAUDE.md` để nắm sơ đồ dự án và các bước kiểm tra hiện có. Với tác vụ Claude Code, tham khảo file phù hợp trong `.claude/rules/`; dùng `.claude/commands/` cho workflow lặp lại do người dùng chủ động yêu cầu và `.claude/agents/` cho việc ủy quyền có mục tiêu rõ ràng. Các file này không cho phép thực hiện công việc ngoài yêu cầu của người dùng.
