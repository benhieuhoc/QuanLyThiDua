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
export type PeriodType = "week" | "month" | "semester"

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
    value: number | string
    label: string
    fromweek: number
    toweek: number
    startdate: string
    enddate: string
    numweeks: number
    countedweeks: number
  }
  scores: RankingRow[]
}

export type SummaryScore = { schoolyear: SchoolYear; fromweek: number; toweek: number; scores: SummaryRow[] }

// rank của từng tuần là hạng toàn trường
export type ClassScore = {
  class: ClassItem
  schoolyear: SchoolYear
  weeks: (Score & { startdate: string; enddate: string })[]
}

export type FieldError ={ field?: string; message: string; [key: string]: unknown }
