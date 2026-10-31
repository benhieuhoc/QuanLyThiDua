"use client"

import { useState } from "react"
import { formatDate } from "@/lib/format"
import { useSummaryScore, type ScoreScope } from "@/hooks/use-data"
import { useWeekPicker } from "@/hooks/use-week-picker"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/common"
import { ClassName, ClassScoreDialog, RankBadge, ScopeFilter, SchoolYearSelect } from "@/components/scores"

export function SummaryView() {
  const picker = useWeekPicker()
  const weeks = picker.weeks.data ?? []
  // Khoảng tuần do người dùng chọn; để trống thì BE mặc định từ tuần 1 đến tuần đã bắt đầu gần nhất
  const [range, setRange] = useState<{ yearId?: number; from?: number; to?: number }>({})
  const sameYear = range.yearId === picker.schoolyearid
  const from = sameYear ? range.from : undefined
  const to = sameYear ? range.to : undefined
  const [scope, setScope] = useState<ScoreScope>({})
  const summary = useSummaryScore(picker.schoolyearid, from, to, scope)
  const [detailClass, setDetailClass] = useState<number>()

  const data = summary.data
  const shownFrom = from ?? data?.fromweek
  const shownTo = to ?? data?.toweek
  const weekOf = (n?: number) => weeks.find((w) => w.numweek === n)
  const error = picker.error ?? summary.error

  const setBound = (key: "from" | "to", value: number) =>
    setRange({ yearId: picker.schoolyearid, from: shownFrom, to: shownTo, [key]: value })

  const weekOptions = (bound: "from" | "to") =>
    weeks.map((w) => (
      <SelectItem
        key={w.id}
        value={String(w.numweek)}
        // Giữ from ≤ to để BE không trả 400
        disabled={bound === "from" ? shownTo !== undefined && w.numweek > shownTo : shownFrom !== undefined && w.numweek < shownFrom}
      >
        Tuần {w.numweek} · {formatDate(bound === "from" ? w.startdate : w.enddate, false)}
      </SelectItem>
    ))

  return (
    <>
      <PageHeader
        title="Tổng hợp thi đua"
        description={
          data
            ? `Năm học ${data.schoolyear.name} · cộng dồn tuần ${data.fromweek}–${data.toweek}` +
              (weekOf(data.fromweek) && weekOf(data.toweek)
                ? ` (${formatDate(weekOf(data.fromweek)!.startdate)} – ${formatDate(weekOf(data.toweek)!.enddate)})`
                : "")
            : "Xếp hạng theo tổng điểm cộng dồn nhiều tuần, ví dụ một học kỳ."
        }
        actions={<SchoolYearSelect picker={picker} />}
      />

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b border-border/70 p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2">
            <Select
              value={shownFrom ? String(shownFrom) : ""}
              onValueChange={(v) => setBound("from", Number(v))}
              disabled={!weeks.length}
            >
              <SelectTrigger aria-label="Từ tuần" className="flex-1 bg-white/70 sm:w-40">
                <SelectValue placeholder="Từ tuần" />
              </SelectTrigger>
              <SelectContent>{weekOptions("from")}</SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">đến</span>
            <Select
              value={shownTo ? String(shownTo) : ""}
              onValueChange={(v) => setBound("to", Number(v))}
              disabled={!weeks.length}
            >
              <SelectTrigger aria-label="Đến tuần" className="flex-1 bg-white/70 sm:w-40">
                <SelectValue placeholder="Đến tuần" />
              </SelectTrigger>
              <SelectContent>{weekOptions("to")}</SelectContent>
            </Select>
          </div>
          <ScopeFilter value={scope} onChange={setScope} />
          <p className="text-xs text-muted-foreground sm:ml-auto">{data?.scores.length ?? 0} lớp</p>
        </div>

        {error ? (
          <ErrorState error={error} onRetry={() => (picker.error ? picker.schoolYears.mutate() : summary.mutate())} />
        ) : picker.isLoading || summary.isLoading ? (
          <TableSkeleton rows={8} />
        ) : !picker.schoolyearid ? (
          <EmptyState title="Chưa có năm học" description="Tạo năm học trong mục Năm học & tuần." />
        ) : !data?.scores.length ? (
          <EmptyState title="Không có lớp phù hợp" description="Thử đổi bộ lọc." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 pl-4 text-center">Hạng</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead className="hidden md:table-cell">Giáo viên chủ nhiệm</TableHead>
                <TableHead className="text-right">Nề nếp</TableHead>
                <TableHead className="text-right">Học tập</TableHead>
                <TableHead className="text-right">Tổng</TableHead>
                <TableHead className="pr-4 text-right">TB/tuần</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.scores.map((s) => (
                <TableRow key={s.classid} className="cursor-pointer" onClick={() => setDetailClass(s.classid)}>
                  <TableCell className="pl-4 text-center">
                    <RankBadge rank={s.rank} />
                  </TableCell>
                  <TableCell>
                    <button type="button" onClick={() => setDetailClass(s.classid)} aria-label={`Xem điểm lớp ${s.classname} theo tuần`}>
                      <ClassName name={s.classname} />
                    </button>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{s.teachername}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.conduct_score}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.study_score}</TableCell>
                  <TableCell className="text-right text-base font-semibold tabular-nums">{s.total}</TableCell>
                  <TableCell className="pr-4 text-right tabular-nums text-muted-foreground">
                    {s.avg_total.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ClassScoreDialog
        classid={detailClass}
        schoolyearid={picker.schoolyearid}
        onOpenChange={(open) => !open && setDetailClass(undefined)}
      />
    </>
  )
}
