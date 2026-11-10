<!--
Sơ đồ source dành cho coding agent. Cập nhật cùng thay đổi khi cấu trúc,
route, quan hệ sử dụng component hoặc request/response API thay đổi.
Chỉ ghi chi tiết đã xác minh; không đưa secret, token hay giá trị .env vào đây.
-->

# Code map — sơ đồ source và API

Cập nhật lần cuối: 2026-11-04 (đăng nhập + phân quyền admin / GVCN / cờ đỏ, trang Tài khoản theo `../BE/docs/fe-handoff-phan-quyen.md`; trước đó: học sinh, xếp hạng tuần/tháng/học kỳ theo `../BE/docs/fe-handoff-hoc-sinh.md`). Mô tả theo source FE trong worktree và contract BE trong
`../BE/Ai_rules/code-map.md`, `../BE/docs/logic-trien-khai.md`, note route ở `../BE/src/router/*Router.ts`,
cùng spec do session BE (`be-02`) xác nhận theo code thực tế. Response mẫu đã đối chiếu bằng GET tới BE local.

Trạng thái: ✅ hoàn thành · 🚧 đang làm / còn lỗi · ⬜ chưa làm

## Đọc nhanh

- Mục đích chính: **chấm điểm thi đua theo tuần** (Nề nếp + Học tập), xếp hạng, tổng hợp. Phân hiệu, giáo viên, lớp, năm học/tuần là phần cấu hình.
- Next.js 16.4.3 App Router (`cacheComponents`, `partialPrefetching`), React 19.3.0, TypeScript strict, Tailwind CSS 4, shadcn/ui `radix-nova`, SWR, sonner.
- Alias `@/*` → `src/*`.
- Dữ liệu tải ở trình duyệt bằng SWR, key = path API kèm query. Sau mỗi thao tác ghi gọi `refreshAll()` để tải lại mọi key (bảng điểm, tuần, lượt chấm cập nhật cùng lúc).
- Ngày từ BE là chuỗi `"YYYY-MM-DD"`; định dạng bằng `src/lib/format.ts`, không qua `Date`.
- Đăng nhập bắt buộc: JWT lưu `localStorage` (khóa `qllh.token`), `api()` gửi `Authorization: Bearer`. 401 (trừ `/auth/login`) → xóa token, điều hướng cứng về `/dang-nhap`. 3 loại tài khoản (`kind`): `admin` (quản lý nề nếp, sửa mọi thứ), `gvcn` (xem mọi trang, không chấm điểm — đổi 2026-11-04), `codo` (cờ đỏ, chỉ vào `/` và `/cham-diem`, chấm lớp được phân công). Ẩn nút / chặn trang ở FE chỉ để hiển thị đúng, BE mới thực thi quyền.

## Cấu trúc source

```text
src/
├── app/
│   ├── layout.tsx                 # Root layout: font, globals.css, TooltipProvider, Toaster
│   ├── globals.css                # Tailwind, token theme, utility `glass`
│   ├── dang-nhap/page.tsx         # /dang-nhap  → LoginView (ngoài layout dashboard, không có AuthGuard)
│   └── (dashboard)/
│       ├── layout.tsx             # Nền mờ, sidebar (Brand + SidebarNav), AppHeader, <main> bọc AuthGuard
│       ├── page.tsx               # /           → OverviewView
│       ├── cham-diem/page.tsx     # /cham-diem  → ScoringView        (trang chính)
│       ├── tong-hop/page.tsx      # /tong-hop   → SummaryView (xếp hạng)
│       ├── diem-lop/page.tsx      # /diem-lop?lop= → ClassDetailView (trong Suspense)
│       ├── nam-hoc/page.tsx       # /nam-hoc    → SchoolYearsView
│       ├── phan-hieu/page.tsx     # /phan-hieu  → BranchesView
│       ├── giao-vien/page.tsx     # /giao-vien  → TeachersView
│       ├── lop-hoc/page.tsx       # /lop-hoc    → ClassesView
│       ├── hoc-sinh/page.tsx      # /hoc-sinh   → StudentsView
│       └── tai-khoan/page.tsx     # /tai-khoan  → AccountsView (chỉ admin)
├── components/
│   ├── common.tsx                 # Thành phần dùng chung giữa các view
│   ├── scores.tsx                 # Thành phần dùng chung giữa các trang thi đua
│   ├── layout/
│   │   ├── nav.ts                 # navSections (Thi đua / Cấu hình) kèm roles, navItems, isActive(), canAccess*, navSectionsFor()
│   │   ├── sidebar-nav.tsx        # Brand, SidebarNav (lọc theo loại tài khoản)
│   │   ├── auth-guard.tsx         # AuthGuard: chờ /auth/me, chặn trang không được vào → về /
│   │   └── app-header.tsx         # Header + menu mobile (Sheet) + menu tài khoản (đổi mật khẩu, đăng xuất)
│   ├── views/                     # Nội dung từng trang (client component)
│   └── ui/                        # Primitive shadcn
├── hooks/
│   ├── use-data.ts                # Hook SWR theo API
│   └── use-week-picker.ts         # Chọn năm học + tuần, mặc định tuần hiện tại
└── lib/
    ├── api.ts                     # fetch wrapper + token, ApiError, apiPost/Put/Delete, login/logout, refreshAll, errorMessage
    ├── auth.ts                    # Quy tắc quyền phía FE: isAdmin, canScoreClass, canManagePoint, accountDisplay, KIND_LABELS
    ├── format.ts                  # formatDate, formatRange, formatSigned, todayISO
    ├── types.ts                   # Kiểu response BE
    └── utils.ts                   # cn()
```

`public/` chứa SVG mặc định, `banner.jpg` (banner trường 2172×386, dùng ở `overview-view.tsx` và `login-view.tsx` qua `next/image`) và `demo-data/` (snapshot response BE cho bản demo, sinh bằng `scripts/snapshot-demo.mjs`, không sửa tay).

## Sitemap route

| URL | View | `metadata.title` | Nhóm menu | Được vào (`roles`) |
|---|---|---|---|---|
| `/dang-nhap` | `LoginView` | Đăng nhập | — | Chưa đăng nhập |
| `/` | `OverviewView` | (mặc định root) | Thi đua | Mọi tài khoản |
| `/cham-diem` | `ScoringView` | Chấm điểm | Thi đua | Mọi tài khoản |
| `/tong-hop` | `SummaryView` | Xếp hạng thi đua (menu "Xếp hạng") | Thi đua | admin, gvcn |
| `/diem-lop?lop=<classid>` | `ClassDetailView` | Điểm lớp | Thi đua | admin, gvcn |
| `/nam-hoc` | `SchoolYearsView` | Năm học & tuần | Cấu hình | admin, gvcn (gvcn chỉ xem) |
| `/phan-hieu` | `BranchesView` | Phân hiệu | Cấu hình | admin, gvcn (gvcn chỉ xem) |
| `/giao-vien` | `TeachersView` | Giáo viên | Cấu hình | admin, gvcn (gvcn chỉ xem) |
| `/lop-hoc` | `ClassesView` | Lớp học | Cấu hình | admin, gvcn (gvcn chỉ xem) |
| `/hoc-sinh` | `StudentsView` | Học sinh | Cấu hình | admin, gvcn (gvcn chỉ xem) |
| `/tai-khoan` | `AccountsView` | Tài khoản | Cấu hình | admin |

Chặn trang: `AuthGuard` (bọc `<main>` trong `(dashboard)/layout.tsx`) ẩn trang tới khi có `useMe()`, nếu `canAccessPath(kind, pathname)` sai thì `router.replace("/")`. URL không có trong menu (404) không bị chặn.

Root layout dùng `title.template = "%s · Quản lý lớp học"`. Thêm trang: `page.tsx` trong `(dashboard)`, view trong `components/views/`, mục trong `navSections` của `nav.ts`. Đã bỏ trang `/bang-diem` (2026-11-04) vì trùng tab Tuần của `/tong-hop`; nút khóa tuần chuyển sang header `/cham-diem`, link "Xếp hạng" ở tổng quan trỏ `/tong-hop`. Build prerender các trang thành static (○); chưa kiểm tra lại số trang sau khi thêm `/hoc-sinh` vì build bị thiếu bộ nhớ ở máy dev (2026-11-03).

## Component và nơi sử dụng

### Views thi đua (`src/components/views/`)

| File | Hook | Thao tác ghi | Vai trò |
|---|---|---|---|
| `overview-view.tsx` | `useWeekPicker`, `useWeeklyScore`, branches/teachers/classes, `useMe` | — | Banner trường (`/banner.jpg`) ở đầu trang. Link sang trang khác (Xếp hạng, Năm học, Dữ liệu trường) chỉ hiện khi `canAccessPath` cho phép (cờ đỏ thấy số liệu nhưng không có link). Tuần mặc định: số lớp đã chấm / chưa chấm (`entries === 0`), số lượt chấm, lớp dẫn đầu, top 5, danh sách lớp chưa chấm, số lượng dữ liệu cấu hình. |
| `scoring-view.tsx` | `useWeekPicker`, `useWeeklyScore` (không lọc), `usePoints`, `useStudents({ classid })` (`StudentPicker`) | POST/PUT/DELETE `/points`, PUT `/weeks/:id` (khóa/mở ở header) | Danh sách lớp (lọc phân hiệu/khối ở client để giữ hạng toàn trường, sắp theo tên lớp) → panel lớp: điểm gốc/cộng/trừ của từng phần, tổng, hạng; form thêm nhanh (phần, nội dung, học sinh không bắt buộc, Trừ/Cộng + độ lớn; đổi lớp thì bỏ học sinh đã chọn); danh sách lượt chấm theo 2 phần kèm tên học sinh, sửa/xóa (PUT chỉ gửi `studentIds` khi danh sách đổi). Tuần khóa: ẩn form/nút sửa xóa, hiện nút mở khóa (chỉ admin). Phân quyền (`useMe` + `lib/auth.ts`): form thêm chỉ hiện khi `canScoreClass` (admin mọi lớp · codo `classes[]` · gvcn không lớp nào), ngược lại hiện "Chỉ xem" kèm lý do; GVCN ẩn toàn bộ phần thêm lượt chấm (cả khung "Chỉ xem" và khung tuần đã khóa); nút sửa/xóa từng lượt theo `canManagePoint` (admin mọi lượt · codo chỉ lượt `accountid === me.id` ở lớp còn được phân công · gvcn không bao giờ). Mỗi lượt hiện "Người nhập: `accountusername`" (null → "Không rõ"). Cờ đỏ: ô "Chỉ lớp tôi được chấm" (mặc định bật) lọc danh sách lớp. Lớp chọn mặc định: lớp được chấm đầu tiên (cờ đỏ) / lớp chủ nhiệm (GVCN) / lớp đầu. Cờ đỏ chưa được phân công → thông báo liên hệ GV quản lý nề nếp. Link "Chi tiết lớp" ẩn với cờ đỏ. |
| `class-detail-view.tsx` | `useSearchParams` (`?lop=`), `useWeekPicker` (năm học), classes, `useScorePeriods`, `useSummaryScore` (cả năm) / `useRanking` (học kỳ/tháng/tuần), `useClassScore`, `useClassPoints` | — | Chọn lớp (đổi bằng `router.replace`, `?lop=` sai/thiếu → lớp đầu) và khoảng (cả năm học / học kỳ / tháng / tuần, khoảng chưa bắt đầu bị tắt). Thẻ: hạng toàn trường, tổng + TB/tuần, tổng cộng, tổng trừ. `WeeklyDeltaChart`: cột chênh lệch tổng − điểm gốc mỗi tuần (sky-600 trên / orange-600 dưới, đã chạy validator CVD), tooltip từng tuần. `PointsCard`: lượt chấm trong khoảng, lọc Tất cả/Trừ/Cộng và theo học sinh. `StudentBoard` ×2: học sinh vi phạm / phấn đấu tốt gộp từ `point.students` (số lần, tổng điểm), bấm để lọc lượt chấm. Page bọc `Suspense` vì `useSearchParams` với `cacheComponents`. |
| `summary-view.tsx` | `useWeekPicker` (năm học + danh sách tuần), `useScorePeriods`, `useRanking`, `useSummaryScore` | GET `/scores/export` qua `apiDownload` | Nút chọn Tuần / Tháng / Học kỳ / Cả năm / Khoảng tuần (`ModeTabs`), lọc phân hiệu/khối ở BE. Cả năm gửi `year=1`, không có ô chọn khoảng. `ExportButton` "Tải Excel" (chỉ ở `PeriodRanking`, ẩn khi `DEMO_MODE`): path `/scores/export?<rankingQuery>` đúng khoảng + phạm vi lọc đang xem; tắt khi bảng chưa có dòng / lỗi / 409; `pending` khi đang tải; toast "Đã tải <tên file>" hoặc lỗi qua `errorMessage`. Khoảng tuần (`/scores/summary`) không có Excel vì BE không hỗ trợ. `PeriodRanking`: ô chọn dựng từ `/scores/periods` (khoảng chưa `started` bị tắt; mặc định khoảng đã bắt đầu gần nhất), bảng từ `/scores/ranking` (điểm phần kèm +/−, cột Lượt chấm, 0 → "Chưa chấm"), dòng thông tin khoảng + badge "Đã tính X/Y tuần" khi `countedweeks < numweeks`; 409 (khoảng chưa bắt đầu) → `EmptyState`. `RangeSummary`: giữ cách cũ với `/scores/summary` (chọn từ/đến tuần, chặn from > to). Bấm vào dòng → `ClassScoreDialog`. |

### Views cấu hình

| File | Hook | Thao tác ghi | Vai trò |
|---|---|---|---|
| `school-years-view.tsx` | `useSchoolYears`, `useWeeks`; `CreateSchoolYearDialog` thêm branches, grades, classes | POST/PUT/DELETE `/school-years`, PUT `/weeks/:id` | Danh sách năm học (tạo / sửa tên + số tuần + tuần bắt đầu HK2 / xóa; hiện "HK1: tuần 1–(s2−1) · HK2: tuần s2–N"). Tạo năm học (nút chỉ hiện khi đã tải `/school-years`): năm mới nhất (max `startdate`) có `enddate >= todayISO()` → cảnh báo + tắt nút gửi; ô ngày bắt đầu `min = enddate + 1`. Khi đã có năm cũ: mục "Lên lớp" với ô số lớp 6 mới mỗi phân hiệu (0–30, mặc định = số lớp khối đầu đang học), dự kiến số lớp ra trường / lên khối / tạo mới, checkbox xác nhận không hoàn tác (bắt buộc); gửi `grade6` cho mọi phân hiệu (không gửi nếu không tải được dữ liệu). Toast từ `data.promotion` (`promotionMessage`, gom tên lớp 6 mới dạng "6A1–6A8"). Ô HK2 để trống = mặc định: POST bỏ trường, PUT gửi `null`; PUT chỉ gửi `semester2_week` khi đổi; bảng tuần của năm đang chọn: điểm gốc, số lượt chấm, trạng thái, sửa điểm gốc (+ "áp dụng cho các tuần sau", tắt khi tuần khóa), khóa/mở. |
| `branches-view.tsx` | branches, teachers, classes | POST/PUT/DELETE `/branches` | Bảng phân hiệu kèm số GV/lớp. |
| `teachers-view.tsx` | branches, teachers | POST/PUT/DELETE `/teachers` | Bảng GV, tìm kiếm + lọc; thêm hàng loạt; sửa. |
| `classes-view.tsx` | branches, grades, teachers, classes, `useArchivedClasses` (chỉ khi chọn "Đã ra trường"), `useClass` | POST/PUT/DELETE `/classes` | Nút chuyển "Đang học" / "Đã ra trường"; chế độ ra trường chỉ xem (ẩn đổi GVCN / xóa, cột "Ra trường" hiện năm học), dialog học sinh ghi "Đã ra trường (năm học X)". Nút Tạo lớp hiện cho admin ở cả hai chế độ, xem trước số lớp theo lớp đang học. Bảng lớp kèm sĩ số; GVCN null hiện "Chưa có GVCN". Tạo hàng loạt: GV được chọn + số lớp chưa có GVCN (`teacherIds` phần tử `null`, xếp sau). Đổi GVCN có lựa chọn bỏ phân công (`teacherid: null`). Bấm tên lớp → `ClassStudentsDialog` (GET `/classes/:id`, chỉ xem). |
| `accounts-view.tsx` | `useAccounts`, teachers, classes, `useStudents({ classid })` (chỉ khi đã chọn lớp), `useMe` | POST/PUT/DELETE `/accounts`, PUT `/accounts/:id/classes` | Bảng tài khoản (tên đăng nhập, loại, người gắn + lớp CN / lớp HS, lớp chấm, trạng thái), tìm kiếm + lọc loại ở client. `CreateAccountDialog`: loại Quản lý nề nếp (`role: "admin"`, GV không bắt buộc) / GVCN (`role: "user"` + `teacherid`) / Cờ đỏ (`role: "user"` + `studentid`, chọn lớp → học sinh); GV/HS đã có tài khoản bị tắt; validate username `^[a-z0-9._-]{3,50}$`, mật khẩu 6 ký tự – 72 byte. `EditAccountDialog`: đổi username / đặt lại mật khẩu (chỉ gửi trường đổi). `ToggleActiveButton`: `{ active }`. `AssignClassesDialog` (chỉ cờ đỏ): checkbox lớp, loại `studentclassid`, gửi `{ classIds }` thay toàn bộ. Không hiện khóa/xóa cho chính mình. |
| `login-view.tsx` | — (`login()` trong `api.ts`) | POST `/auth/login` | Banner + form tên đăng nhập / mật khẩu; lỗi hiện `message` của BE trong form. Đã có token hoặc `DEMO_MODE` → `router.replace("/")`. |
| `students-view.tsx` | branches, grades, classes, `useStudents(scope)` | POST/PUT/DELETE `/students` | Lọc phân hiệu/khối/lớp ở BE (đã chọn lớp thì chỉ gửi `classid`), tìm tên/mã HS ở client, phân trang 50 dòng ở client. Thêm hàng loạt vào 1 lớp bằng cách dán dòng "Mã, Họ tên, Giới tính, Ngày sinh" (tab/`,`/`;`; ngày `dd/mm/yyyy` hoặc `yyyy-mm-dd` → `"YYYY-MM-DD"`), validate trước ở FE. Sửa (mã, tên, giới tính, ngày sinh, lớp = chuyển lớp, gửi `null` để xóa giới tính/ngày sinh). Xóa qua `ConfirmDelete` (409 nếu đã gắn vào lượt chấm). `StudentHistoryDialog`: GET `/points?studentid=` (chỉ tải khi mở), dùng `SignedValue` từ `scores.tsx`. |

### `src/components/scores.tsx` (client)

| Export | Mục đích | Nơi dùng |
|---|---|---|
| `SchoolYearSelect`, `WeekSelect`, `WeekPickerControls` | Select năm học/tuần gắn với `WeekPicker` | scoring, summary (chỉ `SchoolYearSelect`) |
| `WeekStatus` | Badge Đã khóa / Đang mở | scoring, overview, school-years |
| `LockWeekButton` | PUT `/weeks/:id { locked }` qua `runMutation`; trả `null` khi không phải admin (`useMe`) | scoring (header + panel khi tuần khóa), school-years |
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
| `ConfirmDelete` | branches, teachers, classes, students, school-years, scoring (xóa lượt chấm), accounts |
| `runMutation` | Mọi dialog/form ghi, `LockWeekButton`, đổi mật khẩu (app-header). `successMessage` là chuỗi hoặc hàm nhận kết quả BE (tạo năm học dùng hàm để báo kết quả lên lớp) |
| `BranchSelect`, `GradeSelect` | teachers, classes |

### Layout (`src/components/layout/`)

| File | Nơi dùng |
|---|---|
| `nav.ts` (`navSections`, `navItems`, `isActive`, `canAccess`, `canAccessPath`, `navSectionsFor`; `NavItem.roles`) | `sidebar-nav.tsx` dùng `navSectionsFor`; `app-header.tsx` dùng `navItems` để lấy tiêu đề; `auth-guard.tsx`, overview, scoring dùng `canAccessPath` |
| `sidebar-nav.tsx` (`Brand`, `SidebarNav`) | `(dashboard)/layout.tsx`, `app-header.tsx`. Chưa có `me` thì chưa hiện mục menu nào |
| `auth-guard.tsx` (`AuthGuard`) | `(dashboard)/layout.tsx`. Luôn render `children` trong `<div hidden>` (không bỏ đi): bỏ children lúc prerender làm Next báo "Could not validate that a segment in your UI has instant navigation" (segment bị drop). Chưa sẵn sàng: lỗi `/auth/me` khác 401 → `ErrorState` + thử lại, đang tải / đang chuyển hướng → `TableSkeleton` |
| `app-header.tsx` (`AppHeader`) | `(dashboard)/layout.tsx`. `AccountMenu` (dropdown): tên = `teachername ?? studentname ?? username`, nhãn "Quản lý nề nếp" / "GVCN 6A1" / "Cờ đỏ 7A1" (`accountDisplay`), Đổi mật khẩu (`ChangePasswordDialog`, PUT `/auth/password`), Đăng xuất. Bản demo: thay menu bằng badge "Bản demo · Chỉ xem" |

### UI primitives (`src/components/ui/`)

| File | Nơi dùng ngoài `ui/` |
|---|---|
| `alert-dialog` | common |
| `avatar`, `sheet`, `dropdown-menu` | app-header |
| `badge` | overview, teachers, classes, summary, scores, accounts |
| `button`, `card` | common và hầu hết view |
| `checkbox` | classes, school-years, scoring (lọc lớp được chấm), accounts (phân công lớp) |
| `dialog` | branches, teachers, classes, students, scoring, school-years, scores, accounts, app-header |
| `tooltip` (ngoài layout) | class-detail (tooltip cột biểu đồ) |
| `input`, `label` | branches, teachers, classes (label), students, scoring, school-years, accounts, login, app-header |
| `select` | common, teachers, classes, students, scoring, summary, scores, accounts |
| `skeleton` | common |
| `sonner`, `tooltip` | `app/layout.tsx` |
| `table` | branches, teachers, classes, students, summary, school-years, scores, accounts |
| `textarea` | teachers, students |
| `separator` | Chưa có nơi dùng |

## Tầng dữ liệu

- `src/lib/api.ts`: `API_URL = NEXT_PUBLIC_API_URL ?? "http://localhost:3001"`. `api<T>` lỗi mạng → `ApiError(status 0)`; `!res.ok || !body.success` → `ApiError(message, status, errors)` (body không phải JSON → `"Lỗi <status>"`); trả `body.data as T`. Chế độ demo (`DEMO_MODE = NEXT_PUBLIC_DEMO_MODE === "true"`): không gọi BE; GET đọc `/demo-data/<demoFile(path)>` (file `{ status, body }`, query sắp xếp theo tên), thiếu file → `ApiError(404, "Bản demo chưa có dữ liệu…")`; `/auth/me` không đọc snapshot mà trả `DEMO_VIEWER` (`kind: "admin"`: thấy mọi trang và nút chức năng, không cần đăng nhập; ghi vẫn bị chặn 403 → toast); POST/PUT/DELETE → `ApiError(403)` nên `runMutation`/`ConfirmDelete` hiện toast lỗi. Token: `getToken`/`setToken`/`clearToken` (localStorage, bọc try/catch), không có token và không phải `/auth/login` → không gọi BE, `ApiError(401)` + `redirectToLogin()`; response 401 (trừ `/auth/login`) → xóa token + `window.location.replace("/dang-nhap")` (điều hướng cứng để bỏ cache SWR phiên cũ). `login(username, password)` → POST `/auth/login`, lưu token. `logout()` = xóa token + về `/dang-nhap` (BE không có API logout). 403 không xử lý riêng: ghi → toast `message` BE qua `runMutation`, đọc → `ErrorState`. `refreshAll = mutate(() => true)`. `apiDownload(path, fallbackName)`: tải file (GET kèm Bearer, không đọc JSON khi 2xx), tên file lấy từ `Content-Disposition` (`filename*` UTF-8 trước, rồi `filename`), tạo link blob để trình duyệt tải, trả tên file; lỗi BE (JSON) → `ApiError`, 401 → xóa token + về đăng nhập, `DEMO_MODE` → `ApiError(403)`. `errorMessage` ghép `errors[]` theo `message` (field `students[i].x` → tiền tố "Dòng i+1: "), `{ studentid, name? }` hoặc `{ teacherid, classname }`.
- `src/hooks/use-data.ts`:
  - `useStudents(scope)`: `StudentScope = { classid?, branchid?, gradeid? }`, key `/students` khi không lọc, ngược lại `/students?<toQuery>`. `useClass(id)` → `/classes/:id` (key `null` khi thiếu id). `useStudentPoints(studentid)` → `/points?studentid=`. `useClassPoints(classid)` → `/points?classid=` (mọi năm học, lọc ở client).
  - `useScorePeriods(schoolyearid)` → `/scores/periods?schoolyearid=`. `rankingQuery(schoolyearid, period, scope)` dựng query dùng chung cho `/scores/ranking` và `/scores/export`. `useRanking(schoolyearid, { type, value }, scope)` → `/scores/ranking?schoolyearid=&<week|month|semester|year>=&branchid=&gradeid=` (cả năm: `{ type: "year", value: "1" }`); `shouldRetryOnError` tắt với lỗi 4xx (409 là kết quả bình thường). `toQuery` nhận số hoặc chuỗi.
  - `useMe()` → `/auth/me` (không thử lại khi 401), dùng ở layout và mọi view cần quyền; `useAccounts()` → `/accounts` (chỉ admin).
  - `useArchivedClasses(enabled = true)` → `/classes?archived=true` (key `null` khi `enabled = false`).
  - Không tham số: `useBranches`, `useGrades`, `useTeachers`, `useClasses` (chỉ lớp đang học), `useSchoolYears`, `useCurrentWeek` (`shouldRetryOnError: false`, vì 404 ngoài năm học là trường hợp bình thường).
  - Có tham số (key `null` khi thiếu): `useWeeks(schoolyearid)`, `usePoints(weekid, classid)`, `useWeeklyScore(weekid, scope)`, `useSummaryScore(schoolyearid, fromweek?, toweek?, scope)`, `useClassScore(classid, schoolyearid)`. `ScoreScope = { branchid?, gradeid? }`; `toQuery` bỏ giá trị rỗng.
- `src/hooks/use-week-picker.ts`: `useWeekPicker()` chỉ lưu lựa chọn của người dùng. Năm học mặc định = năm của tuần hiện tại → năm mới nhất. Tuần mặc định = tuần hiện tại nếu thuộc năm đang xem → tuần đã bắt đầu gần nhất → tuần đầu. `error` bỏ qua lỗi của `/weeks/current`.
- `src/lib/format.ts`: `todayISO()` chỉ được gọi khi đã có dữ liệu API (trên trình duyệt); gọi lúc prerender sẽ lỗi build với `cacheComponents`.
- `src/lib/types.ts`: `Branch`, `Grade`, `Teacher`, `ClassItem` (`teacherid`/`teachername` nullable, `numstudents`, `archivedyearid`/`archivedyearname` null = đang học), `ClassDetail`, `GENDERS`/`Gender`, `Student`, `SchoolYear` (kèm `semester2_week`), `Promotion`, `CreatedSchoolYear` (`SchoolYear & { promotion }`), `Week`, `POINT_TYPES`/`PointType`, `PointStudent`, `Point` (kèm `students`, `accountid`, `accountusername`, `classteacherid`), `Score`, `WeeklyScore`, `SummaryRow`, `PeriodType` (`week` | `month` | `semester` | `year`), `PeriodWeek`, `PeriodRange`, `ScorePeriods`, `RankingRow`, `Ranking` (`period.value` null với cả năm, kèm `weekids`), `SummaryScore`, `ClassScore`, `Role`, `AccountKind`, `Account` (dùng cho cả `/auth/me` và `/accounts`), `LoginResult`, `FieldError`.
- `src/lib/auth.ts`: `KIND_LABELS`, `isAdmin(me)` (ẩn nút ghi ở branches/teachers/classes/students/school-years và `LockWeekButton`), `accountDisplay(me)`, `canScoreClass(me, classid)`, `canManagePoint(me, point)` — khớp bảng quyền trong `../BE/docs/fe-handoff-phan-quyen.md`.

## API backend

Base URL: `NEXT_PUBLIC_API_URL`. Mọi route bắt buộc `Authorization: Bearer <token>` trừ `GET /` và `POST /auth/login` (thiếu / hết hạn / tài khoản bị khóa hoặc xóa → 401). Route ghi cấu hình (branches, teachers, classes, students, school-years, weeks) chỉ admin, khác → 403. Token hết hạn sau 30 phút, chưa có refresh.

### Chung

```json
{ "success": true, "data": ..., "message": "..." }
{ "success": false, "message": "...", "errors": [...] }   // errors chỉ có khi BE truyền vào
```

- Mã HTTP: 200, 201 (tạo mới), 400, 401, 403, 404, 409, 500. Lỗi Postgres: `23505` → 409 "Dữ liệu bị trùng", `23503` → 409, `23514`/`22P02` → 400.
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
| GET | `/classes?branchid=&gradeid=&archived=` | — | `useClasses` (không query), `useArchivedClasses` (`archived=true`) | 200 `ClassItem[]`; `archived` mặc định `false` = lớp đang học, `true` = lớp ra trường (năm ra trường mới nhất trước), giá trị khác → 400. Sắp `numgrade` → `branchcode` → `seq`; kèm `numstudents`, `archivedyearid`, `archivedyearname`; `teacherid`/`teachername` có thể `null` (lớp ra trường luôn `null`) |
| GET | `/classes/:id` | — | `useClass` (classes-view, `ClassStudentsDialog`) | 200 `ClassItem & { students: Student[] }` (học sinh sắp theo id), lấy được cả lớp ra trường. Cờ đỏ với lớp không được phân công → `students: []` |
| POST | `/classes` | `{ gradeid, branchid, teacherIds[] }` | classes-view | 201 `ClassItem[]`. `teacherIds` không rỗng; phần tử `null` = lớp chưa có GVCN; GV khác null không trùng, cùng phân hiệu, chưa chủ nhiệm |
| PUT | `/classes/:id` | `{ teacherid }` | classes-view | 200; `teacherid: null` = bỏ GVCN; chọn lại GV hiện tại → không đổi |
| DELETE | `/classes/:id` | — | classes-view | 409 "Lớp {X} còn N học sinh, chuyển hoặc xóa học sinh trước" / "Lớp {X} đã có điểm thi đua, không thể xóa" |
| GET | `/students?classid=&branchid=&gradeid=` | — | `useStudents` | 200 `Student[]` (kèm `classname`, `gradeid`, `branchid`), sắp theo lớp → id; 400 id lọc sai. Cờ đỏ: `classid` lớp không được phân công → 403, không truyền `classid` → chỉ học sinh lớp được phân công. Không truyền `classid` thì bỏ học sinh lớp ra trường; truyền `classid` lớp ra trường vẫn xem được |
| GET | `/students/:id` | — | chưa dùng | 404 |
| POST | `/students` | `{ classid, students: [{ code, name, gender?, birthdate? }] }` | students-view | 201. `code` chữ/số 1–20, duy nhất (trùng trong request → 400 "Mã học sinh bị trùng", trùng DB → 409 "Dữ liệu bị trùng"); `name` ≤ 50; `gender` `'Nam'`/`'Nữ'`/null; `birthdate` `"YYYY-MM-DD"`/null. 400 `errors[{ field: "students[i].code", message }]`, 404 lớp |
| PUT | `/students/:id` | `{ code?, name?, gender?, birthdate?, classid? }` | students-view | Đổi `classid` = chuyển lớp; `null` xóa gender/birthdate. 400, 404, 409 trùng mã |
| DELETE | `/students/:id` | — | students-view | 404 · 409 "Học sinh X đã có trong N lượt chấm điểm, không thể xóa" |

### Năm học, tuần, lượt chấm

| Method | Path | Body / query | Nơi gọi FE | Ghi chú BE |
|---|---|---|---|---|
| GET | `/school-years` | — | `useSchoolYears` | 200 `SchoolYear[]` (kèm `numweeks`, `enddate`, `semester2_week` luôn là số, mặc định `CEIL(numweeks/2)+1`), mới nhất trước |
| GET | `/school-years/:id` | — | chưa dùng | 200 `SchoolYear & { weeks: Week[] }` |
| POST | `/school-years` | `{ name, startdate, numweeks, conduct_base?, study_base?, semester2_week?, grade6? }` | school-years-view | 201 `CreatedSchoolYear`. Chỉ tạo khi năm mới nhất đã kết thúc (409 "Năm học X chưa kết thúc (kết thúc ngày …)…") và `startdate` > `enddate` năm cũ (409). Cùng request tự lên lớp: khối 9 lưu trữ (bỏ GVCN, khóa tài khoản cờ đỏ của học sinh, bỏ phân công chấm), khối 6–8 lên một khối (giữ id, học sinh, GVCN), tạo lớp 6 mới chưa có GVCN; `promotion = { fromschoolyear, archived[{id,name}], promoted, created[{id,name}], deactivatedAccounts }` hoặc `null` (năm đầu tiên / năm cũ đã lên lớp). `grade6: [{ branchid, count: 0-30 }]` mỗi phân hiệu 1 lần (sai → 400 field `grade6`; `branchid` không tồn tại → 404), không gửi = như số lớp 6 năm cũ, phân hiệu không có trong mảng = không tạo. Không hoàn tác. `semester2_week` 2..numweeks, ngoài khoảng → 400 "Tuần bắt đầu học kỳ 2 phải từ 2 đến N". `name` `"YYYY-YYYY"` (năm sau = năm trước + 1), `startdate` `"YYYY-MM-DD"`, `numweeks` 1–60, điểm gốc 0–1000 (mặc định 100). Tự sinh tuần, mỗi tuần 7 ngày. 409 trùng tên / "Thời gian bị trùng với năm học X" |
| PUT | `/school-years/:id` | `{ name?, numweeks?, semester2_week? }` | school-years-view | `semester2_week: null` = về mặc định; 400 khi ngoài 2..numweeks (kể cả khi giảm numweeks). Tăng: sinh thêm tuần (điểm gốc theo tuần cuối). Giảm: xóa các tuần cuối, 409 nếu các tuần đó đã có điểm |
| DELETE | `/school-years/:id` | — | school-years-view | 409 "Năm học X đã có điểm thi đua, không thể xóa" / "Năm học X có N lớp ra trường được lưu trữ, không thể xóa". Xóa năm mới không đưa lớp về khối cũ |
| GET | `/weeks?schoolyearid=` | — | `useWeeks` | 200 `Week[]` theo ngày, kèm `schoolyearname`, `entries` |
| GET | `/weeks/current` | — | `useCurrentWeek` | Tuần chứa hôm nay · 404 "Hôm nay không thuộc tuần nào" |
| GET | `/weeks/:id` | — | chưa dùng | |
| PUT | `/weeks/:id` | `{ conduct_base?, study_base?, locked?, applyToNext? }` | `LockWeekButton`, `EditWeekBaseDialog` | `applyToNext` áp điểm gốc cho các tuần sau chưa khóa. Tuần khóa chỉ đổi gốc được khi gửi kèm `locked: false`, không thì 409. Không có POST/DELETE tuần |
| GET | `/points?weekid=&classid=&type=&studentid=` | — | `usePoints` (weekid + classid), `useStudentPoints` (studentid), `useClassPoints` (classid) | 200 `Point[]` kèm `classname`, `numweek`, `schoolyearid`, `locked`, `students: { id, code, name }[]` (luôn là mảng), `accountid`, `accountusername` (null = nhập trước khi có đăng nhập / tài khoản đã xóa), `classteacherid`; sắp theo tuần → lớp → id. `studentid` = lượt chấm có gắn học sinh đó |
| GET | `/points/:id` | — | chưa dùng | |
| POST | `/points` | `{ weekid, classid, type, content, value, studentIds? }` | scoring-view | 201. Ghi `accountid` = người nhập. 403 lớp không được chấm (admin mọi lớp · codo lớp được phân công, không phải lớp mình · gvcn luôn 403 "Giáo viên chủ nhiệm chỉ được xem, không được chấm điểm"), kiểm tra trước 409 tuần khóa. `studentIds` mảng id không trùng (400 field `studentIds`), học sinh phải thuộc lớp (400 "Học sinh không thuộc lớp của lượt chấm" `errors[{ studentid, name }]`), 404 "Không tìm thấy học sinh" `errors[{ studentid }]`. `type` `'Nề nếp'`/`'Học tập'`; `content` trim 1–255; `value` số nguyên ≠ 0, −1000..1000. 404 tuần/lớp · 409 "Tuần {n} đã khóa, không thể sửa điểm" |
| PUT | `/points/:id` | `{ type?, content?, value?, studentIds? }` | scoring-view | 403: admin mọi lượt · codo chỉ lượt mình nhập ở lớp còn được phân công · gvcn luôn 403. Không đổi được tuần/lớp · 409 tuần khóa. `studentIds`: bỏ trường = giữ nguyên, mảng = thay toàn bộ, `[]` = bỏ hết; chỉ kiểm tra lớp với học sinh mới gắn |
| DELETE | `/points/:id` | — | scoring-view | Quyền như PUT (403) · 409 tuần khóa |

### Đăng nhập và tài khoản

| Method | Path | Body / query | Nơi gọi FE | Ghi chú BE |
|---|---|---|---|---|
| POST | `/auth/login` | `{ username, password }` | `login()` (login-view) | 200 `{ token, account: Account }`. 400 thiếu dữ liệu · 401 "Sai tài khoản hoặc mật khẩu" · 403 "Tài khoản đã bị khóa". Public |
| GET | `/auth/me` | — | `useMe` | 200 `Account` (`kind`, `teachername`, `homeroomclassid/name`, `studentname/code`, `studentclassid/name`, `classes[]`). Đã đối chiếu bằng GET tới BE local với admin, gvcn.6a1, codo.duc (2026-11-04) |
| PUT | `/auth/password` | `{ oldPassword, newPassword }` | app-header (`ChangePasswordDialog`) | 400 mật khẩu cũ sai / mới không hợp lệ (6 ký tự – 72 byte) / trùng cũ |
| GET | `/accounts?role=&active=` | — | `useAccounts` (FE không truyền query) | 200 `Account[]`. Chỉ admin |
| GET | `/accounts/:id` | — | chưa dùng | 404 |
| POST | `/accounts` | `{ username, password, role, teacherid?, studentid? }` | accounts-view | 201. admin: `teacherid` tùy chọn; user: đúng 1 trong `teacherid` / `studentid`. 400 · 404 GV/HS · 409 trùng username / GV hoặc HS đã có tài khoản |
| PUT | `/accounts/:id` | `{ username?, password?, active? }` | accounts-view | Không đổi role / người gắn (400). 409 trùng username / tự khóa / khóa admin hoạt động cuối |
| DELETE | `/accounts/:id` | — | accounts-view | Lượt chấm giữ lại (`accountid` → null). 409 tự xóa / xóa admin hoạt động cuối |
| PUT | `/accounts/:id/classes` | `{ classIds: number[] }` | accounts-view (`AssignClassesDialog`) | Thay toàn bộ lớp cờ đỏ chấm (`[]` = bỏ hết). 400 không phải cờ đỏ / có lớp của chính em đó · 404 |

### Bảng điểm (chỉ đọc)

| Method | Path | Nơi gọi FE | Response |
|---|---|---|---|
| GET | `/scores/weekly?weekid=&branchid=&gradeid=` | `useWeeklyScore` (scoring, overview; FE chỉ gọi không lọc) | `{ week, scores: Score[] }` sắp theo `rank`; `rank` tính trong phạm vi lọc |
| GET | `/scores/summary?schoolyearid=&fromweek=&toweek=&branchid=&gradeid=` | `useSummaryScore` | `{ schoolyear, fromweek, toweek, scores: SummaryRow[] }`. Mặc định `fromweek = 1`, `toweek` = tuần đã bắt đầu gần nhất · 400 "fromweek phải nhỏ hơn hoặc bằng toweek" |
| GET | `/scores/periods?schoolyearid=` | `useScorePeriods` | `{ schoolyear, weeks: PeriodWeek[], months: PeriodRange<"YYYY-MM">[], semesters: PeriodRange<1\|2>[] }`. Tuần thuộc tháng chứa thứ Năm của tuần; `started` = tuần đã bắt đầu · 400 / 404 năm học |
| GET | `/scores/ranking?schoolyearid=&week=\|month=\|semester=\|year=&branchid=&gradeid=` | `useRanking` | Đúng 1 trong `week` (numweek 1–60, không phải weekid), `month` (`YYYY-MM`), `semester` (1\|2), `year` (`1` = cả năm học: `period.value = null`, label "Năm học X"); sai → 400 "Chọn đúng 1 trong week, month, semester, year". `{ schoolyear, period: { type, value, label, fromweek, toweek, startdate, enddate, numweeks, countedweeks, weekids[] }, scores: RankingRow[] }` sắp theo `rank` (theo `total`, RANK); chỉ tính tuần đã bắt đầu. 400 query sai · 404 năm học / khoảng không thuộc năm học · 409 "<Khoảng> chưa bắt đầu, chưa có điểm để xếp hạng" |
| GET | `/scores/export?<query như /scores/ranking>` | `apiDownload` (summary-view `ExportButton`) | 200 file `.xlsx`; `Content-Disposition: attachment; filename="diem-thi-dua_<năm học>_<tuan-8\|thang-2026-10\|hoc-ky-1\|ca-nam>[_phan-hieu-A][_khoi-6].xlsx"` kèm `filename*` UTF-8 (BE expose header qua CORS). Số liệu giống `/scores/ranking` (sắp theo hạng, chỉ tuần đã bắt đầu); file tuần có cột chi tiết cộng/trừ, không kèm tên học sinh. Lỗi vẫn JSON: 400 query sai · 404 năm học / khoảng / phân hiệu / khối · 409 khoảng chưa bắt đầu. Quyền: admin, user |
| GET | `/scores/class/:classid?schoolyearid=` | `useClassScore` | `{ class, schoolyear, weeks: (Score & { startdate, enddate })[] }` cho mọi tuần của năm; `rank` = hạng toàn trường của tuần đó |

### Nghiệp vụ ảnh hưởng UI

- Điểm phần = điểm gốc của tuần + Σ `value`; `total` = Nề nếp + Học tập; `*_plus`/`*_minus` là tổng cộng/tổng trừ (số dương). Xếp hạng dùng RANK (cùng điểm cùng hạng). FE không tự tính lại điểm.
- Tuần `locked`: không thêm/sửa/xóa lượt chấm, không đổi điểm gốc.
- Tên lớp (`6A1`) do BE tính; một GV chủ nhiệm tối đa một lớp, cùng phân hiệu. Lớp có thể chưa có GVCN (`teacherid` null, kể cả trong `/scores/*`). Quyền đã triển khai (BE 2026-11-04): `admin` sửa mọi thứ; `gvcn` (role `user` + `teacherid`) xem mọi trang, không chấm điểm (đổi 2026-11-04, trước đó chấm lớp chủ nhiệm); `codo` (role `user` + `studentid`, học sinh cờ đỏ) chấm lớp được phân công, FE chỉ cho vào Tổng quan + Chấm điểm (BE không chặn cờ đỏ đọc xếp hạng).

### Chưa có (⬜)

- Refresh token: BE chưa có, hết 30 phút phải đăng nhập lại.
- Tạo nhiều lượt chấm một lần: BE chưa có, có thể đề xuất nếu cần.

## Cấu hình và kiểm tra

- Biến môi trường: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEMO_MODE`; `SNAPSHOT_USERNAME`, `SNAPSHOT_PASSWORD` (chỉ cho script snapshot, tài khoản admin) (`.env.example`).
- `npm run snapshot:demo` (`scripts/snapshot-demo.mjs`): đăng nhập POST `/auth/login` bằng `SNAPSHOT_USERNAME`/`SNAPSHOT_PASSWORD` (bắt buộc admin), gửi Bearer token; không chụp `/auth/me` (bản demo dùng `DEMO_VIEWER`); có chụp `/accounts` cho trang Tài khoản (lộ tên đăng nhập, không có mật khẩu). Gọi GET theo các key SWR của `use-data.ts` (mọi tuần × phạm vi lọc, lượt chấm mọi tuần × lớp, điểm lớp theo năm, tổng hợp mặc định + mọi khoảng tuần đến `toweek` mặc định của BE, học sinh theo phạm vi lọc và theo lớp, `/classes/:id`, `/points?studentid=` của mọi học sinh, `/points?classid=` của mọi lớp, `/scores/periods` và `/scores/ranking` mọi khoảng đã bắt đầu × phạm vi lọc) và ghi lại `public/demo-data/`. Cần chạy lại khi dữ liệu BE hoặc key SWR thay đổi; Đã chụp lại 2026-11-04 bằng admin (5583 file, mọi response 200, có `accounts.json` và `accountusername` trong lượt chấm).
- BE cổng 3001, CORS `credentials: true`; chỉ `http://localhost:3000` được phép (chuỗi `'*'` trong allowlist không có tác dụng wildcard).
- Dữ liệu DB dev (theo BE, 2026-11-03): 2 phân hiệu, 4 khối, 20 GV (chưa chủ nhiệm lớp nào), 55 lớp (6A1–9B6) đều chưa có GVCN, 2493 học sinh; lượt chấm cũ đã bị xóa. Đây là dữ liệu test, không phải contract.
- Script: `npm run dev`, `npm run build`, `npm start`, `npm run lint`. Không có script test/typecheck riêng.
