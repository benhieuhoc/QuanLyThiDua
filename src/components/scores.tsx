"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Lock, LockOpen } from "lucide-react"
import { apiPut } from "@/lib/api"
import { isAdmin } from "@/lib/auth"
import { formatDate, formatRange, formatSigned, todayISO } from "@/lib/format"
import type { Week } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useBranches, useClassScore, useGrades, useMe, type ScoreScope } from "@/hooks/use-data"
import type { WeekPicker } from "@/hooks/use-week-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, ErrorState, TableSkeleton, runMutation } from "@/components/common"

// Thành phần dùng chung giữa các trang thi đua (chấm điểm, bảng điểm tuần, tổng hợp, năm học)

export function SchoolYearSelect({ picker, className }: { picker: WeekPicker; className?: string }) {
  return (
    <Select
      value={picker.schoolyearid ? String(picker.schoolyearid) : ""}
      onValueChange={(v) => picker.setSchoolYear(Number(v))}
      disabled={!picker.schoolYears.data?.length}
    >
      <SelectTrigger aria-label="Năm học" className={cn("bg-white/70 sm:w-36", className)}>
        <SelectValue placeholder="Năm học" />
      </SelectTrigger>
      <SelectContent>
        {picker.schoolYears.data?.map((y) => (
          <SelectItem key={y.id} value={String(y.id)}>
            {y.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function WeekSelect({ picker, className }: { picker: WeekPicker; className?: string }) {
  return (
    <Select
      value={picker.week ? String(picker.week.id) : ""}
      onValueChange={(v) => picker.setWeek(Number(v))}
      disabled={!picker.weeks.data?.length}
    >
      <SelectTrigger aria-label="Tuần" className={cn("bg-white/70 sm:w-56", className)}>
        <SelectValue placeholder="Chọn tuần" />
      </SelectTrigger>
      <SelectContent>
        {picker.weeks.data?.map((w) => (
          <SelectItem key={w.id} value={String(w.id)}>
            Tuần {w.numweek} · {formatRange(w.startdate, w.enddate)}
            {w.locked && " · đã khóa"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function WeekPickerControls({ picker }: { picker: WeekPicker }) {
  return (
    <>
      <SchoolYearSelect picker={picker} />
      <WeekSelect picker={picker} />
    </>
  )
}

export function WeekStatus({ week }: { week: Week }) {
  return week.locked ? (
    <Badge variant="secondary">
      <Lock /> Đã khóa
    </Badge>
  ) : (
    <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">
      <LockOpen /> Đang mở
    </Badge>
  )
}

// Khóa: không thêm/sửa/xóa lượt chấm và điểm gốc nữa (BE trả 409). Chỉ admin thấy nút (BE trả 403 với tài khoản khác)
export function LockWeekButton({ week, size = "sm" }: { week: Week; size?: "sm" | "default" }) {
  const [pending, setPending] = useState(false)
  const canEdit = isAdmin(useMe().data)

  const toggle = async () => {
    setPending(true)
    await runMutation(
      () => apiPut(`/weeks/${week.id}`, { locked: !week.locked }),
      week.locked ? `Đã mở khóa tuần ${week.numweek}` : `Đã khóa tuần ${week.numweek}`
    )
    setPending(false)
  }

  if (!canEdit) return null

  return (
    <Button variant="outline" size={size} onClick={toggle} disabled={pending}>
      {week.locked ? <LockOpen /> : <Lock />}
      {week.locked ? "Mở khóa tuần" : "Khóa tuần"}
    </Button>
  )
}

// Lọc phân hiệu/khối; value rỗng = tất cả
export function ScopeFilter({ value, onChange }: { value: ScoreScope; onChange: (v: ScoreScope) => void }) {
  const branches = useBranches()
  const grades = useGrades()

  return (
    <>
      <Select
        value={value.branchid ? String(value.branchid) : "all"}
        onValueChange={(v) => onChange({ ...value, branchid: v === "all" ? undefined : Number(v) })}
      >
        <SelectTrigger aria-label="Phân hiệu" className="bg-white/70 sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả phân hiệu</SelectItem>
          {branches.data?.map((b) => (
            <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value.gradeid ? String(value.gradeid) : "all"}
        onValueChange={(v) => onChange({ ...value, gradeid: v === "all" ? undefined : Number(v) })}
      >
        <SelectTrigger aria-label="Khối" className="bg-white/70 sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả khối</SelectItem>
          {grades.data?.map((g) => (
            <SelectItem key={g.id} value={String(g.id)}>Khối {g.numgrade}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}

export function ClassName({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-12 items-center justify-center rounded-lg bg-primary/10 px-2 py-1 font-semibold text-primary",
        className
      )}
    >
      {name}
    </span>
  )
}

// Hạng 1-3 tô màu; cùng điểm thì cùng hạng (RANK của BE)
export function RankBadge({ rank }: { rank: number }) {
  const medal = ["bg-amber-400/20 text-amber-700", "bg-slate-400/20 text-slate-700", "bg-orange-400/20 text-orange-700"][rank - 1]
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
        medal ?? "bg-muted text-muted-foreground"
      )}
    >
      {rank}
    </span>
  )
}

// Điểm 1 phần kèm tổng cộng/trừ (minus là số dương)
export function PartScore({ score, plus, minus }: { score: number; plus: number; minus: number }) {
  return (
    <div className="leading-tight">
      <p className="font-semibold tabular-nums">{score}</p>
      {(plus > 0 || minus > 0) && (
        <p className="text-xs tabular-nums">
          {plus > 0 && <span className="text-emerald-600">+{plus}</span>}
          {plus > 0 && minus > 0 && " "}
          {minus > 0 && <span className="text-rose-600">−{minus}</span>}
        </p>
      )}
    </div>
  )
}

export function SignedValue({ value }: { value: number }) {
  return (
    <span className={cn("font-semibold tabular-nums", value > 0 ? "text-emerald-600" : "text-rose-600")}>
      {formatSigned(value)}
    </span>
  )
}

// Điểm từng tuần của 1 lớp trong năm học; chỉ hiện các tuần đã bắt đầu
export function ClassScoreDialog({
  classid,
  schoolyearid,
  onOpenChange,
}: {
  classid?: number
  schoolyearid?: number
  onOpenChange: (open: boolean) => void
}) {
  const open = classid !== undefined
  const result = useClassScore(classid, schoolyearid)
  const data = result.data
  const weeks = data ? data.weeks.filter((w) => w.startdate <= todayISO()) : []
  const max = Math.max(1, ...weeks.map((w) => w.total))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data ? `Lớp ${data.class.name}` : "Điểm theo tuần"}</DialogTitle>
          <DialogDescription>
            {data
              ? `${data.class.teachername ? `GVCN ${data.class.teachername}` : "Chưa có GVCN"} · năm học ${data.schoolyear.name} · hạng là hạng toàn trường của tuần`
              : "Điểm thi đua từng tuần của lớp"}
          </DialogDescription>
          {classid !== undefined && (
            <Button variant="outline" size="sm" className="mt-1 w-fit" asChild>
              <Link href={`/diem-lop?lop=${classid}`}>
                Xem điểm chi tiết <ArrowRight />
              </Link>
            </Button>
          )}
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {result.error ? (
            <ErrorState error={result.error} onRetry={() => result.mutate()} />
          ) : !data ? (
            <TableSkeleton rows={6} />
          ) : weeks.length === 0 ? (
            <EmptyState title="Chưa có tuần nào bắt đầu" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tuần</TableHead>
                  <TableHead>Nề nếp</TableHead>
                  <TableHead>Học tập</TableHead>
                  <TableHead className="w-1/3">Tổng</TableHead>
                  <TableHead className="text-center">Hạng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeks.map((w) => (
                  <TableRow key={w.weekid}>
                    <TableCell>
                      <p className="font-medium">Tuần {w.numweek}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(w.startdate, false)}</p>
                    </TableCell>
                    <TableCell>
                      <PartScore score={w.conduct_score} plus={w.conduct_plus} minus={w.conduct_minus} />
                    </TableCell>
                    <TableCell>
                      <PartScore score={w.study_score} plus={w.study_plus} minus={w.study_minus} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="w-10 font-semibold tabular-nums">{w.total}</span>
                        <div className="h-2 flex-1 rounded-full bg-muted" aria-hidden>
                          <div className="h-2 rounded-full bg-primary/70" style={{ width: `${(w.total / max) * 100}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <RankBadge rank={w.rank} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
