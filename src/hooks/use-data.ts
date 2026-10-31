"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/api"
import type {
  Branch,
  ClassItem,
  ClassScore,
  Grade,
  Point,
  SchoolYear,
  SummaryScore,
  Teacher,
  Week,
  WeeklyScore,
} from "@/lib/types"

// Dữ liệu nhỏ (vài chục bản ghi) nên tải toàn bộ, lọc ở client
export const useBranches = () => useSWR<Branch[]>("/branches", fetcher)
export const useGrades = () => useSWR<Grade[]>("/grades", fetcher)
export const useTeachers = () => useSWR<Teacher[]>("/teachers", fetcher)
export const useClasses = () => useSWR<ClassItem[]>("/classes", fetcher)

export const useSchoolYears = () => useSWR<SchoolYear[]>("/school-years", fetcher)

// Key null khi chưa chọn đủ tham số: SWR không gọi API
export const useWeeks = (schoolyearid?: number) =>
  useSWR<Week[]>(schoolyearid ? `/weeks?schoolyearid=${schoolyearid}` : null, fetcher)

// 404 khi hôm nay không thuộc tuần nào, không cần thử lại
export const useCurrentWeek = () => useSWR<Week>("/weeks/current", fetcher, { shouldRetryOnError: false })

export const usePoints = (weekid?: number, classid?: number) =>
  useSWR<Point[]>(weekid && classid ? `/points?weekid=${weekid}&classid=${classid}` : null, fetcher)

// Bỏ tham số rỗng; thứ tự cố định để key SWR ổn định
const toQuery = (params: Record<string, number | undefined>) => {
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

export const useClassScore = (classid?: number, schoolyearid?: number) =>
  useSWR<ClassScore>(classid && schoolyearid ? `/scores/class/${classid}?schoolyearid=${schoolyearid}` : null, fetcher)
