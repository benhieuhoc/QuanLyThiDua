"use client"

import { useState } from "react"
import { Pencil, Plus, SlidersHorizontal } from "lucide-react"
import { apiDelete, apiPost, apiPut } from "@/lib/api"
import { formatDate, formatRange, todayISO } from "@/lib/format"
import { isAdmin } from "@/lib/auth"
import type { CreatedSchoolYear, SchoolYear, Week } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useBranches, useClasses, useGrades, useSchoolYears, useWeeks, useMe } from "@/hooks/use-data"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ConfirmDelete, EmptyState, ErrorState, PageHeader, TableSkeleton, runMutation } from "@/components/common"
import { LockWeekButton, WeekStatus } from "@/components/scores"

// Giới hạn theo BE
const MAX_WEEKS = 60
const MAX_BASE = 1000

// "YYYY-YYYY", năm sau = năm trước + 1
const isValidYearName = (name: string) => {
  const match = /^(\d{4})-(\d{4})$/.exec(name.trim())
  return match !== null && Number(match[2]) === Number(match[1]) + 1
}

const isIntIn = (value: string, min: number, max: number) => {
  const n = Number(value)
  return value.trim() !== "" && Number.isInteger(n) && n >= min && n <= max
}

// Mặc định của BE khi chưa đặt tuần bắt đầu học kỳ 2
const defaultSemester2 = (numweeks: number) => Math.ceil(numweeks / 2) + 1

// Để trống = dùng mặc định; có giá trị thì từ tuần 2 đến tuần cuối
const isValidSemester2 = (value: string, numweeks: string) =>
  value.trim() === "" || (isIntIn(numweeks, 1, MAX_WEEKS) && isIntIn(value, 2, Number(numweeks)))

function Semester2Field({ id, value, onChange, numweeks }: { id: string; value: string; onChange: (v: string) => void; numweeks: string }) {
  const n = Number(numweeks)
  const invalid = !isValidSemester2(value, numweeks)
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Tuần bắt đầu học kỳ 2</Label>
      <Input
        id={id}
        type="number"
        min={2}
        max={isIntIn(numweeks, 1, MAX_WEEKS) ? n : MAX_WEEKS}
        value={value}
        placeholder={isIntIn(numweeks, 1, MAX_WEEKS) ? `Mặc định: tuần ${defaultSemester2(n)}` : ""}
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className={cn("text-xs", invalid ? "text-destructive" : "text-muted-foreground")}>
        {invalid
          ? `Từ tuần 2 đến tuần ${isIntIn(numweeks, 1, MAX_WEEKS) ? n : "cuối"}.`
          : "Để trống để dùng mặc định (nửa sau năm học)."}
      </p>
    </div>
  )
}

// Cộng ngày trên chuỗi "YYYY-MM-DD"; tính theo UTC để không lệch múi giờ
const addDays = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// Giới hạn số lớp khối 6 mới mỗi phân hiệu theo BE
const MAX_NEW_CLASSES = 30

// "6A1–6A8, 6B1–6B5": gom tên lớp liên tiếp theo tiền tố (khối + mã phân hiệu)
function classRanges(classes: { name: string }[]) {
  const groups = new Map<string, string[]>()
  for (const c of classes) {
    const prefix = c.name.replace(/\d+$/, "")
    groups.set(prefix, [...(groups.get(prefix) ?? []), c.name])
  }
  return [...groups.values()].map((names) => (names.length > 1 ? `${names[0]}–${names.at(-1)}` : names[0])).join(", ")
}

function promotionMessage(year: CreatedSchoolYear) {
  const p = year.promotion
  if (!p) return `Đã tạo năm học ${year.name} với ${year.numweeks} tuần`
  const created = p.created.length ? `tạo ${p.created.length} lớp 6 mới (${classRanges(p.created)})` : "không tạo lớp 6 mới"
  const accounts = p.deactivatedAccounts ? `, khóa ${p.deactivatedAccounts} tài khoản cờ đỏ` : ""
  return `Đã tạo năm học ${year.name}. Lên lớp từ ${p.fromschoolyear}: ${p.archived.length} lớp 9 ra trường, ${p.promoted} lớp lên khối, ${created}${accounts}.`
}

// latest: năm học mới nhất. Khi đã có năm cũ, BE chỉ cho tạo sau khi năm cũ kết thúc và tự lên lớp trong cùng request
function CreateSchoolYearDialog({ latest }: { latest?: SchoolYear }) {
  const branches = useBranches()
  const grades = useGrades()
  const classes = useClasses()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [startdate, setStartdate] = useState("")
  const [numweeks, setNumweeks] = useState("35")
  const [conductBase, setConductBase] = useState("100")
  const [studyBase, setStudyBase] = useState("100")
  const [semester2, setSemester2] = useState("")
  // Số lớp 6 mới người dùng đã sửa, theo branchid; chưa sửa thì lấy số lớp 6 hiện có
  const [grade6Input, setGrade6Input] = useState<Record<number, string>>({})
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)

  // latest chỉ có khi đã tải xong năm học (trên trình duyệt) nên gọi todayISO được
  const notEnded = latest !== undefined && latest.enddate >= todayISO()
  const minStart = latest ? addDays(latest.enddate, 1) : undefined
  const startTooEarly = minStart !== undefined && startdate !== "" && startdate < minStart

  // Khối đầu (6) và khối cuối (9) theo numgrade, như BE
  const sortedGrades = [...(grades.data ?? [])].sort((a, b) => a.numgrade - b.numgrade)
  const firstGrade = sortedGrades[0]
  const lastGrade = sortedGrades.at(-1)
  const active = classes.data ?? []
  const grade6Value = (branchid: number) =>
    grade6Input[branchid] ?? String(active.filter((c) => c.branchid === branchid && c.gradeid === firstGrade?.id).length)
  const grade6Valid = (branches.data ?? []).every((b) => isIntIn(grade6Value(b.id), 0, MAX_NEW_CLASSES))
  const newClasses = (branches.data ?? []).reduce((s, b) => s + (Number(grade6Value(b.id)) || 0), 0)
  const graduating = active.filter((c) => c.gradeid === lastGrade?.id).length
  // Chờ đủ dữ liệu để gửi grade6 đúng; lỗi tải thì không gửi (BE dùng số lớp 6 năm cũ)
  const promotionDataLoading = latest !== undefined && (branches.isLoading || grades.isLoading || classes.isLoading)
  const sendGrade6 = latest !== undefined && branches.data !== undefined && grades.data !== undefined && classes.data !== undefined

  const valid =
    !notEnded &&
    !startTooEarly &&
    isValidYearName(name) &&
    /^\d{4}-\d{2}-\d{2}$/.test(startdate) &&
    isIntIn(numweeks, 1, MAX_WEEKS) &&
    isIntIn(conductBase, 0, MAX_BASE) &&
    isIntIn(studyBase, 0, MAX_BASE) &&
    isValidSemester2(semester2, numweeks) &&
    (latest === undefined || (confirmed && !promotionDataLoading && (!sendGrade6 || grade6Valid)))

  const onOpenChange = (next: boolean) => {
    if (next) {
      setName("")
      setStartdate("")
      setNumweeks("35")
      setConductBase("100")
      setStudyBase("100")
      setSemester2("")
      setGrade6Input({})
      setConfirmed(false)
    }
    setOpen(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await runMutation(
      () =>
        apiPost<CreatedSchoolYear>("/school-years", {
          name: name.trim(),
          startdate,
          numweeks: Number(numweeks),
          conduct_base: Number(conductBase),
          study_base: Number(studyBase),
          ...(semester2.trim() && { semester2_week: Number(semester2) }),
          ...(sendGrade6 && {
            grade6: (branches.data ?? []).map((b) => ({ branchid: b.id, count: Number(grade6Value(b.id)) })),
          }),
        }),
      promotionMessage
    )
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Tạo năm học
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Tạo năm học</DialogTitle>
            <DialogDescription>
              Các tuần được tạo tự động, mỗi tuần 7 ngày liên tiếp tính từ ngày bắt đầu.
            </DialogDescription>
          </DialogHeader>
          {notEnded && latest && (
            <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Năm học {latest.name} chưa kết thúc (kết thúc ngày {formatDate(latest.enddate)}). Chỉ tạo được năm học mới
              sau ngày này.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="year-name">Tên năm học</Label>
              <Input id="year-name" value={name} placeholder="2027-2028" onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="year-start">Ngày bắt đầu</Label>
              <Input
                id="year-start"
                type="date"
                min={minStart}
                value={startdate}
                aria-invalid={startTooEarly}
                onChange={(e) => setStartdate(e.target.value)}
              />
            </div>
          </div>
          {name.trim() !== "" && !isValidYearName(name) && (
            <p className="-mt-2 text-xs text-destructive">Tên dạng YYYY-YYYY, năm sau bằng năm trước + 1.</p>
          )}
          {startTooEarly && latest && (
            <p className="-mt-2 text-xs text-destructive">
              Phải bắt đầu sau ngày kết thúc năm học {latest.name} ({formatDate(latest.enddate)}).
            </p>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="year-weeks">Số tuần</Label>
              <Input id="year-weeks" type="number" min={1} max={MAX_WEEKS} value={numweeks} onChange={(e) => setNumweeks(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="year-conduct">Gốc Nề nếp</Label>
              <Input id="year-conduct" type="number" min={0} max={MAX_BASE} value={conductBase} onChange={(e) => setConductBase(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="year-study">Gốc Học tập</Label>
              <Input id="year-study" type="number" min={0} max={MAX_BASE} value={studyBase} onChange={(e) => setStudyBase(e.target.value)} />
            </div>
          </div>
          <Semester2Field id="year-semester2" value={semester2} onChange={setSemester2} numweeks={numweeks} />
          {latest && (
            <fieldset className="grid gap-3 rounded-lg border border-border bg-white/60 p-3">
              <legend className="px-1 text-sm font-medium">Lên lớp từ năm học {latest.name}</legend>
              <p className="text-xs text-muted-foreground">
                Tạo năm học sẽ lên lớp: lớp 9 ra trường (lưu trữ, bỏ GVCN, khóa tài khoản cờ đỏ của học sinh), lớp 6–8
                lên một khối giữ nguyên học sinh và GVCN, tạo lớp 6 mới chưa có GVCN và học sinh. Năm cũ đã lên lớp rồi
                thì không lên lớp lần nữa.
              </p>
              {promotionDataLoading ? (
                <TableSkeleton rows={2} />
              ) : !sendGrade6 ? (
                <p className="text-xs text-amber-700">
                  Không tải được danh sách phân hiệu / lớp: mỗi phân hiệu sẽ tạo số lớp 6 bằng năm cũ.
                </p>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(branches.data ?? []).map((b) => {
                      const value = grade6Value(b.id)
                      return (
                        <div key={b.id} className="grid gap-1">
                          <Label htmlFor={`grade6-${b.id}`}>Số lớp 6 mới · {b.name}</Label>
                          <Input
                            id={`grade6-${b.id}`}
                            type="number"
                            min={0}
                            max={MAX_NEW_CLASSES}
                            value={value}
                            aria-invalid={!isIntIn(value, 0, MAX_NEW_CLASSES)}
                            onChange={(e) => setGrade6Input((s) => ({ ...s, [b.id]: e.target.value }))}
                          />
                        </div>
                      )
                    })}
                  </div>
                  {!grade6Valid && <p className="text-xs text-destructive">Số lớp 6 mới mỗi phân hiệu từ 0 đến {MAX_NEW_CLASSES}.</p>}
                  <p className="text-xs text-muted-foreground">
                    Dự kiến: {graduating} lớp 9 ra trường, {active.length - graduating} lớp lên khối, tạo {newClasses} lớp 6 mới.
                  </p>
                </>
              )}
              <Label className="flex items-start gap-2 font-normal">
                <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-0.5" />
                <span>
                  Tôi hiểu thao tác lên lớp <strong>không hoàn tác được</strong> (xóa năm học mới cũng không đưa lớp về khối cũ).
                </span>
              </Label>
            </fieldset>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
            <Button type="submit" disabled={!valid || pending}>
              {pending ? "Đang tạo..." : latest ? "Tạo năm học và lên lớp" : "Tạo năm học"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditSchoolYearDialog({ year }: { year: SchoolYear }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [numweeks, setNumweeks] = useState("")
  const [semester2, setSemester2] = useState("")
  const [pending, setPending] = useState(false)

  const valid = isValidYearName(name) && isIntIn(numweeks, 1, MAX_WEEKS) && isValidSemester2(semester2, numweeks)
  const shrinking = isIntIn(numweeks, 1, MAX_WEEKS) && Number(numweeks) < year.numweeks

  const onOpenChange = (next: boolean) => {
    if (next) {
      setName(year.name)
      setNumweeks(String(year.numweeks))
      setSemester2(String(year.semester2_week))
    }
    setOpen(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await runMutation(
      () =>
        apiPut(`/school-years/${year.id}`, {
          name: name.trim(),
          numweeks: Number(numweeks),
          // Chỉ gửi khi đổi, để năm học đang dùng mặc định không bị cố định số tuần; để trống = về mặc định của BE
          ...(semester2 !== String(year.semester2_week) && {
            semester2_week: semester2.trim() ? Number(semester2) : null,
          }),
        }),
      "Đã cập nhật năm học"
    )
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Sửa năm học ${year.name}`} className="text-muted-foreground">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Sửa năm học</DialogTitle>
            <DialogDescription>Tăng số tuần sẽ tạo thêm tuần ở cuối, lấy điểm gốc theo tuần cuối hiện tại.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-year-name">Tên năm học</Label>
              <Input id="edit-year-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-year-weeks">Số tuần</Label>
              <Input id="edit-year-weeks" type="number" min={1} max={MAX_WEEKS} value={numweeks} onChange={(e) => setNumweeks(e.target.value)} />
            </div>
          </div>
          {shrinking && (
            <p className="text-xs text-amber-700">
              Sẽ xóa tuần {Number(numweeks) + 1}–{year.numweeks}. Không xóa được nếu các tuần này đã có điểm.
            </p>
          )}
          <Semester2Field id="edit-year-semester2" value={semester2} onChange={setSemester2} numweeks={numweeks} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
            <Button type="submit" disabled={!valid || pending}>
              {pending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Tuần đã khóa phải mở khóa trước mới đổi được điểm gốc
function EditWeekBaseDialog({ week }: { week: Week }) {
  const [open, setOpen] = useState(false)
  const [conductBase, setConductBase] = useState("")
  const [studyBase, setStudyBase] = useState("")
  const [applyToNext, setApplyToNext] = useState(false)
  const [pending, setPending] = useState(false)

  const valid = isIntIn(conductBase, 0, MAX_BASE) && isIntIn(studyBase, 0, MAX_BASE)

  const onOpenChange = (next: boolean) => {
    if (next) {
      setConductBase(String(week.conduct_base))
      setStudyBase(String(week.study_base))
      setApplyToNext(false)
    }
    setOpen(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await runMutation(
      () =>
        apiPut(`/weeks/${week.id}`, {
          conduct_base: Number(conductBase),
          study_base: Number(studyBase),
          applyToNext,
        }),
      applyToNext ? `Đã đổi điểm gốc từ tuần ${week.numweek}` : `Đã đổi điểm gốc tuần ${week.numweek}`
    )
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Sửa điểm gốc tuần ${week.numweek}`}
          title={week.locked ? "Mở khóa tuần để sửa điểm gốc" : undefined}
          className="text-muted-foreground"
          disabled={week.locked}
        >
          <SlidersHorizontal />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Điểm gốc tuần {week.numweek}</DialogTitle>
            <DialogDescription>
              {formatRange(week.startdate, week.enddate)}. Điểm của lớp = điểm gốc + các lượt cộng/trừ.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="week-conduct">Nề nếp</Label>
              <Input id="week-conduct" type="number" min={0} max={MAX_BASE} value={conductBase} onChange={(e) => setConductBase(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="week-study">Học tập</Label>
              <Input id="week-study" type="number" min={0} max={MAX_BASE} value={studyBase} onChange={(e) => setStudyBase(e.target.value)} />
            </div>
          </div>
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={applyToNext} onCheckedChange={(v) => setApplyToNext(v === true)} />
            Áp dụng cho các tuần sau chưa khóa
          </Label>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
            <Button type="submit" disabled={!valid || pending}>
              {pending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function WeeksTable({ year }: { year: SchoolYear }) {
  const weeks = useWeeks(year.id)
  // Chỉ admin được sửa điểm gốc, khóa tuần
  const canEdit = isAdmin(useMe().data)

  if (weeks.error) return <ErrorState error={weeks.error} onRetry={() => weeks.mutate()} />
  if (weeks.isLoading) return <TableSkeleton rows={8} />
  if (!weeks.data?.length) return <EmptyState title="Năm học chưa có tuần" />

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">Tuần</TableHead>
          <TableHead>Thời gian</TableHead>
          <TableHead className="text-right">Gốc Nề nếp</TableHead>
          <TableHead className="text-right">Gốc Học tập</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Lượt chấm</TableHead>
          <TableHead>Trạng thái</TableHead>
          {canEdit && <TableHead className="pr-4" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {weeks.data.map((w) => (
          <TableRow key={w.id}>
            <TableCell className="pl-4 font-medium">Tuần {w.numweek}</TableCell>
            <TableCell className="text-muted-foreground">{formatRange(w.startdate, w.enddate)}</TableCell>
            <TableCell className="text-right tabular-nums">{w.conduct_base}</TableCell>
            <TableCell className="text-right tabular-nums">{w.study_base}</TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">{w.entries}</TableCell>
            <TableCell>
              <WeekStatus week={w} />
            </TableCell>
            {canEdit && (
              <TableCell className="pr-4">
                <div className="flex justify-end gap-1">
                  <EditWeekBaseDialog week={w} />
                  <LockWeekButton week={w} />
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function SchoolYearsView() {
  const years = useSchoolYears()
  const [yearId, setYearId] = useState<number>()
  const selected = years.data?.find((y) => y.id === yearId) ?? years.data?.[0]
  // Năm học mới nhất theo ngày bắt đầu (chuỗi "YYYY-MM-DD" so sánh được), như BE dùng khi tạo năm mới
  const latest = years.data?.reduce<SchoolYear | undefined>((a, y) => (!a || y.startdate > a.startdate ? y : a), undefined)
  // Chỉ admin được tạo / sửa / xóa năm học
  const canEdit = isAdmin(useMe().data)

  return (
    <>
      <PageHeader
        title="Năm học & tuần"
        description={
          canEdit
            ? "Tạo năm học, đặt điểm gốc từng tuần và khóa tuần đã chấm xong."
            : "Các năm học, điểm gốc và trạng thái khóa của từng tuần."
        }
        actions={canEdit && years.data && <CreateSchoolYearDialog latest={latest} />}
      />

      {years.error ? (
        <Card className="py-0">
          <ErrorState error={years.error} onRetry={() => years.mutate()} />
        </Card>
      ) : years.isLoading ? (
        <Card className="py-0">
          <TableSkeleton />
        </Card>
      ) : !years.data?.length || !selected ? (
        <Card className="py-0">
          <EmptyState
            title="Chưa có năm học"
            description={canEdit ? "Tạo năm học đầu tiên để bắt đầu chấm điểm thi đua." : undefined}
          />
        </Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="gap-0 py-0">
            <ul className="divide-y divide-border/70">
              {years.data.map((y) => (
                <li key={y.id} className={cn("flex items-center gap-1 pr-2", y.id === selected.id && "bg-primary/10")}>
                  <button
                    type="button"
                    onClick={() => setYearId(y.id)}
                    aria-current={y.id === selected.id ? "true" : undefined}
                    className="min-w-0 flex-1 px-4 py-3 text-left"
                  >
                    <p className="font-semibold">{y.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(y.startdate)} – {formatDate(y.enddate)} · {y.numweeks} tuần
                    </p>
                    <p className="text-xs text-muted-foreground">
                      HK1: tuần 1–{y.semester2_week - 1} · HK2: tuần {y.semester2_week}–{y.numweeks}
                    </p>
                  </button>
                  {canEdit && (
                    <>
                      <EditSchoolYearDialog year={y} />
                      <ConfirmDelete
                        title={`Xóa năm học ${y.name}?`}
                        description="Xóa cả các tuần của năm học. Chỉ xóa được khi chưa có điểm thi đua và không có lớp ra trường gắn với năm học. Xóa không hoàn tác lên lớp."
                        onConfirm={() => apiDelete(`/school-years/${y.id}`)}
                      />
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="gap-0 py-0">
            <div className="border-b border-border/70 px-4 py-3">
              <p className="font-medium">Các tuần năm học {selected.name}</p>
              <p className="text-xs text-muted-foreground">
                Tuần đã khóa không thể chấm thêm hay đổi điểm gốc.{canEdit && " Mở khóa để sửa."}
              </p>
            </div>
            <WeeksTable year={selected} />
          </Card>
        </div>
      )}
    </>
  )
}
