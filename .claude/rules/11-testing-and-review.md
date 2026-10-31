# Xác minh và review

Đọc `package.json` trước khi chọn lệnh. Script hiện có: `npm run dev`, `npm run build`, `npm start`, `npm run lint` (ESLint 9 + `eslint-config-next`); không có script test/typecheck riêng.

- Chạy bước kiểm tra nhỏ nhất bao quát được code đã sửa: `npm run lint` với thay đổi TS/TSX; `npm run build` (có bước kiểm tra kiểu) với thay đổi route, kiểu dữ liệu, cấu hình hoặc tích hợp API.
- Không tuyên bố đã chạy typecheck/test riêng chỉ dựa trên lint/build. Không tự thêm công cụ test nếu không được yêu cầu.
- Với component dùng chung (`common.tsx`, `layout/`, `ui/`), kiểm tra tất cả nơi gọi. Với `globals.css`, kiểm tra mọi trang.
- Với tích hợp API, đối chiếu method/path/body/response với `../BE/Ai_rules/code-map.md` và source BE; kiểm tra loading/error/empty.
- Chạy thử thực tế cần BE chạy (`npm run dev` trong `../BE`, cổng 3001, đã chạy `cscript/migration.sql`) và FE ở cổng 3000 (CORS). Nếu không chạy được, nói rõ là chưa kiểm tra trực quan.
- Review diff cuối cùng để phát hiện thay đổi ngoài phạm vi, xóa nhầm, secret, file sinh tự động, helper trùng lặp và thay đổi hành vi API/UI. `next dev` có thể tự chèn lại khối `nextjs-agent-rules` vào `AGENTS.md`; đó không phải thay đổi của bạn.
- Giữ nguyên thay đổi đã có trước trong worktree. Không stage, commit, deploy hoặc chạy lệnh phá hủy trừ khi được yêu cầu rõ.

## Báo cáo hoàn thành

Nêu phạm vi đã triển khai và các file liên quan, bước kiểm tra cùng kết quả chính xác, cũng như giả định chưa xác minh hoặc việc cần theo dõi. Khi có bằng chứng, phân biệt lỗi nền đã tồn tại với lỗi do thay đổi gây ra.
