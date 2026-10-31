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

// Lấy từ class_view
export type ClassItem = {
  id: number
  seq: number
  gradeid: number
  branchid: number
  teacherid: number
  numgrade: number
  branchcode: string
  branchname: string
  teachername: string
  name: string
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
  teacherid: number
  teachername: string
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
  teacherid: number
  teachername: string
  weeks: number
  conduct_score: number
  study_score: number
  total: number
  avg_total: number
  rank: number
}

export type SummaryScore = { schoolyear: SchoolYear; fromweek: number; toweek: number; scores: SummaryRow[] }

// rank của từng tuần là hạng toàn trường
export type ClassScore = {
  class: ClassItem
  schoolyear: SchoolYear
  weeks: (Score & { startdate: string; enddate: string })[]
}

export type FieldError ={ field?: string; message: string; [key: string]: unknown }
