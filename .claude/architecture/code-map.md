<!--
Sơ đồ source dành cho coding agent. Cập nhật cùng thay đổi khi cấu trúc,
route, quan hệ sử dụng component hoặc request/response API thay đổi.
Chỉ ghi chi tiết đã xác minh; không đưa secret, token hay giá trị .env vào đây.
-->

# Code map — sơ đồ source và API

Cập nhật lần cuối: 2026-11-03 (học sinh, lớp chưa có GVCN, gắn học sinh vào lượt chấm, xếp hạng tuần/tháng/học kỳ theo `../BE/docs/fe-handoff-hoc-sinh.md`). Mô tả theo source FE trong worktree và contract BE trong
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
│       ├── tong-hop/page.tsx      # /tong-hop   → SummaryView (xếp hạng)
│       ├── diem-lop/page.tsx      # /diem-lop?lop= → ClassDetailView (trong Suspense)
│       ├── nam-hoc/page.tsx       # /nam-hoc    → SchoolYearsView
│       ├── phan-hieu/page.tsx     # /phan-hieu  → BranchesView
│       ├── giao-vien/page.tsx     # /giao-vien  → TeachersView
│       ├── lop-hoc/page.tsx       # /lop-hoc    → ClassesView
│       └── hoc-sinh/page.tsx      # /hoc-sinh   → StudentsView
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
| `/tong-hop` | `SummaryView` | Xếp hạng thi đua (menu "Xếp hạng") | Thi đua |
| `/diem-lop?lop=<classid>` | `ClassDetailView` | Điểm lớp | Thi đua |
| `/nam-hoc` | `SchoolYearsView` | Năm học & tuần | Cấu hình |
| `/phan-hieu` | `BranchesView` | Phân hiệu | Cấu hình |
| `/giao-vien` | `TeachersView` | Giáo viên | Cấu hình |
| `/lop-hoc` | `ClassesView` | Lớp học | Cấu hình |
| `/hoc-sinh` | `StudentsView` | Học sinh | Cấu hình |

Root layout dùng `title.template = "%s · Quản lý lớp học"`. Thêm trang: `page.tsx` trong `(dashboard)`, view trong `components/views/`, mục trong `navSections` của `nav.ts`. Đã bỏ trang `/bang-diem` (2026-11-04) vì trùng tab Tuần của `/tong-hop`; nút khóa tuần chuyển sang header `/cham-diem`, link "Xếp hạng" ở tổng quan trỏ `/tong-hop`. Build prerender các trang thành static (○); chưa kiểm tra lại số trang sau khi thêm `/hoc-sinh` vì build bị thiếu bộ nhớ ở máy dev (2026-11-03).

## Component và nơi sử dụng

### Views thi đua (`src/components/views/`)

| File | Hook | Thao tác ghi | Vai trò |
|---|---|---|---|
| `overview-view.tsx` | `useWeekPicker`, `useWeeklyScore`, branches/teachers/classes | — | Tuần mặc định: số lớp đã chấm / chưa chấm (`entries === 0`), số lượt chấm, lớp dẫn đầu, top 5, danh sách lớp chưa chấm, số lượng dữ liệu cấu hình. |
| `scoring-view.tsx` | `useWeekPicker`, `useWeeklyScore` (không lọc), `usePoints`, `useStudents({ classid })` (`StudentPicker`) | POST/PUT/DELETE `/points`, PUT `/weeks/:id` (khóa/mở ở header) | Danh sách lớp (lọc phân hiệu/khối ở client để giữ hạng toàn trường, sắp theo tên lớp) → panel lớp: điểm gốc/cộng/trừ của từng phần, tổng, hạng; form thêm nhanh (phần, nội dung, học sinh không bắt buộc, Trừ/Cộng + độ lớn; đổi lớp thì bỏ học sinh đã chọn); danh sách lượt chấm theo 2 phần kèm tên học sinh, sửa/xóa (PUT chỉ gửi `studentIds` khi danh sách đổi). Tuần khóa: ẩn form/nút sửa xóa, hiện nút mở khóa. |
| `class-detail-view.tsx` | `useSearchParams` (`?lop=`), `useWeekPicker` (năm học), classes, `useScorePeriods`, `useSummaryScore` (cả năm) / `useRanking` (học kỳ/tháng/tuần), `useClassScore`, `useClassPoints` | — | Chọn lớp (đổi bằng `router.replace`, `?lop=` sai/thiếu → lớp đầu) và khoảng (cả năm học / học kỳ / tháng / tuần, khoảng chưa bắt đầu bị tắt). Thẻ: hạng toàn trường, tổng + TB/tuần, tổng cộng, tổng trừ. `WeeklyDeltaChart`: cột chênh lệch tổng − điểm gốc mỗi tuần (sky-600 trên / orange-600 dưới, đã chạy validator CVD), tooltip từng tuần. `PointsCard`: lượt chấm trong khoảng, lọc Tất cả/Trừ/Cộng và theo học sinh. `StudentBoard` ×2: học sinh vi phạm / phấn đấu tốt gộp từ `point.students` (số lần, tổng điểm), bấm để lọc lượt chấm. Page bọc `Suspense` vì `useSearchParams` với `cacheComponents`. |
| `summary-view.tsx` | `useWeekPicker` (năm học + danh sách tuần), `useScorePeriods`, `useRanking`, `useSummaryScore` | — | Nút chọn Tuần / Tháng / Học kỳ / Khoảng tuần (`ModeTabs`), lọc phân hiệu/khối ở BE. `PeriodRanking`: ô chọn dựng từ `/scores/periods` (khoảng chưa `started` bị tắt; mặc định khoảng đã bắt đầu gần nhất), bảng từ `/scores/ranking` (điểm phần kèm +/−, cột Lượt chấm, 0 → "Chưa chấm"), dòng thông tin khoảng + badge "Đã tính X/Y tuần" khi `countedweeks < numweeks`; 409 (khoảng chưa bắt đầu) → `EmptyState`. `RangeSummary`: giữ cách cũ với `/scores/summary` (chọn từ/đến tuần, chặn from > to). Bấm vào dòng → `ClassScoreDialog`. |

### Views cấu hình

| File | Hook | Thao tác ghi | Vai trò |
|---|---|---|---|
| `school-years-view.tsx` | `useSchoolYears`, `useWeeks` | POST/PUT/DELETE `/school-years`, PUT `/weeks/:id` | Danh sách năm học (tạo / sửa tên + số tuần + tuần bắt đầu HK2 / xóa; hiện "HK1: tuần 1–(s2−1) · HK2: tuần s2–N"). Ô HK2 để trống = mặc định: POST bỏ trường, PUT gửi `null`; PUT chỉ gửi `semester2_week` khi đổi; bảng tuần của năm đang chọn: điểm gốc, số lượt chấm, trạng thái, sửa điểm gốc (+ "áp dụng cho các tuần sau", tắt khi tuần khóa), khóa/mở. |
| `branches-view.tsx` | branches, teachers, classes | POST/PUT/DELETE `/branches` | Bảng phân hiệu kèm số GV/lớp. |
| `teachers-view.tsx` | branches, teachers | POST/PUT/DELETE `/teachers` | Bảng GV, tìm kiếm + lọc; thêm hàng loạt; sửa. |
| `classes-view.tsx` | branches, grades, teachers, classes, `useClass` | POST/PUT/DELETE `/classes` | Bảng lớp kèm sĩ số; GVCN null hiện "Chưa có GVCN". Tạo hàng loạt: GV được chọn + số lớp chưa có GVCN (`teacherIds` phần tử `null`, xếp sau). Đổi GVCN có lựa chọn bỏ phân công (`teacherid: null`). Bấm tên lớp → `ClassStudentsDialog` (GET `/classes/:id`, chỉ xem). |
| `students-view.tsx` | branches, grades, classes, `useStudents(scope)` | POST/PUT/DELETE `/students` | Lọc phân hiệu/khối/lớp ở BE (đã chọn lớp thì chỉ gửi `classid`), tìm tên/mã HS ở client, phân trang 50 dòng ở client. Thêm hàng loạt vào 1 lớp bằng cách dán dòng "Mã, Họ tên, Giới tính, Ngày sinh" (tab/`,`/`;`; ngày `dd/mm/yyyy` hoặc `yyyy-mm-dd` → `"YYYY-MM-DD"`), validate trước ở FE. Sửa (mã, tên, giới tính, ngày sinh, lớp = chuyển lớp, gửi `null` để xóa giới tính/ngày sinh). Xóa qua `ConfirmDelete` (409 nếu đã gắn vào lượt chấm). `StudentHistoryDialog`: GET `/points?studentid=` (chỉ tải khi mở), dùng `SignedValue` từ `scores.tsx`. |

### `src/components/scores.tsx` (client)

| Export | Mục đích | Nơi dùng |
|---|---|---|
| `SchoolYearSelect`, `WeekSelect`, `WeekPickerControls` | Select năm học/tuần gắn với `WeekPicker` | scoring, summary (chỉ `SchoolYearSelect`) |
| `WeekStatus` | Badge Đã khóa / Đang mở | scoring, overview, school-years |
| `LockWeekButton` | PUT `/weeks/:id { locked }` qua `runMutation` | scoring (header + panel khi tuần khóa), school-years |
| `ScopeFilter` | Select phân hiệu + khối, có "Tất cả" (tự gọi `useBranches`/`useGrades`) | scoring, summary |
| `ClassName`, `RankBadge`, `PartScore`, `SignedValue` | Hiển thị tên lớp, hạng (tô màu top 3), điểm phần kèm +/−, giá trị có dấu | Các trang thi đua (`PartScore` cả bảng xếp hạng); `SignedValue` cả students-view |
| `ClassScoreDialog` | `useClassScore`: điểm từng tuần đã bắt đầu của 1 lớp, thanh tổng điểm, hạng toàn trường; mô tả "Chưa có GVCN" khi null; nút "Xem điểm chi tiết" → `/diem-lop?lop=` | summary |

### `src/components/common.tsx` (client)

| Export | Nơi dùng |
|---|---|
| `PageHeader` | Tất cả view |
| `IconTile`, `Tone` | `StatCard`, `EmptyState`, `ErrorState` |
| `StatCard` | overview |
| `EmptyState`, `ErrorState`, `TableSkeleton` | Tất cả view, `ClassScoreDialog` |
| `TeacherName` | Tên GVCN, null → chữ mờ "Chưa có GVCN": classes, overview, scoring, summary |
| `ConfirmDelete` | branches, teachers, classes, students, school-years, scoring (xóa lượt chấm) |
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
| `badge` | overview, teachers, classes, summary, scores |
| `button`, `card` | common và hầu hết view |
| `checkbox` | classes, school-years |
| `dialog` | branches, teachers, classes, students, scoring, school-years, scores |
| `tooltip` (ngoài layout) | class-detail (tooltip cột biểu đồ) |
| `input`, `label` | branches, teachers, classes (label), students, scoring, school-years |
| `select` | common, teachers, classes, students, scoring, summary, scores |
| `skeleton` | common |
| `sonner`, `tooltip` | `app/layout.tsx` |
| `table` | branches, teachers, classes, students, summary, school-years, scores |
| `textarea` | teachers, students |
| `dropdown-menu`, `separator` | Chưa có nơi dùng |

## Tầng dữ liệu

- `src/lib/api.ts`: `API_URL = NEXT_PUBLIC_API_URL ?? "http://localhost:3001"`. `api<T>` lỗi mạng → `ApiError(status 0)`; `!res.ok || !body.success` → `ApiError(message, status, errors)` (body không phải JSON → `"Lỗi <status>"`); trả `body.data as T`. Chế độ demo (`DEMO_MODE = NEXT_PUBLIC_DEMO_MODE === "true"`): không gọi BE; GET đọc `/demo-data/<demoFile(path)>` (file `{ status, body }`, query sắp xếp theo tên), thiếu file → `ApiError(404, "Bản demo chưa có dữ liệu…")`; POST/PUT/DELETE → `ApiError(403)` nên `runMutation`/`ConfirmDelete` hiện toast lỗi. `refreshAll = mutate(() => true)`. `errorMessage` ghép `errors[]` theo `message` (field `students[i].x` → tiền tố "Dòng i+1: "), `{ studentid, name? }` hoặc `{ teacherid, classname }`.
- `src/hooks/use-data.ts`:
  - `useStudents(scope)`: `StudentScope = { classid?, branchid?, gradeid? }`, key `/students` khi không lọc, ngược lại `/students?<toQuery>`. `useClass(id)` → `/classes/:id` (key `null` khi thiếu id). `useStudentPoints(studentid)` → `/points?studentid=`. `useClassPoints(classid)` → `/points?classid=` (mọi năm học, lọc ở client).
  - `useScorePeriods(schoolyearid)` → `/scores/periods?schoolyearid=`. `useRanking(schoolyearid, { type, value }, scope)` → `/scores/ranking?schoolyearid=&<week|month|semester>=&branchid=&gradeid=`; `shouldRetryOnError` tắt với lỗi 4xx (409 là kết quả bình thường). `toQuery` nhận số hoặc chuỗi.
  - Không tham số: `useBranches`, `useGrades`, `useTeachers`, `useClasses`, `useSchoolYears`, `useCurrentWeek` (`shouldRetryOnError: false`, vì 404 ngoài năm học là trường hợp bình thường).
  - Có tham số (key `null` khi thiếu): `useWeeks(schoolyearid)`, `usePoints(weekid, classid)`, `useWeeklyScore(weekid, scope)`, `useSummaryScore(schoolyearid, fromweek?, toweek?, scope)`, `useClassScore(classid, schoolyearid)`. `ScoreScope = { branchid?, gradeid? }`; `toQuery` bỏ giá trị rỗng.
- `src/hooks/use-week-picker.ts`: `useWeekPicker()` chỉ lưu lựa chọn của người dùng. Năm học mặc định = năm của tuần hiện tại → năm mới nhất. Tuần mặc định = tuần hiện tại nếu thuộc năm đang xem → tuần đã bắt đầu gần nhất → tuần đầu. `error` bỏ qua lỗi của `/weeks/current`.
- `src/lib/format.ts`: `todayISO()` chỉ được gọi khi đã có dữ liệu API (trên trình duyệt); gọi lúc prerender sẽ lỗi build với `cacheComponents`.
- `src/lib/types.ts`: `Branch`, `Grade`, `Teacher`, `ClassItem` (`teacherid`/`teachername` nullable, `numstudents`), `ClassDetail`, `GENDERS`/`Gender`, `Student`, `SchoolYear` (kèm `semester2_week`), `Week`, `POINT_TYPES`/`PointType`, `PointStudent`, `Point` (kèm `students`), `Score`, `WeeklyScore`, `SummaryRow`, `PeriodType`, `PeriodWeek`, `PeriodRange`, `ScorePeriods`, `RankingRow`, `Ranking`, `SummaryScore`, `ClassScore`, `FieldError`.

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
| GET | `/classes?branchid=&gradeid=` | — | `useClasses` | 200 `ClassItem[]` theo `numgrade` → `branchcode` → `seq`; kèm `numstudents`; `teacherid`/`teachername` có thể `null` |
| GET | `/classes/:id` | — | `useClass` (classes-view, `ClassStudentsDialog`) | 200 `ClassItem & { students: Student[] }` (học sinh sắp theo id) |
| POST | `/classes` | `{ gradeid, branchid, teacherIds[] }` | classes-view | 201 `ClassItem[]`. `teacherIds` không rỗng; phần tử `null` = lớp chưa có GVCN; GV khác null không trùng, cùng phân hiệu, chưa chủ nhiệm |
| PUT | `/classes/:id` | `{ teacherid }` | classes-view | 200; `teacherid: null` = bỏ GVCN; chọn lại GV hiện tại → không đổi |
| DELETE | `/classes/:id` | — | classes-view | 409 "Lớp {X} còn N học sinh, chuyển hoặc xóa học sinh trước" / "Lớp {X} đã có điểm thi đua, không thể xóa" |
| GET | `/students?classid=&branchid=&gradeid=` | — | `useStudents` | 200 `Student[]` (kèm `classname`, `gradeid`, `branchid`), sắp theo lớp → id; 400 id lọc sai |
| GET | `/students/:id` | — | chưa dùng | 404 |
| POST | `/students` | `{ classid, students: [{ code, name, gender?, birthdate? }] }` | students-view | 201. `code` chữ/số 1–20, duy nhất (trùng trong request → 400 "Mã học sinh bị trùng", trùng DB → 409 "Dữ liệu bị trùng"); `name` ≤ 50; `gender` `'Nam'`/`'Nữ'`/null; `birthdate` `"YYYY-MM-DD"`/null. 400 `errors[{ field: "students[i].code", message }]`, 404 lớp |
| PUT | `/students/:id` | `{ code?, name?, gender?, birthdate?, classid? }` | students-view | Đổi `classid` = chuyển lớp; `null` xóa gender/birthdate. 400, 404, 409 trùng mã |
| DELETE | `/students/:id` | — | students-view | 404 · 409 "Học sinh X đã có trong N lượt chấm điểm, không thể xóa" |

### Năm học, tuần, lượt chấm

| Method | Path | Body / query | Nơi gọi FE | Ghi chú BE |
|---|---|---|---|---|
| GET | `/school-years` | — | `useSchoolYears` | 200 `SchoolYear[]` (kèm `numweeks`, `enddate`, `semester2_week` luôn là số, mặc định `CEIL(numweeks/2)+1`), mới nhất trước |
| GET | `/school-years/:id` | — | chưa dùng | 200 `SchoolYear & { weeks: Week[] }` |
| POST | `/school-years` | `{ name, startdate, numweeks, conduct_base?, study_base?, semester2_week? }` | school-years-view | 201. `semester2_week` 2..numweeks, ngoài khoảng → 400 "Tuần bắt đầu học kỳ 2 phải từ 2 đến N". `name` `"YYYY-YYYY"` (năm sau = năm trước + 1), `startdate` `"YYYY-MM-DD"`, `numweeks` 1–60, điểm gốc 0–1000 (mặc định 100). Tự sinh tuần, mỗi tuần 7 ngày. 409 trùng tên / "Thời gian bị trùng với năm học X" |
| PUT | `/school-years/:id` | `{ name?, numweeks?, semester2_week? }` | school-years-view | `semester2_week: null` = về mặc định; 400 khi ngoài 2..numweeks (kể cả khi giảm numweeks). Tăng: sinh thêm tuần (điểm gốc theo tuần cuối). Giảm: xóa các tuần cuối, 409 nếu các tuần đó đã có điểm |
| DELETE | `/school-years/:id` | — | school-years-view | 409 "Năm học X đã có điểm thi đua, không thể xóa" |
| GET | `/weeks?schoolyearid=` | — | `useWeeks` | 200 `Week[]` theo ngày, kèm `schoolyearname`, `entries` |
| GET | `/weeks/current` | — | `useCurrentWeek` | Tuần chứa hôm nay · 404 "Hôm nay không thuộc tuần nào" |
| GET | `/weeks/:id` | — | chưa dùng | |
| PUT | `/weeks/:id` | `{ conduct_base?, study_base?, locked?, applyToNext? }` | `LockWeekButton`, `EditWeekBaseDialog` | `applyToNext` áp điểm gốc cho các tuần sau chưa khóa. Tuần khóa chỉ đổi gốc được khi gửi kèm `locked: false`, không thì 409. Không có POST/DELETE tuần |
| GET | `/points?weekid=&classid=&type=&studentid=` | — | `usePoints` (weekid + classid), `useStudentPoints` (studentid), `useClassPoints` (classid) | 200 `Point[]` kèm `classname`, `numweek`, `schoolyearid`, `locked`, `students: { id, code, name }[]` (luôn là mảng); sắp theo tuần → lớp → id. `studentid` = lượt chấm có gắn học sinh đó |
| GET | `/points/:id` | — | chưa dùng | |
| POST | `/points` | `{ weekid, classid, type, content, value, studentIds? }` | scoring-view | 201. `studentIds` mảng id không trùng (400 field `studentIds`), học sinh phải thuộc lớp (400 "Học sinh không thuộc lớp của lượt chấm" `errors[{ studentid, name }]`), 404 "Không tìm thấy học sinh" `errors[{ studentid }]`. `type` `'Nề nếp'`/`'Học tập'`; `content` trim 1–255; `value` số nguyên ≠ 0, −1000..1000. 404 tuần/lớp · 409 "Tuần {n} đã khóa, không thể sửa điểm" |
| PUT | `/points/:id` | `{ type?, content?, value?, studentIds? }` | scoring-view | Không đổi được tuần/lớp · 409 tuần khóa. `studentIds`: bỏ trường = giữ nguyên, mảng = thay toàn bộ, `[]` = bỏ hết; chỉ kiểm tra lớp với học sinh mới gắn |
| DELETE | `/points/:id` | — | scoring-view | 409 tuần khóa |

### Bảng điểm (chỉ đọc)

| Method | Path | Nơi gọi FE | Response |
|---|---|---|---|
| GET | `/scores/weekly?weekid=&branchid=&gradeid=` | `useWeeklyScore` (scoring, overview; FE chỉ gọi không lọc) | `{ week, scores: Score[] }` sắp theo `rank`; `rank` tính trong phạm vi lọc |
| GET | `/scores/summary?schoolyearid=&fromweek=&toweek=&branchid=&gradeid=` | `useSummaryScore` | `{ schoolyear, fromweek, toweek, scores: SummaryRow[] }`. Mặc định `fromweek = 1`, `toweek` = tuần đã bắt đầu gần nhất · 400 "fromweek phải nhỏ hơn hoặc bằng toweek" |
| GET | `/scores/periods?schoolyearid=` | `useScorePeriods` | `{ schoolyear, weeks: PeriodWeek[], months: PeriodRange<"YYYY-MM">[], semesters: PeriodRange<1\|2>[] }`. Tuần thuộc tháng chứa thứ Năm của tuần; `started` = tuần đã bắt đầu · 400 / 404 năm học |
| GET | `/scores/ranking?schoolyearid=&week=\|month=\|semester=&branchid=&gradeid=` | `useRanking` | Đúng 1 trong `week` (numweek 1–60, không phải weekid), `month` (`YYYY-MM`), `semester` (1\|2). `{ schoolyear, period: { type, value, label, fromweek, toweek, startdate, enddate, numweeks, countedweeks }, scores: RankingRow[] }` sắp theo `rank` (theo `total`, RANK); chỉ tính tuần đã bắt đầu. 400 query sai · 404 năm học / khoảng không thuộc năm học · 409 "<Khoảng> chưa bắt đầu, chưa có điểm để xếp hạng" |
| GET | `/scores/class/:classid?schoolyearid=` | `useClassScore` | `{ class, schoolyear, weeks: (Score & { startdate, enddate })[] }` cho mọi tuần của năm; `rank` = hạng toàn trường của tuần đó |

### Nghiệp vụ ảnh hưởng UI

- Điểm phần = điểm gốc của tuần + Σ `value`; `total` = Nề nếp + Học tập; `*_plus`/`*_minus` là tổng cộng/tổng trừ (số dương). Xếp hạng dùng RANK (cùng điểm cùng hạng). FE không tự tính lại điểm.
- Tuần `locked`: không thêm/sửa/xóa lượt chấm, không đổi điểm gốc.
- Tên lớp (`6A1`) do BE tính; một GV chủ nhiệm tối đa một lớp, cùng phân hiệu. Lớp có thể chưa có GVCN (`teacherid` null, kể cả trong `/scores/*`). Role thiết kế `admin`/`teacher`; học sinh chỉ là dữ liệu của lớp (không tài khoản), quyền thiết kế: xem admin/teacher, ghi admin.

### Chưa có (⬜)

- Auth: đăng nhập, JWT `Authorization: Bearer <token>`, phân quyền theo `../BE/Ai_rules/security.md` (teacher chỉ chấm lớp mình chủ nhiệm).
- Tạo nhiều lượt chấm một lần: BE chưa có, có thể đề xuất nếu cần.

## Cấu hình và kiểm tra

- Biến môi trường: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEMO_MODE` (`.env.example`).
- `npm run snapshot:demo` (`scripts/snapshot-demo.mjs`): gọi GET theo các key SWR của `use-data.ts` (mọi tuần × phạm vi lọc, lượt chấm mọi tuần × lớp, điểm lớp theo năm, tổng hợp mặc định + mọi khoảng tuần đến `toweek` mặc định của BE, học sinh theo phạm vi lọc và theo lớp, `/classes/:id`, `/points?studentid=` của mọi học sinh, `/points?classid=` của mọi lớp, `/scores/periods` và `/scores/ranking` mọi khoảng đã bắt đầu × phạm vi lọc) và ghi lại `public/demo-data/`. Cần chạy lại khi dữ liệu BE hoặc key SWR thay đổi; snapshot hiện tại chưa chụp lại sau khi thêm học sinh.
- BE cổng 3001, CORS `credentials: true`; chỉ `http://localhost:3000` được phép (chuỗi `'*'` trong allowlist không có tác dụng wildcard).
- Dữ liệu DB dev (theo BE, 2026-11-03): 2 phân hiệu, 4 khối, 20 GV (chưa chủ nhiệm lớp nào), 55 lớp (6A1–9B6) đều chưa có GVCN, 2493 học sinh; lượt chấm cũ đã bị xóa. Đây là dữ liệu test, không phải contract.
- Script: `npm run dev`, `npm run build`, `npm start`, `npm run lint`. Không có script test/typecheck riêng.
