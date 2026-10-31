"use client"

import { useState } from "react"
import { todayISO } from "@/lib/format"
import type { Week } from "@/lib/types"
import { useCurrentWeek, useSchoolYears, useWeeks } from "./use-data"

// Tuần mặc định: tuần hiện tại nếu thuộc năm đang xem, không thì tuần đã bắt đầu gần nhất, cuối cùng là tuần 1
function defaultWeek(weeks: Week[], current?: Week) {
  if (current && weeks.some((w) => w.id === current.id)) return current
  const today = todayISO()
  return weeks.filter((w) => w.startdate <= today).at(-1) ?? weeks[0]
}

// Chọn năm học + tuần dùng chung cho các trang thi đua. State chỉ lưu lựa chọn của người dùng,
// giá trị mặc định tính từ dữ liệu khi render
export function useWeekPicker() {
  const schoolYears = useSchoolYears()
  const current = useCurrentWeek()
  const [yearId, setYearId] = useState<number>()
  const [weekId, setWeekId] = useState<number>()

  const schoolyearid = yearId ?? current.data?.schoolyearid ?? schoolYears.data?.[0]?.id
  const weeks = useWeeks(schoolyearid)
  const week = weeks.data?.find((w) => w.id === weekId) ?? (weeks.data ? defaultWeek(weeks.data, current.data) : undefined)

  return {
    schoolYears,
    weeks,
    schoolyearid,
    week,
    // Lỗi của /weeks/current (404 ngoài năm học) không tính là lỗi trang
    error: schoolYears.error ?? weeks.error,
    isLoading: schoolYears.isLoading || (current.isLoading && !yearId) || weeks.isLoading,
    setSchoolYear: (id: number) => {
      setYearId(id)
      setWeekId(undefined)
    },
    setWeek: setWeekId,
  }
}

export type WeekPicker = ReturnType<typeof useWeekPicker>
