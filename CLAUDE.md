# Thông tin dự án dành cho Claude Code

Repository này là frontend **Quản lý lớp học**: web tiếng Việt để **chấm điểm thi đua các lớp theo tuần** (phần Nề nếp + Học tập), gọi REST API của backend Express ở `../BE`. Route thi đua: `/` (tổng quan), `/cham-diem` (trang chính), `/bang-diem`, `/tong-hop`. Route cấu hình: `/nam-hoc`, `/phan-hieu`, `/giao-vien`, `/lop-hoc`. Chưa có đăng nhập/phân quyền (BE cũng chưa có).

@AGENTS.md

## Sơ đồ dự án

- Page/layout App Router: `src/app/`; route group `(dashboard)` chứa layout sidebar/header và các trang. Mỗi `page.tsx` là server component chỉ khai báo `metadata` và render view.
- Nội dung từng trang (client component): `src/components/views/<entity>-view.tsx`.
- Thành phần dùng chung: `src/components/common.tsx` (`PageHeader`, `StatCard`, `IconTile`, `EmptyState`, `ErrorState`, `TableSkeleton`, `ConfirmDelete`, `runMutation`, `BranchSelect`, `GradeSelect`); thành phần dùng chung của các trang thi đua: `src/components/scores.tsx` (chọn năm học/tuần, lọc phân hiệu/khối, khóa tuần, hạng, dialog điểm lớp theo tuần); layout: `src/components/layout/` (menu chia nhóm trong `nav.ts`).
- UI primitive shadcn (style `radix-nova`): `src/components/ui/`.
- Gọi API: `src/lib/api.ts` (`fetch` + `ApiError`, `apiPost`/`apiPut`/`apiDelete`, `refreshAll`, `errorMessage`); kiểu dữ liệu khớp response BE: `src/lib/types.ts`; hook SWR: `src/hooks/use-data.ts`; chọn năm học + tuần mặc định: `src/hooks/use-week-picker.ts`. Tiện ích class: `src/lib/utils.ts` (`cn`); định dạng ngày/điểm: `src/lib/format.ts`.
- Style: chỉ có `src/app/globals.css` (Tailwind 4, token theme, utility `glass`). Không có stylesheet cũ trong `public/`.
- Base URL BE: biến `NEXT_PUBLIC_API_URL` (xem `.env.example`, mặc định `http://localhost:3001`).

Sơ đồ route, component, quan hệ sử dụng và API đã quan sát nằm trong [`.claude/architecture/code-map.md`](.claude/architecture/code-map.md). Đọc trước khi sửa source; cập nhật đồng thời khi cấu trúc, nơi sử dụng component hoặc request/response API thay đổi. Chỉ ghi contract có bằng chứng và đánh dấu phần chưa xác minh.

## Nguồn contract backend

- Bản đồ API của BE: `../BE/Ai_rules/code-map.md` (route, body, mã lỗi, trạng thái); chuẩn response: `../BE/Ai_rules/backend.md`; thiết kế phân quyền: `../BE/Ai_rules/security.md`; nghiệp vụ: `../BE/docs/logic-trien-khai.md`.
- Khi cần endpoint mới hoặc contract chưa rõ, đọc các file trên và source BE (`../BE/src/router`, `controller`, `service`). Nếu vẫn chưa rõ, hỏi agent/người phụ trách BE thay vì tự đặt contract. Không sửa code BE từ repository này.

## Trước khi sửa code

Đọc source liên quan và truy vết import/nơi gọi. Trước khi thêm component, hãy tìm UI có thể tái sử dụng trong `src/components/ui/`, `src/components/common.tsx` và các view hiện có. Giữ nguyên contract và hành vi hiện tại trừ khi yêu cầu nêu rõ cần thay đổi. `CLAUDE.md` và `AGENTS.md` bổ sung cho nhau: file này cung cấp thông tin cho Claude Code; `AGENTS.md` được nhập vào để cung cấp hướng dẫn dùng chung cho agent.

Claude Code nhận diện các rule của dự án trong `.claude/rules/`. Đọc những rule phù hợp về kiến trúc, component/tái sử dụng, API, style, state, bảo mật và xác minh. Chỉ dùng subagent của dự án cho công việc độc lập, có mục tiêu cụ thể; command là workflow do người dùng gọi, còn skill có thể được Claude lựa chọn khi nội dung mô tả phù hợp.

## Kiểm tra và báo cáo hoàn thành

`package.json` cung cấp `npm run dev`, `npm run build`, `npm start`, `npm run lint`; không có script test hoặc typecheck riêng (`next build` có bước kiểm tra kiểu). Chạy thử giao diện cần BE chạy ở cổng 3001 và FE ở cổng 3000 (CORS của BE chỉ cho phép `http://localhost:3000`). Chọn bước kiểm tra phù hợp với thay đổi và nêu rõ kết quả đạt, lỗi hay chưa chạy. Không chạy lệnh triển khai hoặc lệnh có tính phá hủy.

Trước khi báo hoàn thành, xem lại diff và giữ nguyên các thay đổi có sẵn trong worktree. Không stage hoặc commit nếu người dùng chưa yêu cầu.

Báo cáo:

- Tóm tắt và phạm vi thay đổi.
- File đã tạo hoặc cập nhật.
- Các bước xác minh đã thực hiện và kết quả chính xác.
- Điều chưa rõ, rủi ro hoặc bước kiểm tra chưa chạy.
