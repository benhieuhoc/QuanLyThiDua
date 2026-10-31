<!--
Sơ đồ source dành cho coding agent. Cập nhật cùng thay đổi khi cấu trúc,
route, quan hệ sử dụng component hoặc request/response API thay đổi.
Chỉ ghi chi tiết đã xác minh; không đưa secret, token hay giá trị .env vào đây.
-->

# Code map — sơ đồ source và API

Cập nhật lần cuối: 2026-10-29. Mô tả theo source FE trong worktree và contract BE trong
`../BE/Ai_rules/code-map.md`, `../BE/docs/logic-trien-khai.md`, note route ở `../BE/src/router/*Router.ts`,
cùng spec do session BE (`be-02`) xác nhận theo code thực tế. Response mẫu đã đối chiếu bằng GET tới BE local.

Trạng thái: ✅ hoàn thành · 🚧 đang làm / còn lỗi · ⬜ chưa làm

## Đọc nhanh

- Mục đích chính: **chấm điểm thi đua theo tuần** (Nề nếp + Học tập), xếp hạng, tổng hợp. Phân hiệu, giáo viên, lớp, năm học/tuần là phần cấu hình.
- Next.js 16.4.3 App Router (`cacheComponents`, `partialPrefetching`), React 19.3.0, TypeScript strict, Tailwind CSS 4, shadcn/ui `radix-nova`, SWR, sonner.
- Alias `@/*` → `src/*`.
- Dữ liệu tải ở trình duyệt bằng SWR, key = path API kèm query. Sau mỗi thao tác ghi gọi `refreshAll()` để tải lại mọi key (bảng điểm, tuần, lượt chấm cập nhật cùng lúc).
- Ngày từ BE là chuỗi `"YYYY-MM-DD"`; định dạng bằng `src/lib/format.ts`, không qua `Date`.
- Chưa có auth (FE không gửi token, BE chưa có middleware).

## Cấu trúc source

```text
src/
├── app/
│   ├── layout.tsx                 # Root layout: font, globals.css, TooltipProvider, Toaster
│   ├── globals.css                # Tailwind, token theme, utility `glass`
│   └── (dashboard)/
│       ├── layout.tsx             # Nền mờ, sidebar (Brand + SidebarNav), AppHeader, <main>
│       ├── page.tsx               # /           → OverviewView
│       ├── cham-diem/page.tsx     # /cham-diem  → ScoringView        (trang chính)
│       ├── bang-diem/page.tsx     # /bang-diem  → WeeklyScoresView
│       ├── tong-hop/page.tsx      # /tong-hop   → SummaryView
│       ├── nam-hoc/page.tsx       # /nam-hoc    → SchoolYearsView
│       ├── phan-hieu/page.tsx     # /phan-hieu  → BranchesView
│       ├── giao-vien/page.tsx     # /giao-vien  → TeachersView
│       └── lop-hoc/page.tsx       # /lop-hoc    → ClassesView
├── components/
│   ├── common.tsx                 # Thành phần dùng chung giữa các view
│   ├── scores.tsx                 # Thành phần dùng chung giữa các trang thi đua
│   ├── layout/
│   │   ├── nav.ts                 # navSections (Thi đua / Cấu hình), navItems, isActive()
│   │   ├── sidebar-nav.tsx        # Brand, SidebarNav (render theo nhóm)
│   │   └── app-header.tsx         # Header + menu mobile (Sheet)
│   ├── views/                     # Nội dung từng trang (client component)
│   └── ui/                        # Primitive shadcn
├── hooks/
│   ├── use-data.ts                # Hook SWR theo API
│   └── use-week-picker.ts         # Chọn năm học + tuần, mặc định tuần hiện tại
└── lib/
    ├── api.ts                     # fetch wrapper, ApiError, apiPost/Put/Delete, refreshAll, errorMessage
    ├── format.ts                  # formatDate, formatRange, formatSigned, todayISO
    ├── types.ts                   # Kiểu response BE
    └── utils.ts                   # cn()
```

`public/` chứa SVG mặc định và `demo-data/` (snapshot response BE cho bản demo, sinh bằng `scripts/snapshot-demo.mjs`, không sửa tay).

## Sitemap route

| URL | View | `metadata.title` | Nhóm menu |
|---|---|---|---|
| `/` | `OverviewView` | (mặc định root) | Thi đua |
| `/cham-diem` | `ScoringView` | Chấm điểm | Thi đua |
| `/bang-diem` | `WeeklyScoresView` | Bảng điểm tuần | Thi đua |
| `/tong-hop` | `SummaryView` | Tổng hợp thi đua | Thi đua |
| `/nam-hoc` | `SchoolYearsView` | Năm học & tuần | Cấu hình |
| `/phan-hieu` | `BranchesView` | Phân hiệu | Cấu hình |
| `/giao-vien` | `TeachersView` | Giáo viên | Cấu hình |
| `/lop-hoc` | `ClassesView` | Lớp học | Cấu hình |

Root layout dùng `title.template = "%s · Quản lý lớp học"`. Thêm trang: `page.tsx` trong `(dashboard)`, view trong `components/views/`, mục trong `navSections` của `nav.ts`. Build hiện prerender cả 8 trang thành static (○).

## Component và nơi sử dụng

### Views thi đua (`src/components/views/`)

| File | Hook | Thao tác ghi | Vai trò |
|---|---|---|---|
| `overview-view.tsx` | `useWeekPicker`, `useWeeklyScore`, branches/teachers/classes | — | Tuần mặc định: số lớp đã chấm / chưa chấm (`entries === 0`), số lượt chấm, lớp dẫn đầu, top 5, danh sách lớp chưa chấm, số lượng dữ liệu cấu hình. |
| `scoring-view.tsx` | `useWeekPicker`, `useWeeklyScore` (không lọc), `usePoints` | POST/PUT/DELETE `/points`, PUT `/weeks/:id` (mở khóa) | Danh sách lớp (lọc phân hiệu/khối ở client để giữ hạng toàn trường, sắp theo tên lớp) → panel lớp: điểm gốc/cộng/trừ của từng phần, tổng, hạng; form thêm nhanh (phần, nội dung, Trừ/Cộng + độ lớn); danh sách lượt chấm theo 2 phần, sửa/xóa. Tuần khóa: ẩn form/nút sửa xóa, hiện nút mở khóa. |
| `weekly-scores-view.tsx` | `useWeekPicker`, `useWeeklyScore(weekid, scope)` | PUT `/weeks/:id` (khóa/mở) | Bảng xếp hạng tuần, lọc phân hiệu/khối ở BE (hạng trong phạm vi lọc). Bấm vào dòng → `ClassScoreDialog`. |
| `summary-view.tsx` | `useWeekPicker` (chỉ năm học + danh sách tuần), `useSummaryScore` | — | Chọn khoảng tuần (để trống thì dùng mặc định của BE, hiển thị `fromweek`/`toweek` BE trả về; chặn from > to), lọc phân hiệu/khối; bảng hạng, tổng, TB/tuần. Bấm vào dòng → `ClassScoreDialog`. |

### Views cấu hình

| File | Hook | Thao tác ghi | Vai trò |
|---|---|---|---|
| `school-years-view.tsx` | `useSchoolYears`, `useWeeks` | POST/PUT/DELETE `/school-years`, PUT `/weeks/:id` | Danh sách năm học (tạo / sửa tên + số tuần / xóa); bảng tuần của năm đang chọn: điểm gốc, số lượt chấm, trạng thái, sửa điểm gốc (+ "áp dụng cho các tuần sau", tắt khi tuần khóa), khóa/mở. |
| `branches-view.tsx` | branches, teachers, classes | POST/PUT/DELETE `/branches` | Bảng phân hiệu kèm số GV/lớp. |
| `teachers-view.tsx` | branches, teachers | POST/PUT/DELETE `/teachers` | Bảng GV, tìm kiếm + lọc; thêm hàng loạt; sửa. |
| `classes-view.tsx` | branches, grades, teachers, classes | POST/PUT/DELETE `/classes` | Bảng lớp; tạo hàng loạt theo GVCN; đổi GVCN. |

### `src/components/scores.tsx` (client)

| Export | Mục đích | Nơi dùng |
|---|---|---|
| `SchoolYearSelect`, `WeekSelect`, `WeekPickerControls` | Select năm học/tuần gắn với `WeekPicker` | scoring, weekly, summary (chỉ `SchoolYearSelect`) |
| `WeekStatus` | Badge Đã khóa / Đang mở | scoring, weekly, overview, school-years |
| `LockWeekButton` | PUT `/weeks/:id { locked }` qua `runMutation` | scoring (tuần khóa), weekly, school-years |
| `ScopeFilter` | Select phân hiệu + khối, có "Tất cả" (tự gọi `useBranches`/`useGrades`) | scoring, weekly, summary |
| `ClassName`, `RankBadge`, `PartScore`, `SignedValue` | Hiển thị tên lớp, hạng (tô màu top 3), điểm phần kèm +/−, giá trị có dấu | Các trang thi đua |
| `ClassScoreDialog` | `useClassScore`: điểm từng tuần đã bắt đầu của 1 lớp, thanh tổng điểm, hạng toàn trường | weekly, summary |

### `src/components/common.tsx` (client)

| Export | Nơi dùng |
|---|---|
| `PageHeader` | Tất cả view |
| `IconTile`, `Tone` | `StatCard`, `EmptyState`, `ErrorState` |
| `StatCard` | overview |
| `EmptyState`, `ErrorState`, `TableSkeleton` | Tất cả view, `ClassScoreDialog` |
| `ConfirmDelete` | branches, teachers, classes, school-years, scoring (xóa lượt chấm) |
| `runMutation` | Mọi dialog/form ghi, `LockWeekButton` |
| `BranchSelect`, `GradeSelect` | teachers, classes |

### Layout (`src/components/layout/`)

| File | Nơi dùng |
|---|---|
| `nav.ts` (`navSections`, `navItems`, `isActive`) | `sidebar-nav.tsx` dùng `navSections`; `app-header.tsx` dùng `navItems` để lấy tiêu đề |
| `sidebar-nav.tsx` (`Brand`, `SidebarNav`) | `(dashboard)/layout.tsx`, `app-header.tsx` |
| `app-header.tsx` (`AppHeader`) | `(dashboard)/layout.tsx` |

### UI primitives (`src/components/ui/`)

| File | Nơi dùng ngoài `ui/` |
|---|---|
| `alert-dialog` | common |
| `avatar`, `sheet` | app-header |
| `badge` | overview, teachers, classes, scores |
| `button`, `card` | common và hầu hết view |
| `checkbox` | classes, school-years |
| `dialog` | branches, teachers, classes, scoring, school-years, scores |
| `input`, `label` | branches, teachers, classes (label), scoring, school-years |
| `select` | common, teachers, classes, scoring, summary, scores |
| `skeleton` | common |
| `sonner`, `tooltip` | `app/layout.tsx` |
| `table` | branches, teachers, classes, weekly, summary, school-years, scores |
| `textarea` | teachers |
| `dropdown-menu`, `separator` | Chưa có nơi dùng |

## Tầng dữ liệu

- `src/lib/api.ts`: `API_URL = NEXT_PUBLIC_API_URL ?? "http://localhost:3001"`. `api<T>` lỗi mạng → `ApiError(status 0)`; `!res.ok || !body.success` → `ApiError(message, status, errors)` (body không phải JSON → `"Lỗi <status>"`); trả `body.data as T`. Chế độ demo (`DEMO_MODE = NEXT_PUBLIC_DEMO_MODE === "true"`): không gọi BE; GET đọc `/demo-data/<demoFile(path)>` (file `{ status, body }`, query sắp xếp theo tên), thiếu file → `ApiError(404, "Bản demo chưa có dữ liệu…")`; POST/PUT/DELETE → `ApiError(403)` nên `runMutation`/`ConfirmDelete` hiện toast lỗi. `refreshAll = mutate(() => true)`. `errorMessage` ghép `errors[]` theo `message` hoặc `{ teacherid, classname }`.
- `src/hooks/use-data.ts`:
  - Không tham số: `useBranches`, `useGrades`, `useTeachers`, `useClasses`, `useSchoolYears`, `useCurrentWeek` (`shouldRetryOnError: false`, vì 404 ngoài năm học là trường hợp bình thường).
  - Có tham số (key `null` khi thiếu): `useWeeks(schoolyearid)`, `usePoints(weekid, classid)`, `useWeeklyScore(weekid, scope)`, `useSummaryScore(schoolyearid, fromweek?, toweek?, scope)`, `useClassScore(classid, schoolyearid)`. `ScoreScope = { branchid?, gradeid? }`; `toQuery` bỏ giá trị rỗng.
- `src/hooks/use-week-picker.ts`: `useWeekPicker()` chỉ lưu lựa chọn của người dùng. Năm học mặc định = năm của tuần hiện tại → năm mới nhất. Tuần mặc định = tuần hiện tại nếu thuộc năm đang xem → tuần đã bắt đầu gần nhất → tuần đầu. `error` bỏ qua lỗi của `/weeks/current`.
- `src/lib/format.ts`: `todayISO()` chỉ được gọi khi đã có dữ liệu API (trên trình duyệt); gọi lúc prerender sẽ lỗi build với `cacheComponents`.
- `src/lib/types.ts`: `Branch`, `Grade`, `Teacher`, `ClassItem`, `SchoolYear`, `Week`, `POINT_TYPES`/`PointType`, `Point`, `Score`, `WeeklyScore`, `SummaryRow`, `SummaryScore`, `ClassScore`, `FieldError`.

## API backend

Base URL: `NEXT_PUBLIC_API_URL`. Không route nào yêu cầu auth (BE ⬜ middleware).

### Chung

```json
{ "success": true, "data": ..., "message": "..." }
{ "success": false, "message": "...", "errors": [...] }   // errors chỉ có khi BE truyền vào
```

- Mã HTTP: 200, 201 (tạo mới), 400, 404, 409, 500. Lỗi Postgres: `23505` → 409 "Dữ liệu bị trùng", `23503` → 409, `23514`/`22P02` → 400.
- Lỗi validate: 400 "Dữ liệu không hợp lệ" + `errors: [{ field, message }]`. Kiểm tra giáo viên của lớp: `errors: [{ teacherid }]` hoặc `[{ teacherid, classname }]`.
- `id` trong params/query/body: số nguyên dương (chuỗi `"1"` cũng được); sai → 400 `"<tên> không hợp lệ"`.
- Route không tồn tại / JSON body hỏng: Express trả HTML (đã có fallback trong `api()`).
- Mọi cột date (`created_at`, `updated_at`, `startdate`, `enddate`) trả `"YYYY-MM-DD"` (BE đặt type parser trong `src/config/db.ts`).

### Cấu hình trường

| Method | Path | Body | Nơi gọi FE | Ghi chú BE |
|---|---|---|---|---|
| GET | `/branches` | — | `useBranches` | 200 `Branch[]`, sắp theo `code` |
| GET | `/branches/:id` | — | chưa dùng | 404 "Không tìm thấy phân hiệu" |
| POST | `/branches` | `{ name, code }` | branches-view | 201. `name` trim 1–100; `code` trim + viết hoa, `/^[A-Z]$/`. 409 trùng `code` |
| PUT | `/branches/:id` | `{ name?, code? }` | branches-view | 200. Đổi `code` làm đổi tên mọi lớp |
| DELETE | `/branches/:id` | — | branches-view | 200 bản ghi đã xóa · 409 "Phân hiệu còn {n} giáo viên và {m} lớp, không thể xóa" |
| GET | `/grades` | — | `useGrades` | 200 `Grade[]` theo `numgrade`, chỉ đọc |
| GET | `/teachers?branchid=` | — | `useTeachers` | 200 kèm `classid`, `classname` (null nếu chưa chủ nhiệm), sắp theo `id` |
| GET | `/teachers/:id` | — | chưa dùng | Không kèm `classid`/`classname` |
| POST | `/teachers` | `{ branchid, names[] }` | teachers-view | 201 mảng GV mới. Mỗi tên trim 1–25. `errors` field `branchid`/`names`/`names[i]` |
| PUT | `/teachers/:id` | `{ name?, branchid? }` | teachers-view | 409 nếu đổi sang phân hiệu khác khi đang chủ nhiệm (gửi lại `branchid` cũ thì không lỗi) |
| DELETE | `/teachers/:id` | — | teachers-view | 409 nếu đang chủ nhiệm |
| GET | `/classes?branchid=&gradeid=` | — | `useClasses` | 200 `ClassItem[]` theo `numgrade` → `branchcode` → `seq` |
| GET | `/classes/:id` | — | chưa dùng | |
| POST | `/classes` | `{ gradeid, branchid, teacherIds[] }` | classes-view | 201 `ClassItem[]`. `teacherIds` không rỗng, không trùng; GV cùng phân hiệu, chưa chủ nhiệm |
| PUT | `/classes/:id` | `{ teacherid }` | classes-view | 200; chọn lại GV hiện tại → không đổi |
| DELETE | `/classes/:id` | — | classes-view | 409 "Lớp {X} đã có điểm thi đua, không thể xóa" |

### Năm học, tuần, lượt chấm

| Method | Path | Body / query | Nơi gọi FE | Ghi chú BE |
|---|---|---|---|---|
| GET | `/school-years` | — | `useSchoolYears` | 200 `SchoolYear[]` (kèm `numweeks`, `enddate`), mới nhất trước |
| GET | `/school-years/:id` | — | chưa dùng | 200 `SchoolYear & { weeks: Week[] }` |
| POST | `/school-years` | `{ name, startdate, numweeks, conduct_base?, study_base? }` | school-years-view | 201. `name` `"YYYY-YYYY"` (năm sau = năm trước + 1), `startdate` `"YYYY-MM-DD"`, `numweeks` 1–60, điểm gốc 0–1000 (mặc định 100). Tự sinh tuần, mỗi tuần 7 ngày. 409 trùng tên / "Thời gian bị trùng với năm học X" |
| PUT | `/school-years/:id` | `{ name?, numweeks? }` | school-years-view | Tăng: sinh thêm tuần (điểm gốc theo tuần cuối). Giảm: xóa các tuần cuối, 409 nếu các tuần đó đã có điểm |
| DELETE | `/school-years/:id` | — | school-years-view | 409 "Năm học X đã có điểm thi đua, không thể xóa" |
| GET | `/weeks?schoolyearid=` | — | `useWeeks` | 200 `Week[]` theo ngày, kèm `schoolyearname`, `entries` |
| GET | `/weeks/current` | — | `useCurrentWeek` | Tuần chứa hôm nay · 404 "Hôm nay không thuộc tuần nào" |
| GET | `/weeks/:id` | — | chưa dùng | |
| PUT | `/weeks/:id` | `{ conduct_base?, study_base?, locked?, applyToNext? }` | `LockWeekButton`, `EditWeekBaseDialog` | `applyToNext` áp điểm gốc cho các tuần sau chưa khóa. Tuần khóa chỉ đổi gốc được khi gửi kèm `locked: false`, không thì 409. Không có POST/DELETE tuần |
| GET | `/points?weekid=&classid=&type=` | — | `usePoints` (weekid + classid) | 200 `Point[]` kèm `classname`, `numweek`, `schoolyearid`, `locked` |
| GET | `/points/:id` | — | chưa dùng | |
| POST | `/points` | `{ weekid, classid, type, content, value }` | scoring-view | 201. `type` `'Nề nếp'`/`'Học tập'`; `content` trim 1–255; `value` số nguyên ≠ 0, −1000..1000. 404 tuần/lớp · 409 "Tuần {n} đã khóa, không thể sửa điểm" |
| PUT | `/points/:id` | `{ type?, content?, value? }` | scoring-view | Không đổi được tuần/lớp · 409 tuần khóa |
| DELETE | `/points/:id` | — | scoring-view | 409 tuần khóa |

### Bảng điểm (chỉ đọc)

| Method | Path | Nơi gọi FE | Response |
|---|---|---|---|
| GET | `/scores/weekly?weekid=&branchid=&gradeid=` | `useWeeklyScore` | `{ week, scores: Score[] }` sắp theo `rank`; `rank` tính trong phạm vi lọc |
| GET | `/scores/summary?schoolyearid=&fromweek=&toweek=&branchid=&gradeid=` | `useSummaryScore` | `{ schoolyear, fromweek, toweek, scores: SummaryRow[] }`. Mặc định `fromweek = 1`, `toweek` = tuần đã bắt đầu gần nhất · 400 "fromweek phải nhỏ hơn hoặc bằng toweek" |
| GET | `/scores/class/:classid?schoolyearid=` | `useClassScore` | `{ class, schoolyear, weeks: (Score & { startdate, enddate })[] }` cho mọi tuần của năm; `rank` = hạng toàn trường của tuần đó |

### Nghiệp vụ ảnh hưởng UI

- Điểm phần = điểm gốc của tuần + Σ `value`; `total` = Nề nếp + Học tập; `*_plus`/`*_minus` là tổng cộng/tổng trừ (số dương). Xếp hạng dùng RANK (cùng điểm cùng hạng). FE không tự tính lại điểm.
- Tuần `locked`: không thêm/sửa/xóa lượt chấm, không đổi điểm gốc.
- Tên lớp (`6A1`) do BE tính; một GV chủ nhiệm tối đa một lớp, cùng phân hiệu. Role thiết kế `admin`/`teacher`, không có học sinh.

### Chưa có (⬜)

- Auth: đăng nhập, JWT `Authorization: Bearer <token>`, phân quyền theo `../BE/Ai_rules/security.md` (teacher chỉ chấm lớp mình chủ nhiệm).
- Tạo nhiều lượt chấm một lần: BE chưa có, có thể đề xuất nếu cần.

## Cấu hình và kiểm tra

- Biến môi trường: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEMO_MODE` (`.env.example`).
- `npm run snapshot:demo` (`scripts/snapshot-demo.mjs`): gọi GET theo các key SWR của `use-data.ts` (mọi tuần × phạm vi lọc, lượt chấm mọi tuần × lớp, điểm lớp theo năm, tổng hợp mặc định + mọi khoảng tuần đến `toweek` mặc định của BE) và ghi lại `public/demo-data/`. Cần chạy lại khi dữ liệu BE hoặc key SWR thay đổi.
- BE cổng 3001, CORS `credentials: true`; chỉ `http://localhost:3000` được phép (chuỗi `'*'` trong allowlist không có tác dụng wildcard).
- Dữ liệu seed DB dev (theo BE, 2026-10-29): 2 phân hiệu, 4 khối, 20 GV, 16 lớp; năm học 2026-2027 (bắt đầu 07/09/2026, 35 tuần), 507 lượt chấm cho tuần 1–8; tuần 1–7 đã khóa, tuần 8 đang mở. Đây là dữ liệu test, không phải contract.
- Script: `npm run dev`, `npm run build`, `npm start`, `npm run lint`. Không có script test/typecheck riêng.
