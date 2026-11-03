"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Award, ClipboardList, Minus, Plus, Trophy, TriangleAlert, X } from "lucide-react"
import { formatDate, formatRange } from "@/lib/format"
import type { ClassItem, ClassScore, PeriodType, Point, PointStudent, RankingRow, ScorePeriods, SummaryRow } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  useClassPoints,
  useClassScore,
  useClasses,
  useRanking,
  useScorePeriods,
  useSummaryScore,
  type RankingPeriod,
} from "@/hooks/use-data"
import { useWeekPicker } from "@/hooks/use-week-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EmptyState, ErrorState, PageHeader, StatCard, TableSkeleton, TeacherName } from "@/components/common"
import { ClassName, SchoolYearSelect, SignedValue } from "@/components/scores"

// Khoảng xem: "year" (cả năm học, các tuần đã bắt đầu) hoặc "<type>:<value>" như "month:2026-10"
type PeriodKey = string
type WeekRange = { from: number; to: number; label: string; startdate: string; enddate: string }

// Màu biểu đồ đã kiểm tra phân biệt được với người mù màu (sky-600 / orange-600): trên / dưới điểm gốc
const ABOVE = "bg-sky-600"
const BELOW = "bg-orange-600"

const parsePeriod = (key: PeriodKey): RankingPeriod | undefined => {
  if (key === "year") return undefined
  const [type, value] = key.split(":") as [PeriodType, string]
  return { type, value: type === "month" ? value : Number(value) }
}

// Khoảng tuần của một lựa chọn; cả năm học tính đến tuần đã bắt đầu gần nhất
function rangeOf(key: PeriodKey, periods: ScorePeriods): WeekRange | undefined {
  const started = periods.weeks.filter((w) => w.started)
  if (key === "year") {
    const last = started.at(-1)
    return last && { from: 1, to: last.numweek, label: `Năm học ${periods.schoolyear.name}`, startdate: periods.weeks[0].startdate, enddate: last.enddate }
  }
  const period = parsePeriod(key)!
  if (period.type === "week") {
    const w = periods.weeks.find((x) => x.numweek === period.value)
    return w && { from: w.numweek, to: w.numweek, label: `Tuần ${w.numweek}`, startdate: w.startdate, enddate: w.enddate }
  }
  const list: { value: string | number; label: string; fromweek: number; toweek: number; startdate: string; enddate: string }[] =
    period.type === "month" ? periods.months : periods.semesters
  const r = list.find((x) => String(x.value) === String(period.value))
  return r && { from: r.fromweek, to: r.toweek, label: r.label, startdate: r.startdate, enddate: r.enddate }
}

type StudentStat = { student: PointStudent; count: number; sum: number; contents: string[] }

// Gộp lượt chấm theo học sinh được gắn; mỗi danh sách chỉ lấy lượt cùng dấu
function studentStats(points: Point[], sign: 1 | -1): StudentStat[] {
  const map = new Map<number, StudentStat>()
  for (const p of points) {
    if (Math.sign(p.value) !== sign) continue
    for (const st of p.students) {
      const stat = map.get(st.id) ?? { student: st, count: 0, sum: 0, contents: [] }
      stat.count++
      stat.sum += p.value
      stat.contents.push(p.content)
      map.set(st.id, stat)
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || Math.abs(b.sum) - Math.abs(a.sum))
}

function ClassSelect({ classes, value, onChange }: { classes: ClassItem[]; value?: number; onChange: (id: number) => void }) {
  const grades = [...new Set(classes.map((c) => c.numgrade))]
  return (
    <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger aria-label="Chọn lớp" className="bg-white/70 sm:w-40">
        <SelectValue placeholder="Chọn lớp" />
      </SelectTrigger>
      <SelectContent>
        {grades.map((g) => (
          <SelectGroup key={g}>
            <SelectLabel>Khối {g}</SelectLabel>
            {classes
              .filter((c) => c.numgrade === g)
              .map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

function PeriodSelect({ periods, value, onChange }: { periods: ScorePeriods; value: PeriodKey; onChange: (k: PeriodKey) => void }) {
  const started = new Set(periods.weeks.filter((w) => w.started).map((w) => w.numweek))
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Chọn khoảng thời gian" className="bg-white/70 sm:w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="year">Cả năm học</SelectItem>
        <SelectGroup>
          <SelectLabel>Học kỳ</SelectLabel>
          {periods.semesters.map((s) => (
            <SelectItem key={s.value} value={`semester:${s.value}`} disabled={!started.has(s.fromweek)}>
              {s.label} · tuần {s.fromweek}–{s.toweek}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Tháng</SelectLabel>
          {periods.months.map((m) => (
            <SelectItem key={m.value} value={`month:${m.value}`} disabled={!started.has(m.fromweek)}>
              {m.label} · tuần {m.fromweek}–{m.toweek}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Tuần</SelectLabel>
          {periods.weeks.map((w) => (
            <SelectItem key={w.id} value={`week:${w.numweek}`} disabled={!w.started}>
              Tuần {w.numweek} · {formatRange(w.startdate, w.enddate)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

// Cột chênh lệch tổng điểm so với điểm gốc từng tuần: trên trục 0 là cộng ròng, dưới là trừ ròng.
// Tổng tuyệt đối gần như bằng nhau (quanh điểm gốc) nên vẽ phần chênh lệch mới thấy khác biệt
function WeeklyDeltaChart({ weeks }: { weeks: ClassScore["weeks"] }) {
  const deltas = weeks.map((w) => w.total - w.conduct_base - w.study_base)
  const maxUp = Math.max(0, ...deltas)
  const maxDown = Math.max(0, ...deltas.map((d) => -d))
  const scale = Math.max(maxUp + maxDown, 1)
  // Ẩn bớt nhãn trục khi nhiều tuần để không chồng chữ
  const labelEvery = weeks.length > 24 ? 4 : weeks.length > 12 ? 2 : 1

  return (
    <div>
      <div className="relative flex h-44 items-stretch gap-0.5" role="list" aria-label="Chênh lệch điểm so với điểm gốc theo tuần">
        {/* Trục 0 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 border-t border-border"
          style={{ top: `${(maxUp / scale) * 100}%` }}
        />
        {weeks.map((w, i) => {
          const d = deltas[i]
          return (
            <Tooltip key={w.weekid}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="listitem"
                  aria-label={`Tuần ${w.numweek}: tổng ${w.total}, ${d >= 0 ? "+" : ""}${d} so với điểm gốc, hạng ${w.rank}`}
                  className="group relative flex max-w-8 flex-1 flex-col rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {/* Vùng bắt chuột cao hết biểu đồ, lớn hơn cột */}
                  <span className="flex flex-col justify-end" style={{ height: `${(maxUp / scale) * 100}%` }}>
                    {d > 0 && (
                      <span className={cn("block rounded-t-[4px] group-hover:opacity-80", ABOVE)} style={{ height: `${(d / maxUp) * 100}%` }} />
                    )}
                  </span>
                  <span className="flex flex-col justify-start" style={{ height: `${(maxDown / scale) * 100}%` }}>
                    {d < 0 && (
                      <span className={cn("block rounded-b-[4px] group-hover:opacity-80", BELOW)} style={{ height: `${(-d / maxDown) * 100}%` }} />
                    )}
                  </span>
                  {d === 0 && (
                    <span className="absolute inset-x-0 h-0.5 bg-muted-foreground/40" style={{ top: `calc(${(maxUp / scale) * 100}% - 1px)` }} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Tuần {w.numweek} · {formatRange(w.startdate, w.enddate)}</p>
                <p className="tabular-nums">
                  Tổng {w.total} ({d >= 0 ? "+" : ""}{d} so với gốc {w.conduct_base + w.study_base})
                </p>
                <p className="tabular-nums">Nề nếp {w.conduct_score} · Học tập {w.study_score} · hạng {w.rank}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <div className="mt-1 flex gap-0.5" aria-hidden>
        {weeks.map((w, i) => (
          <span key={w.weekid} className="max-w-8 flex-1 text-center text-[10px] text-muted-foreground tabular-nums">
            {i % labelEvery === 0 ? w.numweek : ""}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-sm", ABOVE)} /> Trên điểm gốc
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-sm", BELOW)} /> Dưới điểm gốc
        </span>
        <span>Trục ngang: số tuần · rê chuột vào cột để xem chi tiết</span>
      </div>
    </div>
  )
}

const TOP_STUDENTS = 8

// Bảng xếp học sinh theo số lần bị trừ / được cộng; bấm để lọc danh sách lượt chấm
function StudentBoard({
  title,
  description,
  icon: Icon,
  tone,
  stats,
  numstudents,
  selected,
  onSelect,
}: {
  title: string
  description: string
  icon: typeof Award
  tone: "above" | "below"
  stats: StudentStat[]
  numstudents: number
  selected?: number
  onSelect: (id?: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? stats : stats.slice(0, TOP_STUDENTS)
  const max = Math.max(1, ...stats.map((s) => s.count))

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={cn("size-4", tone === "above" ? "text-sky-600" : "text-orange-600")} />
          {title}
        </CardTitle>
        <CardDescription>
          {stats.length > 0 ? `${stats.length}/${numstudents} học sinh · ${description}` : description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            Chưa có học sinh nào trong khoảng này
          </p>
        ) : (
          <>
            <ol className="grid gap-1">
              {shown.map((s, i) => {
                const active = selected === s.student.id
                return (
                  <li key={s.student.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(active ? undefined : s.student.id)}
                      aria-pressed={active}
                      title={s.contents.join(" · ")}
                      className={cn(
                        "grid w-full grid-cols-[1.25rem_1fr_auto] items-center gap-x-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-primary/5",
                        active && "bg-primary/10 ring-1 ring-primary/30"
                      )}
                    >
                      <span className="text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{s.student.name}</span>
                        <span className="mt-1 block h-1 rounded-full bg-muted" aria-hidden>
                          <span
                            className={cn("block h-1 rounded-full", tone === "above" ? ABOVE : BELOW)}
                            style={{ width: `${(s.count / max) * 100}%` }}
                          />
                        </span>
                      </span>
                      <span className="text-right text-xs leading-tight tabular-nums">
                        <span className="block font-semibold text-foreground">{s.count} lần</span>
                        <span className="text-muted-foreground">{s.sum > 0 ? `+${s.sum}` : `−${-s.sum}`} điểm</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
            {stats.length > TOP_STUDENTS && (
              <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setExpanded(!expanded)}>
                {expanded ? "Thu gọn" : `Xem tất cả ${stats.length} học sinh`}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

type SignFilter = "all" | "minus" | "plus"

function PointsCard({
  points,
  student,
  onClearStudent,
}: {
  points: Point[]
  student?: PointStudent
  onClearStudent: () => void
}) {
  const [sign, setSign] = useState<SignFilter>("all")
  const rows = points
    .filter((p) => (sign === "all" || (sign === "plus" ? p.value > 0 : p.value < 0)) && (!student || p.students.some((s) => s.id === student.id)))
    .sort((a, b) => b.numweek - a.numweek || b.id - a.id)

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-2 border-b border-border/70 p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="mr-auto">
          <p className="font-medium">Lượt chấm điểm</p>
          <p className="text-xs text-muted-foreground">{rows.length} lượt · mới nhất trước</p>
        </div>
        {student && (
          <Badge variant="secondary" className="gap-1 pr-1">
            {student.name}
            <button type="button" aria-label="Bỏ lọc học sinh" onClick={onClearStudent} className="rounded-full p-0.5 hover:bg-foreground/10">
              <X className="size-3" />
            </button>
          </Badge>
        )}
        <div className="flex rounded-lg border border-border bg-white/70 p-0.5" role="group" aria-label="Lọc theo cộng/trừ">
          {(
            [
              ["all", "Tất cả"],
              ["minus", "Điểm trừ"],
              ["plus", "Điểm cộng"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={sign === value ? "default" : "ghost"}
              aria-pressed={sign === value}
              onClick={() => setSign(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Không có lượt chấm phù hợp" description="Thử đổi khoảng thời gian hoặc bộ lọc." />
      ) : (
        <div className="max-h-[520px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 pl-4">Tuần</TableHead>
                <TableHead className="hidden sm:table-cell">Phần</TableHead>
                <TableHead>Nội dung</TableHead>
                <TableHead className="w-20 pr-4 text-right">Điểm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-4 tabular-nums">Tuần {p.numweek}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{p.type}</TableCell>
                  <TableCell className="whitespace-normal">
                    <p>{p.content}</p>
                    {p.students.length > 0 && (
                      <p className="text-xs text-muted-foreground">{p.students.map((s) => s.name).join(", ")}</p>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <SignedValue value={p.value} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}

export function ClassDetailView() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const picker = useWeekPicker()
  const schoolyearid = picker.schoolyearid
  const classes = useClasses()
  const periods = useScorePeriods(schoolyearid)
  const [periodChoice, setPeriodChoice] = useState<{ yearId?: number; key: PeriodKey }>()
  const [studentId, setStudentId] = useState<number>()

  // Lớp lấy từ ?lop= để chia sẻ được đường dẫn; không có hoặc sai thì lấy lớp đầu tiên
  const requested = Number(searchParams.get("lop"))
  const cls = classes.data?.find((c) => c.id === requested) ?? classes.data?.[0]
  const classid = cls?.id

  const key = periodChoice?.yearId === schoolyearid && periodChoice ? periodChoice.key : "year"
  const range = periods.data ? rangeOf(key, periods.data) : undefined
  const period = parsePeriod(key)

  // Hạng và tổng điểm của khoảng: cả năm dùng /scores/summary, còn lại /scores/ranking (hạng toàn trường)
  const summary = useSummaryScore(!period ? schoolyearid : undefined)
  const ranking = useRanking(schoolyearid, period)
  const board: (SummaryRow | RankingRow)[] | undefined = period ? ranking.data?.scores : summary.data?.scores
  const row = board?.find((r) => r.classid === classid)
  const counted = ranking.data && period ? ranking.data.period : undefined

  const classScore = useClassScore(classid, schoolyearid)
  const classPoints = useClassPoints(classid)

  const inRange = (n: number) => range !== undefined && n >= range.from && n <= range.to
  const weeks = (classScore.data?.weeks ?? []).filter((w) => inRange(w.numweek) && periods.data?.weeks.find((x) => x.id === w.weekid)?.started)
  const points = (classPoints.data ?? []).filter((p) => p.schoolyearid === schoolyearid && inRange(p.numweek))
  const plus = points.filter((p) => p.value > 0)
  const minus = points.filter((p) => p.value < 0)
  const sum = (list: Point[]) => list.reduce((s, p) => s + p.value, 0)
  const violators = studentStats(points, -1)
  const achievers = studentStats(points, 1)
  const selectedStudent = [...violators, ...achievers].find((s) => s.student.id === studentId)?.student

  const selectClass = (id: number) => {
    setStudentId(undefined)
    router.replace(`${pathname}?lop=${id}`, { scroll: false })
  }
  const selectPeriod = (k: PeriodKey) => {
    setStudentId(undefined)
    setPeriodChoice({ yearId: schoolyearid, key: k })
  }

  const error = picker.error ?? classes.error ?? periods.error
  const dataError = classScore.error ?? classPoints.error ?? (period ? ranking.error : summary.error)
  const loadingData = classScore.isLoading || classPoints.isLoading || (period ? ranking.isLoading : summary.isLoading)

  return (
    <>
      <PageHeader
        title="Điểm lớp"
        description="Chi tiết điểm thi đua của một lớp: biến động theo tuần, các lượt cộng/trừ và học sinh liên quan."
        actions={<SchoolYearSelect picker={picker} />}
      />

      {error ? (
        <Card className="py-0">
          <ErrorState
            error={error}
            onRetry={() => (picker.error ? picker.schoolYears.mutate() : classes.error ? classes.mutate() : periods.mutate())}
          />
        </Card>
      ) : picker.isLoading || classes.isLoading || periods.isLoading ? (
        <Card className="py-0">
          <TableSkeleton rows={6} />
        </Card>
      ) : !cls ? (
        <Card className="py-0">
          <EmptyState title="Chưa có lớp" description="Tạo lớp trong mục Lớp học." />
        </Card>
      ) : !periods.data || !schoolyearid ? (
        <Card className="py-0">
          <EmptyState title="Chưa có năm học" description="Tạo năm học trong mục Năm học & tuần." />
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card className="flex-row flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
            <ClassName name={cls.name} className="px-3 text-lg" />
            <div className="min-w-0">
              <p className="font-medium">
                {cls.teachername ? `GVCN ${cls.teachername}` : <TeacherName name={null} />}
              </p>
              <p className="text-xs text-muted-foreground">
                {cls.branchname} · sĩ số {cls.numstudents}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
              <ClassSelect classes={classes.data ?? []} value={classid} onChange={selectClass} />
              <PeriodSelect periods={periods.data} value={key} onChange={selectPeriod} />
            </div>
            {range && (
              <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/70 pt-3 text-sm">
                <span className="font-medium">{range.label}</span>
                <span className="text-muted-foreground">
                  {formatDate(range.startdate)} – {formatDate(range.enddate)}
                  {range.to > range.from && ` · tuần ${range.from}–${range.to}`}
                </span>
                {counted && counted.countedweeks < counted.numweeks && (
                  <Badge variant="outline" className="text-amber-700">
                    Đã tính {counted.countedweeks}/{counted.numweeks} tuần
                  </Badge>
                )}
              </div>
            )}
          </Card>

          {!range ? (
            <Card className="py-0">
              <EmptyState title="Năm học chưa bắt đầu" description="Chưa có tuần nào bắt đầu để xem điểm." />
            </Card>
          ) : dataError ? (
            <Card className="py-0">
              <ErrorState
                error={dataError}
                onRetry={() => {
                  classScore.mutate()
                  classPoints.mutate()
                  if (period) ranking.mutate()
                  else summary.mutate()
                }}
              />
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Hạng toàn trường"
                  value={row ? `${row.rank}/${board?.length}` : "—"}
                  hint={row && board ? (row.rank === 1 ? "Dẫn đầu" : `${row.rank - 1} lớp xếp trên`) : undefined}
                  icon={Trophy}
                  tone="amber"
                  loading={loadingData}
                />
                <StatCard
                  label="Tổng điểm"
                  value={row?.total ?? "—"}
                  hint={row ? `TB ${row.avg_total.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}/tuần · ${row.weeks} tuần` : undefined}
                  icon={ClipboardList}
                  tone="indigo"
                  loading={loadingData}
                />
                <StatCard
                  label="Điểm cộng"
                  value={`+${sum(plus)}`}
                  hint={`${plus.length} lượt`}
                  icon={Plus}
                  tone="sky"
                  loading={loadingData}
                />
                <StatCard
                  label="Điểm trừ"
                  value={minus.length ? `−${-sum(minus)}` : "0"}
                  hint={`${minus.length} lượt`}
                  icon={Minus}
                  tone="rose"
                  loading={loadingData}
                />
              </div>

              <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
                <div className="grid min-w-0 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Biến động theo tuần</CardTitle>
                      <CardDescription>Tổng điểm mỗi tuần so với điểm gốc (Nề nếp + Học tập)</CardDescription>
                      {row && (
                        <CardAction className="text-right text-xs text-muted-foreground tabular-nums">
                          Nề nếp {row.conduct_score}
                          <br />
                          Học tập {row.study_score}
                        </CardAction>
                      )}
                    </CardHeader>
                    <CardContent>
                      {loadingData ? (
                        <TableSkeleton rows={3} />
                      ) : weeks.length === 0 ? (
                        <EmptyState title="Chưa có tuần nào trong khoảng này" />
                      ) : (
                        <WeeklyDeltaChart weeks={weeks} />
                      )}
                    </CardContent>
                  </Card>

                  {loadingData ? (
                    <Card className="py-0">
                      <TableSkeleton rows={6} />
                    </Card>
                  ) : (
                    <PointsCard points={points} student={selectedStudent} onClearStudent={() => setStudentId(undefined)} />
                  )}
                </div>

                <div className="grid gap-4">
                  <StudentBoard
                    title="Học sinh vi phạm"
                    description="theo số lần bị trừ điểm"
                    icon={TriangleAlert}
                    tone="below"
                    stats={violators}
                    numstudents={cls.numstudents}
                    selected={studentId}
                    onSelect={setStudentId}
                  />
                  <StudentBoard
                    title="Học sinh phấn đấu tốt"
                    description="theo số lần được cộng điểm"
                    icon={Award}
                    tone="above"
                    stats={achievers}
                    numstudents={cls.numstudents}
                    selected={studentId}
                    onSelect={setStudentId}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
