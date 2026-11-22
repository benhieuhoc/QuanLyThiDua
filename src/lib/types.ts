// Kiểu dữ liệu trả về từ BE (xem BE/docs/logic-trien-khai.md)

export type Branch = {
  id: number
  name: string
  code: string
  created_at: string
  updated_at: string
}

export type Grade = {
  id: number
  numgrade: number
}

export type Teacher = {
  id: number
  name: string
  branchid: number
  // Lớp chủ nhiệm, null nếu chưa chủ nhiệm (chỉ có trong GET /teachers)
  classid: number | null
  classname: string | null
  created_at: string
  updated_at: string
}

// Lấy từ class_view; teacherid/teachername null khi lớp chưa có GVCN
export type ClassItem = {
  id: number
  seq: number
  gradeid: number
  branchid: number
  teacherid: number | null
  numgrade: number
  branchcode: string
  branchname: string
  teachername: string | null
  name: string
  // Sĩ số
  numstudents: number
  // Lớp đã ra trường (lưu trữ khi lên lớp): năm học ra trường; null = đang học.
  // Lớp lưu trữ chỉ để xem, BE trả 409 với mọi thao tác ghi
  archivedyearid: number | null
  archivedyearname: string | null
  // Mã ngẫu nhiên 16 ký tự hex của trang công khai (không dùng id để không dò được lớp khác);
  // giữ nguyên khi lên lớp, chỉ đổi khi admin tạo mã mới (PUT /classes/:id/qrcode)
  qrcode: string
  // Đường dẫn trang công khai của lớp cho phụ huynh: "/LopHoc/<qrcode>"
  BaseQRCode: string
  created_at: string
  updated_at: string
}

export type ClassDetail = ClassItem & { students: Student[] }

export const GENDERS = ["Nam", "Nữ"] as const
export type Gender = (typeof GENDERS)[number]

// code: mã học sinh, chữ/số, duy nhất toàn trường
export type Student = {
  id: number
  code: string
  name: string
  gender: Gender | null
  birthdate: string | null
  classid: number
  classname: string
  gradeid: number
  branchid: number
  created_at: string
  updated_at: string
}

// Cột date của BE trả dạng "YYYY-MM-DD"

export type SchoolYear = {
  id: number
  name: string
  startdate: string
  enddate: string
  numweeks: number
  // Tuần bắt đầu học kỳ 2; BE luôn trả số (chưa đặt thì mặc định CEIL(numweeks/2)+1)
  semester2_week: number
  created_at: string
  updated_at: string
}

// Kết quả lên lớp khi tạo năm học mới (POST /school-years); tên lớp là tên lúc lên lớp
export type Promotion = {
  fromschoolyear: string
  archived: { id: number; name: string }[]
  promoted: number
  created: { id: number; name: string }[]
  deactivatedAccounts: number
}

// promotion null: năm học đầu tiên, hoặc năm cũ đã lên lớp rồi
export type CreatedSchoolYear = SchoolYear & { promotion: Promotion | null }

export type Week = {
  id: number
  schoolyearid: number
  numweek: number
  startdate: string
  enddate: string
  conduct_base: number
  study_base: number
  locked: boolean
  schoolyearname: string
  // Số lượt chấm điểm trong tuần
  entries: number
  created_at: string
  updated_at: string
}

export const POINT_TYPES = ["Nề nếp", "Học tập"] as const
export type PointType = (typeof POINT_TYPES)[number]

// Học sinh được gắn vào lượt chấm (vd. học sinh vi phạm)
export type PointStudent = { id: number; code: string; name: string }

// Lượt cộng/trừ điểm: value âm = trừ, dương = cộng
export type Point = {
  id: number
  weekid: number
  classid: number
  type: PointType
  content: string
  value: number
  classname: string
  numweek: number
  schoolyearid: number
  locked: boolean
  // Luôn là mảng, rỗng nếu không gắn học sinh
  students: PointStudent[]
  // Tài khoản nhập; null khi nhập trước khi có đăng nhập hoặc tài khoản đã bị xóa
  accountid: number | null
  accountusername: string | null
  // GVCN của lớp
  classteacherid: number | null
  // Mục quy chế đã chọn (rulecontent: nội dung hiện tại của mục); null = nhập tự do (dữ liệu cũ)
  ruleid: number | null
  rulecontent: string | null
  // Ngày diễn ra "YYYY-MM-DD", luôn nằm trong tuần
  pointdate: string
  // Thời điểm nhập theo giờ Việt Nam ("YYYY-MM-DD", "HH:mm"); lượt nhập trước 2026-11-17 có enteredtime "00:00"
  entereddate: string
  enteredtime: string
  // Riêng bảng point: chuỗi ISO UTC có giờ, không dùng để hiển thị (dùng entereddate/enteredtime)
  created_at: string
  updated_at: string
}

// Mục quy chế thi đua: value là điểm cho 1 lần (âm = trừ, dương = cộng), nguyên ≠ 0 trong -1000..1000.
// active false = ngừng áp dụng; uses = số lượt chấm đang gắn mục (uses > 0 thì không xóa được)
export type Rule = {
  id: number
  type: PointType
  content: string
  value: number
  active: boolean
  uses: number
  created_at: string
  updated_at: string
}

// Điểm 1 lớp trong 1 tuần (score_view); *_minus là số dương
export type Score = {
  weekid: number
  schoolyearid: number
  numweek: number
  locked: boolean
  classid: number
  classname: string
  gradeid: number
  numgrade: number
  branchid: number
  branchcode: string
  seq: number
  teacherid: number | null
  teachername: string | null
  conduct_base: number
  conduct_plus: number
  conduct_minus: number
  conduct_score: number
  study_base: number
  study_plus: number
  study_minus: number
  study_score: number
  total: number
  entries: number
  rank: number
}

export type WeeklyScore = { week: Week; scores: Score[] }

export type SummaryRow = {
  classid: number
  classname: string
  gradeid: number
  numgrade: number
  branchid: number
  branchcode: string
  seq: number
  teacherid: number | null
  teachername: string | null
  weeks: number
  conduct_score: number
  study_score: number
  total: number
  avg_total: number
  rank: number
}

// Xếp hạng theo tuần / tháng / học kỳ (GET /scores/periods, /scores/ranking)
// year: cả năm học (gửi year=1)
export type PeriodType = "week" | "month" | "semester" | "year"

// Tuần thuộc tháng chứa thứ Năm của tuần; started = tuần đã bắt đầu
export type PeriodWeek = {
  id: number
  numweek: number
  startdate: string
  enddate: string
  locked: boolean
  month: string
  semester: 1 | 2
  started: boolean
}

// value: "YYYY-MM" với tháng, 1 | 2 với học kỳ
export type PeriodRange<V extends string | number> = {
  value: V
  label: string
  fromweek: number
  toweek: number
  startdate: string
  enddate: string
}

export type ScorePeriods = {
  schoolyear: SchoolYear
  weeks: PeriodWeek[]
  months: PeriodRange<string>[]
  semesters: PeriodRange<number>[]
}

export type RankingRow = SummaryRow & {
  conduct_plus: number
  conduct_minus: number
  study_plus: number
  study_minus: number
  entries: number
}

// Chỉ tính tuần đã bắt đầu: countedweeks < numweeks khi khoảng đang diễn ra
export type Ranking = {
  schoolyear: SchoolYear
  period: {
    type: PeriodType
    // null với cả năm học
    value: number | string | null
    label: string
    fromweek: number
    toweek: number
    startdate: string
    enddate: string
    numweeks: number
    countedweeks: number
    // id các tuần thuộc khoảng (kể cả tuần chưa bắt đầu)
    weekids: number[]
  }
  scores: RankingRow[]
}

// Trang tổng quan công khai (khách chưa đăng nhập): GET /public/meta, /public/scores/periods, /public/scores/ranking.
// Số liệu giống /scores/periods, /scores/ranking; năm học chỉ có cột công khai, dòng xếp hạng không có teacherid
export type PublicSchoolYearInfo = Omit<SchoolYear, "created_at" | "updated_at">

export type PublicMeta = {
  // Mới nhất trước
  schoolyears: PublicSchoolYearInfo[]
  // null: hôm nay ngoài mọi tuần
  currentweek: {
    id: number
    schoolyearid: number
    schoolyearname: string
    numweek: number
    startdate: string
    enddate: string
    locked: boolean
  } | null
  branches: Pick<Branch, "id" | "name" | "code">[]
  grades: Grade[]
}

export type PublicScorePeriods = Omit<ScorePeriods, "schoolyear"> & { schoolyear: PublicSchoolYearInfo }

export type PublicRanking = Omit<Ranking, "schoolyear" | "scores"> & {
  schoolyear: PublicSchoolYearInfo
  scores: Omit<RankingRow, "teacherid">[]
}

export type SummaryScore = { schoolyear: SchoolYear; fromweek: number; toweek: number; scores: SummaryRow[] }

// rank của từng tuần là hạng toàn trường
export type ClassScore = {
  class: ClassItem
  schoolyear: SchoolYear
  weeks: (Score & { startdate: string; enddate: string })[]
}

// Tài khoản (GET /auth/me, GET /accounts). role "user" gồm GVCN (gắn teacherid) và cờ đỏ (gắn studentid)
export type Role = "admin" | "user"
export type AccountKind = "admin" | "gvcn" | "codo"

export type Account = {
  id: number
  username: string
  role: Role
  kind: AccountKind
  active: boolean
  // Admin / GVCN
  teacherid: number | null
  teachername: string | null
  // GVCN: lớp chủ nhiệm, null nếu chưa được phân lớp
  homeroomclassid: number | null
  homeroomclassname: string | null
  // Cờ đỏ
  studentid: number | null
  studentcode: string | null
  studentname: string | null
  // Cờ đỏ: lớp của chính em đó (không được chấm)
  studentclassid: number | null
  studentclassname: string | null
  // Cờ đỏ: lớp được phân công chấm; [] với admin / GVCN
  classes: { id: number; name: string }[]
  created_at: string
  updated_at: string
}

export type LoginResult = { token: string; account: Account }

// Phụ huynh (bảng parent của BE, không phải tài khoản giáo viên): mỗi bản ghi là cha hoặc mẹ của 1 học sinh.
// Lớp suy từ lớp hiện tại của học sinh. GET /parents (chỉ admin), không bao giờ có password
export type ParentRelation = "Cha" | "Mẹ"

export type Parent = {
  id: number
  name: string
  relation: ParentRelation
  studentid: number
  // null: chưa có tài khoản đăng nhập
  username: string | null
  hasaccount: boolean
  active: boolean
  created_at: string
  updated_at: string
  studentcode: string
  studentname: string
  classid: number
  classname: string
  gradeid: number
  branchid: number
  archivedyearid: number | null
}

// GET /auth/parent/me (token phụ huynh)
export type ParentMe = {
  id: number
  name: string
  relation: ParentRelation
  username: string
  studentid: number
  studentcode: string
  studentname: string
  studentgender: Gender | null
  studentbirthdate: string | null
  classid: number
  classname: string
  numgrade: number
  branchcode: string
  branchname: string
  teachername: string | null
  archivedyearid: number | null
  // "/LopHoc/<qrcode>": trang lớp công khai của con
  BaseQRCode: string
}

export type ParentLoginResult = { token: string; parent: ParentMe }

// GET /auth/parent/points?schoolyearid= (token phụ huynh): lượt chấm có gắn con trong 1 năm học, mới nhất trước.
// value là điểm của cả lượt (lượt có thể gắn nhiều học sinh); classname là tên lớp lúc chấm
export type ParentPoint = {
  id: number
  weekid: number
  numweek: number
  locked: boolean
  type: PointType
  content: string
  value: number
  pointdate: string
  classid: number
  classname: string
}

export type ParentPoints = {
  // null: chưa có năm học nào (points = [], summary toàn 0)
  schoolyear: { id: number; name: string; startdate: string; enddate: string } | null
  points: ParentPoint[]
  // minus là số dương; total = plus - minus
  summary: { count: number; plus: number; minus: number; total: number }
}

// GET /public/classes/:qrcode?schoolyearid= (không cần đăng nhập): trang lớp cho phụ huynh quét mã QR.
// Chỉ có thông tin lớp và kết quả thi đua, không có học sinh hay người chấm
export type PublicSchoolYear = {
  id: number
  name: string
  startdate: string
  enddate: string
  // Tên lớp ở năm học đó (lớp đã lên lớp có tên khác ở năm cũ)
  classname: string
  started: boolean
}

export type PublicWeek = {
  weekid: number
  numweek: number
  startdate: string
  enddate: string
  locked: boolean
  classname: string
  teachername: string | null
  conduct_base: number
  conduct_plus: number
  conduct_minus: number
  conduct_score: number
  study_base: number
  study_plus: number
  study_minus: number
  study_score: number
  total: number
  entries: number
  // Hạng toàn trường: rank / numclasses
  rank: number
  numclasses: number
  // students: tên học sinh được gắn vào lượt chấm (chỉ có tên), [] nếu không gắn ai
  // pointdate: ngày diễn ra "YYYY-MM-DD" (không có giờ nhập)
  points: { type: PointType; content: string; value: number; pointdate: string; students: { name: string }[] }[]
}

export type PublicClassPage = {
  class: Pick<
    ClassItem,
    | "id"
    | "name"
    | "numgrade"
    | "branchcode"
    | "branchname"
    | "teachername"
    | "numstudents"
    | "archivedyearid"
    | "archivedyearname"
    | "BaseQRCode"
  >
  // Mới nhất trước
  schoolyears: PublicSchoolYear[]
  // null: lớp chưa có năm học nào (weeks = [])
  schoolyear: PublicSchoolYear | null
  // Chỉ tuần đã bắt đầu, mới nhất trước
  weeks: PublicWeek[]
}

export type FieldError ={ field?: string; message: string; [key: string]: unknown }
