"use client"

import { useState } from "react"
import { CalendarClock } from "lucide-react"
import { ApiError } from "@/lib/api"
import { formatDate, formatRange } from "@/lib/format"
import type { PeriodRange, PeriodType, RankingRow, SummaryRow } from "@/lib/types"
import { useRanking, useScorePeriods, useSummaryScore, type ScoreScope } from "@/hooks/use-data"
import { useWeekPicker, type WeekPicker } from "@/hooks/use-week-picker"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, ErrorState, PageHeader, TableSkeleton, TeacherName } from "@/components/common"
import { ClassName, ClassScoreDialog, PartScore, RankBadge, ScopeFilter, SchoolYearSelect } from "@/components/scores"

type Mode = PeriodType | "range"

const MODES: { value: Mode; label: string }[] = [
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
  { value: "semester", label: "Học kỳ" },
  { value: "range", label: "Khoảng tuần" },
]

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex rounded-lg border border-border bg-white/70 p-0.5" role="group" aria-label="Xếp hạng theo">
      {MODES.map((m) => (
        <Button
          key={m.value}
          type="button"
          size="sm"
          variant={mode === m.value ? "default" : "ghost"}
          aria-pressed={mode === m.value}
          onClick={() => onChange(m.value)}
          className="flex-1 sm:flex-none"
        >
          {m.label}
        </Button>
      ))}
    </div>
  )
}

// Dòng xếp hạng của /scores/ranking có thêm cộng/trừ từng phần và số lượt chấm; /scores/summary chỉ có điểm
function RankTable({ rows, onSelect }: { rows: (SummaryRow | RankingRow)[]; onSelect: (classid: number) => void }) {
  const showEntries = rows.some((s) => "entries" in s)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16 pl-4 text-center">Hạng</TableHead>
          <TableHead>Lớp</TableHead>
          <TableHead className="hidden md:table-cell">Giáo viên chủ nhiệm</TableHead>
          <TableHead className="text-right">Nề nếp</TableHead>
          <TableHead className="text-right">Học tập</TableHead>
          <TableHead className="text-right">Tổng</TableHead>
          <TableHead className={cn("text-right", !showEntries && "pr-4")}>TB/tuần</TableHead>
          {showEntries && <TableHead className="hidden pr-4 text-right sm:table-cell">Lượt chấm</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.classid} className="cursor-pointer" onClick={() => onSelect(s.classid)}>
            <TableCell className="pl-4 text-center">
              <RankBadge rank={s.rank} />
            </TableCell>
            <TableCell>
              <button type="button" onClick={() => onSelect(s.classid)} aria-label={`Xem điểm lớp ${s.classname} theo tuần`}>
                <ClassName name={s.classname} />
              </button>
            </TableCell>
            <TableCell className="hidden md:table-cell"><TeacherName name={s.teachername} /></TableCell>
            <TableCell className="text-right tabular-nums">
              {"conduct_plus" in s ? (
                <PartScore score={s.conduct_score} plus={s.conduct_plus} minus={s.conduct_minus} />
              ) : (
                s.conduct_score
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {"study_plus" in s ? (
                <PartScore score={s.study_score} plus={s.study_plus} minus={s.study_minus} />
              ) : (
                s.study_score
              )}
            </TableCell>
            <TableCell className="text-right text-base font-semibold tabular-nums">{s.total}</TableCell>
            <TableCell className={cn("text-right tabular-nums text-muted-foreground", !showEntries && "pr-4")}>
              {s.avg_total.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}
            </TableCell>
            {"entries" in s && (
              <TableCell className="hidden pr-4 text-right tabular-nums sm:table-cell">
                {s.entries === 0 ? <span className="text-amber-700">Chưa chấm</span> : s.entries}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

type PanelProps = {
  picker: WeekPicker
  tabs: React.ReactNode
  scope: ScoreScope
  onScopeChange: (s: ScoreScope) => void
  onSelect: (classid: number) => void
}

type PeriodOption = { value: string; label: string; started: boolean }

// Xếp hạng theo tuần / tháng / học kỳ; mặc định là khoảng đã bắt đầu gần nhất
function PeriodRanking({ type, picker, tabs, scope, onScopeChange, onSelect }: PanelProps & { type: PeriodType }) {
  const periods = useScorePeriods(picker.schoolyearid)
  // Lựa chọn chỉ có hiệu lực với đúng năm học và loại khoảng đã chọn
  const [chosen, setChosen] = useState<{ yearId?: number; type: PeriodType; value: string }>()

  const weeks = periods.data?.weeks ?? []
  const startedWeeks = new Set(weeks.filter((w) => w.started).map((w) => w.numweek))
  const rangeOption = (r: PeriodRange<string | number>): PeriodOption => ({
    value: String(r.value),
    label: `${r.label} · tuần ${r.fromweek}–${r.toweek}`,
    started: startedWeeks.has(r.fromweek),
  })
  const options: PeriodOption[] =
    type === "week"
      ? weeks.map((w) => ({ value: String(w.numweek), label: `Tuần ${w.numweek} · ${formatRange(w.startdate, w.enddate)}`, started: w.started }))
      : type === "month"
        ? (periods.data?.months ?? []).map(rangeOption)
        : (periods.data?.semesters ?? []).map(rangeOption)

  const value =
    chosen && chosen.yearId === picker.schoolyearid && chosen.type === type
      ? chosen.value
      : options.filter((o) => o.started).at(-1)?.value
  const ranking = useRanking(picker.schoolyearid, value ? { type, value } : undefined, scope)
  const data = ranking.data
  // 409: khoảng chưa có tuần nào bắt đầu, không phải lỗi trang
  const notStarted = ranking.error instanceof ApiError && ranking.error.status === 409 ? ranking.error : undefined
  const error = picker.error ?? periods.error ?? (notStarted ? undefined : ranking.error)

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-2 border-b border-border/70 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        {tabs}
        <Select
          value={value ?? ""}
          onValueChange={(v) => setChosen({ yearId: picker.schoolyearid, type, value: v })}
          disabled={!options.length}
        >
          <SelectTrigger aria-label="Chọn khoảng xếp hạng" className="bg-white/70 sm:w-64">
            <SelectValue placeholder={type === "week" ? "Chọn tuần" : type === "month" ? "Chọn tháng" : "Chọn học kỳ"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value} disabled={!o.started}>
                {o.label}
                {!o.started && " (chưa bắt đầu)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ScopeFilter value={scope} onChange={onScopeChange} />
      </div>

      {data && !notStarted && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-2 text-sm">
          <CalendarClock className="size-4 text-muted-foreground" />
          <span className="font-medium">{data.period.label}</span>
          <span className="text-muted-foreground">
            {formatDate(data.period.startdate)} – {formatDate(data.period.enddate)}
            {data.period.numweeks > 1 && ` · tuần ${data.period.fromweek}–${data.period.toweek}`}
          </span>
          {data.period.countedweeks < data.period.numweeks && (
            <Badge variant="outline" className="text-amber-700">
              Đã tính {data.period.countedweeks}/{data.period.numweeks} tuần
            </Badge>
          )}
          <span className="text-xs text-muted-foreground sm:ml-auto">{data.scores.length} lớp</span>
        </div>
      )}

      {error ? (
        <ErrorState
          error={error}
          onRetry={() => (picker.error ? picker.schoolYears.mutate() : periods.error ? periods.mutate() : ranking.mutate())}
        />
      ) : picker.isLoading || periods.isLoading || ranking.isLoading ? (
        <TableSkeleton rows={8} />
      ) : !picker.schoolyearid ? (
        <EmptyState title="Chưa có năm học" description="Tạo năm học trong mục Năm học & tuần." />
      ) : notStarted ? (
        <EmptyState title={notStarted.message} description="Chọn khoảng khác đã bắt đầu." />
      ) : !value ? (
        <EmptyState title="Năm học chưa bắt đầu" description="Chưa có tuần nào bắt đầu để xếp hạng." />
      ) : !data?.scores.length ? (
        <EmptyState title="Không có lớp phù hợp" description="Thử đổi bộ lọc." />
      ) : (
        <RankTable rows={data.scores} onSelect={onSelect} />
      )}
    </Card>
  )
}

// Cộng dồn khoảng tuần tùy chọn (/scores/summary)
function RangeSummary({ picker, tabs, scope, onScopeChange, onSelect }: PanelProps) {
  const weeks = picker.weeks.data ?? []
  // Khoảng tuần do người dùng chọn; để trống thì BE mặc định từ tuần 1 đến tuần đã bắt đầu gần nhất
  const [range, setRange] = useState<{ yearId?: number; from?: number; to?: number }>({})
  const sameYear = range.yearId === picker.schoolyearid
  const from = sameYear ? range.from : undefined
  const to = sameYear ? range.to : undefined
  const summary = useSummaryScore(picker.schoolyearid, from, to, scope)

  const data = summary.data
  const shownFrom = from ?? data?.fromweek
  const shownTo = to ?? data?.toweek
  const weekOf = (n?: number) => weeks.find((w) => w.numweek === n)
  const fromWeek = weekOf(data?.fromweek)
  const toWeek = weekOf(data?.toweek)
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
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-2 border-b border-border/70 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        {tabs}
        <div className="flex items-center gap-2">
          <Select
            value={shownFrom ? String(shownFrom) : ""}
            onValueChange={(v) => setBound("from", Number(v))}
            disabled={!weeks.length}
          >
            <SelectTrigger aria-label="Từ tuần" className="flex-1 bg-white/70 sm:w-36">
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
            <SelectTrigger aria-label="Đến tuần" className="flex-1 bg-white/70 sm:w-36">
              <SelectValue placeholder="Đến tuần" />
            </SelectTrigger>
            <SelectContent>{weekOptions("to")}</SelectContent>
          </Select>
        </div>
        <ScopeFilter value={scope} onChange={onScopeChange} />
      </div>

      {data && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-2 text-sm">
          <CalendarClock className="size-4 text-muted-foreground" />
          <span className="font-medium">Cộng dồn tuần {data.fromweek}–{data.toweek}</span>
          {fromWeek && toWeek && (
            <span className="text-muted-foreground">
              {formatDate(fromWeek.startdate)} – {formatDate(toWeek.enddate)}
            </span>
          )}
          <span className="text-xs text-muted-foreground sm:ml-auto">{data.scores.length} lớp</span>
        </div>
      )}

      {error ? (
        <ErrorState error={error} onRetry={() => (picker.error ? picker.schoolYears.mutate() : summary.mutate())} />
      ) : picker.isLoading || summary.isLoading ? (
        <TableSkeleton rows={8} />
      ) : !picker.schoolyearid ? (
        <EmptyState title="Chưa có năm học" description="Tạo năm học trong mục Năm học & tuần." />
      ) : !data?.scores.length ? (
        <EmptyState title="Không có lớp phù hợp" description="Thử đổi bộ lọc." />
      ) : (
        <RankTable rows={data.scores} onSelect={onSelect} />
      )}
    </Card>
  )
}

export function SummaryView() {
  const picker = useWeekPicker()
  const [mode, setMode] = useState<Mode>("month")
  const [scope, setScope] = useState<ScoreScope>({})
  const [detailClass, setDetailClass] = useState<number>()

  const panel: PanelProps = {
    picker,
    tabs: <ModeTabs mode={mode} onChange={setMode} />,
    scope,
    onScopeChange: setScope,
    onSelect: setDetailClass,
  }

  return (
    <>
      <PageHeader
        title="Xếp hạng thi đua"
        description="Xếp hạng theo tổng điểm của tuần, tháng, học kỳ hoặc khoảng tuần tùy chọn. Chỉ tính các tuần đã bắt đầu."
        actions={<SchoolYearSelect picker={picker} />}
      />

      {mode === "range" ? <RangeSummary {...panel} /> : <PeriodRanking type={mode} {...panel} />}

      <ClassScoreDialog
        classid={detailClass}
        schoolyearid={picker.schoolyearid}
        onOpenChange={(open) => !open && setDetailClass(undefined)}
      />
    </>
  )
}
