---
description: Tích hợp endpoint BE đã xác minh bằng tầng api.ts + SWR hiện tại và các trạng thái UI có kiểu.
argument-hint: [endpoint và hành vi mong muốn]
---

Tích hợp endpoint/hành vi được yêu cầu: $ARGUMENTS

Thực hiện theo skill `api-integration`. Trước tiên, kiểm tra `src/lib/api.ts`, `src/lib/types.ts`, `src/hooks/use-data.ts`, nơi gọi và ranh giới xác thực (hiện chưa có auth). Xác nhận contract request/response/error từ `../BE/Ai_rules/code-map.md` và source BE; nếu BE chưa có endpoint hoặc thiếu thông tin thì dừng lại và hỏi, không suy đoán. Dùng helper hiện có, triển khai kiểu và state UI, cập nhật `code-map.md`, xác minh rồi báo cáo bằng chứng contract cùng những điểm chưa giải quyết.
