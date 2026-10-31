"use client"

import { useState } from "react"
import { formatRange } from "@/lib/format"
import { useWeeklyScore, type ScoreScope } from "@/hooks/use-data"
import { useWeekPicker } from "@/hooks/use-week-picker"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/common"
import {
  ClassName,
  ClassScoreDialog,
  LockWeekButton,
  PartScore,
  RankBadge,
  ScopeFilter,
  WeekPickerControls,
  WeekStatus,
} from "@/components/scores"

export function WeeklyScoresView() {
  const picker = useWeekPicker()
  const week = picker.week
  const [scope, setScope] = useState<ScoreScope>({})
  // Lọc ở BE: hạng tính trong phạm vi phân hiệu/khối đang chọn
  const weekly = useWeeklyScore(week?.id, scope)
  const [detailClass, setDetailClass] = useState<number>()

  const scores = weekly.data?.scores ?? []
  const error = picker.error ?? weekly.error
  const scoped = Boolean(scope.branchid || scope.gradeid)

  return (
    <>
      <PageHeader
        title="Bảng điểm tuần"
        description={
          week
            ? `Tuần ${week.numweek} (${formatRange(week.startdate, week.enddate)}) · xếp hạng theo tổng điểm Nề nếp + Học tập`
            : "Xếp hạng thi đua các lớp theo tuần."
        }
        actions={
          <>
            {week && <LockWeekButton week={week} size="default" />}
            <WeekPickerControls picker={picker} />
          </>
        }
      />

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b border-border/70 p-3 sm:flex-row sm:items-center">
          <ScopeFilter value={scope} onChange={setScope} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:ml-auto">
            {week && <WeekStatus week={week} />}
            {scores.length} lớp{scoped && " · hạng trong phạm vi lọc"}
          </div>
        </div>

        {error ? (
          <ErrorState error={error} onRetry={() => (picker.error ? picker.schoolYears.mutate() : weekly.mutate())} />
        ) : picker.isLoading || weekly.isLoading ? (
          <TableSkeleton rows={8} />
        ) : !week ? (
          <EmptyState title="Chưa có tuần" description="Tạo năm học trong mục Năm học & tuần." />
        ) : scores.length === 0 ? (
          <EmptyState title="Không có lớp phù hợp" description="Thử đổi bộ lọc." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 pl-4 text-center">Hạng</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead className="hidden md:table-cell">Giáo viên chủ nhiệm</TableHead>
                <TableHead>Nề nếp</TableHead>
                <TableHead>Học tập</TableHead>
                <TableHead>Tổng</TableHead>
                <TableHead className="hidden pr-4 text-right sm:table-cell">Lượt chấm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((s) => (
                <TableRow
                  key={s.classid}
                  className="cursor-pointer"
                  onClick={() => setDetailClass(s.classid)}
                >
                  <TableCell className="pl-4 text-center">
                    <RankBadge rank={s.rank} />
                  </TableCell>
                  <TableCell>
                    {/* Nút để mở chi tiết bằng bàn phím */}
                    <button type="button" onClick={() => setDetailClass(s.classid)} aria-label={`Xem điểm lớp ${s.classname} theo tuần`}>
                      <ClassName name={s.classname} />
                    </button>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{s.teachername}</TableCell>
                  <TableCell>
                    <PartScore score={s.conduct_score} plus={s.conduct_plus} minus={s.conduct_minus} />
                  </TableCell>
                  <TableCell>
                    <PartScore score={s.study_score} plus={s.study_plus} minus={s.study_minus} />
                  </TableCell>
                  <TableCell className="text-base font-semibold tabular-nums">{s.total}</TableCell>
                  <TableCell className="hidden pr-4 text-right tabular-nums sm:table-cell">
                    {s.entries === 0 ? <span className="text-amber-700">Chưa chấm</span> : s.entries}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ClassScoreDialog
        classid={detailClass}
        schoolyearid={week?.schoolyearid}
        onOpenChange={(open) => !open && setDetailClass(undefined)}
      />
    </>
  )
}
