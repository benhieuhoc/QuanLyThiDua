"use client"

import useSWR from "swr"
import { ApiError, fetcher } from "@/lib/api"
import type {
  Account,
  Branch,
  ClassDetail,
  ClassItem,
  ClassScore,
  Grade,
  PeriodType,
  Point,
  Ranking,
  SchoolYear,
  ScorePeriods,
  Student,
  SummaryScore,
  Teacher,
  Week,
  WeeklyScore,
} from "@/lib/types"

// Tài khoản đang đăng nhập; 401 đã được api() chuyển về trang đăng nhập nên không thử lại
export const useMe = () =>
  useSWR<Account>("/auth/me", fetcher, {
    shouldRetryOnError: (err) => !(err instanceof ApiError && err.status === 401),
  })

// Chỉ admin gọi được (BE trả 403 với tài khoản khác)
export const useAccounts = () => useSWR<Account[]>("/accounts", fetcher)

// Dữ liệu nhỏ (vài chục bản ghi) nên tải toàn bộ, lọc ở client
export const useBranches = () => useSWR<Branch[]>("/branches", fetcher)
export const useGrades = () => useSWR<Grade[]>("/grades", fetcher)
export const useTeachers = () => useSWR<Teacher[]>("/teachers", fetcher)
// Mặc định BE chỉ trả lớp đang học
export const useClasses = () => useSWR<ClassItem[]>("/classes", fetcher)
// Lớp đã ra trường, năm ra trường mới nhất trước; key null khi chưa cần xem
export const useArchivedClasses = (enabled = true) =>
  useSWR<ClassItem[]>(enabled ? "/classes?archived=true" : null, fetcher)

export const useClass = (id?: number) => useSWR<ClassDetail>(id ? `/classes/${id}` : null, fetcher)

export const useSchoolYears = () => useSWR<SchoolYear[]>("/school-years", fetcher)

// Key null khi chưa chọn đủ tham số: SWR không gọi API
export const useWeeks = (schoolyearid?: number) =>
  useSWR<Week[]>(schoolyearid ? `/weeks?schoolyearid=${schoolyearid}` : null, fetcher)

// 404 khi hôm nay không thuộc tuần nào, không cần thử lại
export const useCurrentWeek = () => useSWR<Week>("/weeks/current", fetcher, { shouldRetryOnError: false })

export const usePoints = (weekid?: number, classid?: number) =>
  useSWR<Point[]>(weekid && classid ? `/points?weekid=${weekid}&classid=${classid}` : null, fetcher)

// Mọi lượt chấm của 1 lớp (mọi năm học); trang Điểm lớp lọc theo năm học/khoảng tuần ở client
export const useClassPoints = (classid?: number) =>
  useSWR<Point[]>(classid ? `/points?classid=${classid}` : null, fetcher)

// Lịch sử các lượt chấm có gắn 1 học sinh
export const useStudentPoints = (studentid?: number) =>
  useSWR<Point[]>(studentid ? `/points?studentid=${studentid}` : null, fetcher)

// Bỏ tham số rỗng; thứ tự cố định để key SWR ổn định
const toQuery = (params: Record<string, number | string | undefined>) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, String(value))
  return query.toString()
}

// Lọc phân hiệu/khối ở BE vì rank được tính trong phạm vi lọc
export type ScoreScope = { branchid?: number; gradeid?: number }

export const useWeeklyScore = (weekid?: number, scope: ScoreScope = {}) =>
  useSWR<WeeklyScore>(weekid ? `/scores/weekly?${toQuery({ weekid, ...scope })}` : null, fetcher)

export const useSummaryScore = (schoolyearid?: number, fromweek?: number, toweek?: number, scope: ScoreScope = {}) =>
  useSWR<SummaryScore>(
    schoolyearid ? `/scores/summary?${toQuery({ schoolyearid, fromweek, toweek, ...scope })}` : null,
    fetcher
  )

export const useScorePeriods = (schoolyearid?: number) =>
  useSWR<ScorePeriods>(schoolyearid ? `/scores/periods?schoolyearid=${schoolyearid}` : null, fetcher)

// Cả năm học: { type: "year", value: 1 }
export type RankingPeriod = { type: PeriodType; value: number | string }

// Query dùng chung cho /scores/ranking và /scores/export (xuất Excel đúng bộ lọc đang xem)
export const rankingQuery = (schoolyearid: number, period: RankingPeriod, scope: ScoreScope = {}) =>
  toQuery({ schoolyearid, [period.type]: period.value, ...scope })

// 409 (khoảng chưa bắt đầu) và lỗi 4xx khác là kết quả xác định, không cần thử lại
export const useRanking = (schoolyearid?: number, period?: RankingPeriod, scope: ScoreScope = {}) =>
  useSWR<Ranking>(
    schoolyearid && period ? `/scores/ranking?${rankingQuery(schoolyearid, period, scope)}` : null,
    fetcher,
    { shouldRetryOnError: (err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) }
  )

export const useClassScore = (classid?: number, schoolyearid?: number) =>
  useSWR<ClassScore>(classid && schoolyearid ? `/scores/class/${classid}?schoolyearid=${schoolyearid}` : null, fetcher)

// Toàn trường khoảng 2500 học sinh nên lọc ở BE
export type StudentScope = { classid?: number; branchid?: number; gradeid?: number }

export const useStudents = (scope: StudentScope = {}) => {
  const query = toQuery(scope)
  return useSWR<Student[]>(query ? `/students?${query}` : "/students", fetcher)
}
