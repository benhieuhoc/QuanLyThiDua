"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { ChartColumn, Eye, Info, Lock, Pencil, Search, X } from "lucide-react"
import { apiDelete, apiPost, apiPut } from "@/lib/api"
import { canManagePoint, canScoreClass, isAdmin } from "@/lib/auth"
import { clampDate, formatDate, formatRange, formatSigned, todayISO } from "@/lib/format"
import {
  POINT_TYPES,
  type Account,
  type Point,
  type PointStudent,
  type PointType,
  type Rule,
  type Score,
  type Week,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { useMe, usePoints, useRules, useStudents, useWeeklyScore, type ScoreScope } from "@/hooks/use-data"
import { useWeekPicker } from "@/hooks/use-week-picker"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { ConfirmDelete, EmptyState, ErrorState, PageHeader, TableSkeleton, TeacherName, runMutation } from "@/components/common"
import { canAccessPath } from "@/components/layout/nav"
import {
  ClassName,
  LockWeekButton,
  PointTypeSelect,
  RankBadge,
  ScopeFilter,
  SignedValue,
  WeekPickerControls,
  WeekStatus,
} from "@/components/scores"

// Điểm của lượt chấm: điểm 1 lần của mục × số học sinh được gắn (ít nhất 1). BE không tự nhân
const pointValue = (rule: Rule, n: number) => rule.value * Math.max(1, n)

// Ngày mặc định: hôm nay kẹp vào tuần (tuần đã qua → ngày cuối, tuần chưa tới → ngày đầu)
const defaultPointDate = (week: Week) => clampDate(todayISO(), week.startdate, week.enddate)

const inWeek = (date: string, week: Week) => Boolean(date) && date >= week.startdate && date <= week.enddate

// Thời điểm nhập "HH:mm DD/MM/YYYY"; lượt nhập trước khi có giờ nhập (enteredtime "00:00") chỉ hiện ngày
const formatEntered = (p: Point) =>
  p.enteredtime === "00:00" ? formatDate(p.entereddate) : `${p.enteredtime} ${formatDate(p.entereddate)}`

// Bỏ dấu tiếng Việt + chữ thường theo từng ký tự để giữ nguyên độ dài chuỗi (vị trí tô đậm khớp với chuỗi gốc)
function foldVietnamese(text: string) {
  return Array.from(text)
    .map((ch) => {
      const folded = ch === "đ" || ch === "Đ" ? "d" : ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
      return folded.length === ch.length ? folded : ch
    })
    .join("")
}

function ValuePreview({ rule, count }: { rule?: Rule; count: number }) {
  if (!rule) return null
  return (
    <p className="text-sm text-muted-foreground">
      Điểm: <SignedValue value={pointValue(rule, count)} />
      {count > 1 && (
        <span className="tabular-nums">
          {" "}({formatSigned(rule.value)} × {count} học sinh)
        </span>
      )}
    </p>
  )
}

// Ô chọn mục quy chế có lọc theo nội dung (không phân biệt hoa thường, không phân biệt dấu)
function RuleCombobox({
  id,
  rules,
  value,
  onChange,
  placeholder = "Gõ để tìm mục quy chế",
}: {
  id?: string
  rules: Rule[]
  value?: Rule
  onChange: (id: number) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()

  const keyword = foldVietnamese(query.trim())
  const matches = rules.filter((r) => !keyword || foldVietnamese(r.content).includes(keyword))
  const highlighted = Math.min(active, matches.length - 1)

  const choose = (rule: Rule) => {
    onChange(rule.id)
    setQuery("")
    setActive(0)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      setOpen(true)
      const step = e.key === "ArrowDown" ? 1 : -1
      setActive((highlighted + step + matches.length) % Math.max(matches.length, 1))
    } else if (e.key === "Enter" && open) {
      // Chọn mục đang tô sáng thay vì gửi form
      e.preventDefault()
      if (matches[highlighted]) choose(matches[highlighted])
    } else if (e.key === "Escape" && open) {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[highlighted] ? `${listId}-${matches[highlighted].id}` : undefined}
        // Đóng: hiện mục đã chọn; mở: hiện từ khóa đang gõ
        value={open ? query : (value?.content ?? "")}
        autoComplete="off"
        placeholder={open && value ? value.content : placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={cn("bg-white/70 pl-8", !open && value && "pr-12")}
      />
      {!open && value && (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
          <SignedValue value={value.value} />
        </span>
      )}
      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
          <p className="border-b border-border/70 px-3 py-1.5 text-xs text-muted-foreground">
            {keyword ? `${matches.length} kết quả` : `${matches.length} mục`}
          </p>
          {matches.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Không có mục phù hợp</p>
          ) : (
            // Giữ focus ở ô tìm kiếm khi bấm chọn
            <ul id={listId} role="listbox" aria-label="Mục quy chế" className="max-h-64 overflow-y-auto p-1" onMouseDown={(e) => e.preventDefault()}>
              {matches.map((r, i) => (
                <li
                  key={r.id}
                  id={`${listId}-${r.id}`}
                  role="option"
                  aria-selected={i === highlighted}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(r)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
                    i === highlighted && "bg-accent text-accent-foreground",
                    r.id === value?.id && "font-medium"
                  )}
                >
                  <span className="min-w-0 flex-1 break-words">
                    <Highlight text={r.content} keyword={keyword} fold={foldVietnamese} />
                    {!r.active && <span className="text-xs text-muted-foreground"> (ngừng áp dụng)</span>}
                  </span>
                  <SignedValue value={r.value} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// Mục quy chế cùng phần, đang áp dụng; keepId: mục đang gắn sẵn trên lượt chấm (vẫn chọn được dù đã ngừng)
function RuleSelect({
  id,
  type,
  value,
  onChange,
  keepId,
  placeholder,
}: {
  id?: string
  type: PointType
  value?: number
  onChange: (id: number) => void
  keepId?: number | null
  placeholder?: string
}) {
  const rules = useRules()
  const isAdminUser = isAdmin(useMe().data)

  if (rules.error) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive">
        <span className="flex-1">Không tải được quy chế thi đua.</span>
        <Button type="button" variant="outline" size="sm" onClick={() => rules.mutate()}>
          Thử lại
        </Button>
      </div>
    )
  }
  if (!rules.data) return <Input id={id} disabled placeholder="Đang tải quy chế..." className="bg-white/70" />

  const options = rules.data.filter((r) => r.type === type && (r.active || r.id === keepId))
  if (options.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
        Chưa có mục quy chế {type} nào đang áp dụng.{" "}
        {isAdminUser ? (
          <Link href="/quy-che" className="font-medium text-primary underline-offset-4 hover:underline">
            Thêm mục quy chế
          </Link>
        ) : (
          "Liên hệ giáo viên quản lý nề nếp."
        )}
      </p>
    )
  }
  return (
    <RuleCombobox
      id={id}
      rules={options}
      value={options.find((r) => r.id === value)}
      onChange={onChange}
      placeholder={placeholder}
    />
  )
}

// Ngày diễn ra, giới hạn trong tuần (BE trả 400 khi ngoài tuần)
function PointDateInput({ id, week, value, onChange }: { id: string; week: Week; value: string; onChange: (v: string) => void }) {
  const invalid = !inWeek(value, week)
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Ngày</Label>
      <Input
        id={id}
        type="date"
        min={week.startdate}
        max={week.enddate}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className="w-40 bg-white/70"
      />
      {invalid && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          Chọn ngày trong tuần {week.numweek} ({formatRange(week.startdate, week.enddate)})
        </p>
      )}
    </div>
  )
}

// Chọn nhiều học sinh của lớp đang chấm (tìm theo tên/mã). Giá trị giữ cả tên để hiển thị
// học sinh đã gắn từ trước nhưng nay đã chuyển lớp (BE vẫn cho giữ khi sửa)
function StudentPicker({
  classid,
  value,
  onChange,
  id,
}: {
  classid: number
  value: PointStudent[]
  onChange: (v: PointStudent[]) => void
  id?: string
}) {
  const students = useStudents({ classid })
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()

  const keyword = query.trim().toLowerCase()
  const selectedIds = new Set(value.map((st) => st.id))
  const matches = (students.data ?? []).filter(
    (st) =>
      !selectedIds.has(st.id) &&
      (!keyword || st.name.toLowerCase().includes(keyword) || st.code.toLowerCase().includes(keyword))
  )
  const highlighted = Math.min(active, matches.length - 1)
  const expanded = open && Boolean(students.data)

  const add = (st: PointStudent) => {
    onChange([...value, { id: st.id, code: st.code, name: st.name }])
    setQuery("")
    setActive(0)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      setOpen(true)
      const step = e.key === "ArrowDown" ? 1 : -1
      setActive((highlighted + step + matches.length) % Math.max(matches.length, 1))
    } else if (e.key === "Enter" && expanded) {
      // Chọn học sinh đang tô sáng thay vì gửi form
      e.preventDefault()
      if (matches[highlighted]) add(matches[highlighted])
    } else if (e.key === "Escape" && expanded) {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === "Backspace" && !query && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="grid gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Học sinh đã chọn">
          {value.map((st) => (
            <li
              key={st.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pr-0.5 pl-2.5 text-xs font-medium text-primary"
            >
              {st.name}
              <button
                type="button"
                aria-label={`Bỏ ${st.name}`}
                onClick={() => onChange(value.filter((x) => x.id !== st.id))}
                className="flex size-5 items-center justify-center rounded-full transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && matches[highlighted] ? `${listId}-${matches[highlighted].id}` : undefined}
          value={query}
          autoComplete="off"
          disabled={Boolean(students.error)}
          placeholder={students.isLoading ? "Đang tải học sinh..." : "Tìm theo tên hoặc mã HS"}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="bg-white/70 pl-8"
        />
        {expanded && (
          <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
            <p className="border-b border-border/70 px-3 py-1.5 text-xs text-muted-foreground">
              {keyword ? `${matches.length} kết quả` : `${matches.length} học sinh chưa chọn`}
            </p>
            {matches.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {keyword ? "Không có học sinh phù hợp" : "Đã chọn tất cả học sinh của lớp"}
              </p>
            ) : (
              // Giữ focus ở ô tìm kiếm khi bấm chọn
              <ul id={listId} role="listbox" aria-label="Học sinh của lớp" className="max-h-64 overflow-y-auto p-1" onMouseDown={(e) => e.preventDefault()}>
                {matches.map((st, i) => (
                  <li
                    key={st.id}
                    id={`${listId}-${st.id}`}
                    role="option"
                    aria-selected={i === highlighted}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => add(st)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
                      i === highlighted && "bg-accent text-accent-foreground"
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                    >
                      {st.name.trim().split(/\s+/).pop()?.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <Highlight text={st.name} keyword={keyword} />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      <Highlight text={st.code} keyword={keyword} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {students.error && <p className="text-xs text-destructive">Không tải được danh sách học sinh của lớp.</p>}
    </div>
  )
}

// Tô đậm phần khớp từ khóa; fold chuẩn hóa chuỗi trước khi so (mặc định: không phân biệt hoa thường),
// phải giữ nguyên độ dài chuỗi để vị trí khớp đúng với chuỗi gốc
function Highlight({
  text,
  keyword,
  fold = (s) => s.toLowerCase(),
}: {
  text: string
  keyword: string
  fold?: (s: string) => string
}) {
  const index = keyword ? fold(text).indexOf(keyword) : -1
  if (index < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-primary/15 font-semibold text-inherit">{text.slice(index, index + keyword.length)}</mark>
      {text.slice(index + keyword.length)}
    </>
  )
}

// Form thêm nhanh: giữ phần, mục và ngày sau khi thêm để nhập liên tiếp
function AddPointForm({ week, score }: { week: Week; score: Score }) {
  const rules = useRules()
  const [type, setType] = useState<PointType>("Nề nếp")
  const [ruleid, setRuleid] = useState<number>()
  const [students, setStudents] = useState<PointStudent[]>([])
  const [pointdate, setPointdate] = useState(() => defaultPointDate(week))
  const [pending, setPending] = useState(false)

  // Đổi lớp thì bỏ học sinh đã chọn (BE chỉ cho gắn học sinh của lớp được chấm); phần, mục, ngày vẫn giữ
  const [classid, setClassid] = useState(score.classid)
  if (classid !== score.classid) {
    setClassid(score.classid)
    setStudents([])
  }
  // Đổi tuần thì đặt lại ngày mặc định của tuần mới
  const [weekid, setWeekid] = useState(week.id)
  if (weekid !== week.id) {
    setWeekid(week.id)
    setPointdate(defaultPointDate(week))
  }

  // Mục vừa bị ngừng áp dụng (sau khi tải lại) coi như chưa chọn
  const rule = rules.data?.find((r) => r.id === ruleid && r.active && r.type === type)
  const valid = Boolean(rule) && inWeek(pointdate, week)

  const changeType = (next: PointType) => {
    setType(next)
    setRuleid(undefined)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rule || !valid) return
    const value = pointValue(rule, students.length)
    setPending(true)
    const ok = await runMutation(
      () =>
        apiPost("/points", {
          weekid: week.id,
          classid: score.classid,
          ruleid: rule.id,
          value,
          pointdate,
          studentIds: students.map((st) => st.id),
        }),
      `Đã chấm ${formatSigned(value)} ${type} cho lớp ${score.classname}`
    )
    setPending(false)
    if (ok) setStudents([])
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border/70 bg-white/50 p-4">
      <p className="text-sm font-medium">Thêm lượt chấm</p>
      <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
        <div className="grid gap-1.5">
          <Label htmlFor="point-type">Phần</Label>
          <PointTypeSelect id="point-type" value={type} onChange={changeType} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="point-rule">Mục quy chế</Label>
          <RuleSelect id="point-rule" type={type} value={ruleid} onChange={setRuleid} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="point-students">
          Học sinh <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
        </Label>
        <StudentPicker id="point-students" classid={score.classid} value={students} onChange={setStudents} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <PointDateInput id="point-date" week={week} value={pointdate} onChange={setPointdate} />
        <div className="pb-2">
          <ValuePreview rule={rule} count={students.length} />
        </div>
        <Button type="submit" className="ml-auto" disabled={!valid || pending}>
          {pending ? "Đang lưu..." : "Thêm"}
        </Button>
      </div>
    </form>
  )
}

function EditPointDialog({ point, week }: { point: Point; week: Week }) {
  const [open, setOpen] = useState(false)
  // Khởi tạo lại form mỗi lần mở bằng key
  const [version, setVersion] = useState(0)

  const onOpenChange = (next: boolean) => {
    if (next) setVersion((v) => v + 1)
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Sửa lượt chấm" className="text-muted-foreground">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <EditPointForm key={version} point={point} week={week} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

const sortedIds = (list: { id: number }[]) => list.map((x) => x.id).sort((a, b) => a - b).join()

// Chỉ gửi trường thay đổi: bỏ trường thì BE giữ nguyên
function EditPointForm({ point, week, onDone }: { point: Point; week: Week; onDone: () => void }) {
  const rules = useRules()
  const original = point.ruleid ?? undefined
  const [type, setType] = useState<PointType>(point.type)
  const [ruleid, setRuleid] = useState<number | undefined>(original)
  const [students, setStudents] = useState<PointStudent[]>(point.students)
  const [pointdate, setPointdate] = useState(point.pointdate)
  const [pending, setPending] = useState(false)

  const rule = rules.data?.find((r) => r.id === ruleid)
  const ruleChanged = ruleid !== original
  const countChanged = students.length !== point.students.length
  const studentsChanged = sortedIds(students) !== sortedIds(point.students)
  const dateChanged = pointdate !== point.pointdate
  // Tính lại điểm khi đổi mục hoặc đổi số học sinh; lượt nhập tự do cũ (không có mục) giữ điểm cũ
  const recompute = ruleChanged || (countChanged && ruleid !== undefined)

  const body: Record<string, unknown> = {}
  if (studentsChanged) body.studentIds = students.map((st) => st.id)
  if (ruleChanged && rule) {
    body.ruleid = rule.id
    body.type = rule.type
  }
  if (recompute && rule) body.value = pointValue(rule, students.length)
  if (dateChanged) body.pointdate = pointdate

  // Đổi phần thì bắt buộc chọn mục của phần mới; cần mục đã tải để tính lại điểm
  const valid =
    inWeek(pointdate, week) && (type === point.type || ruleChanged) && (!recompute || (rule !== undefined && rule.type === type))
  const dirty = Object.keys(body).length > 0

  // Quay lại phần cũ thì khôi phục mục cũ
  const changeType = (next: PointType) => {
    setType(next)
    setRuleid(next === point.type ? original : undefined)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || !dirty) return
    setPending(true)
    const ok = await runMutation(() => apiPut(`/points/${point.id}`, body), "Đã cập nhật lượt chấm")
    setPending(false)
    if (ok) onDone()
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Sửa lượt chấm</DialogTitle>
        <DialogDescription>Lớp {point.classname} · tuần {point.numweek}</DialogDescription>
      </DialogHeader>
      <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm">
        <span className="min-w-0 flex-1 break-words">
          <span className="text-muted-foreground">{point.ruleid === null ? "Nhập tự do: " : "Hiện tại: "}</span>
          {point.content}
        </span>
        <SignedValue value={point.value} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-point-type">Phần</Label>
        <PointTypeSelect id="edit-point-type" value={type} onChange={changeType} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-point-rule">Mục quy chế</Label>
        <RuleSelect
          id="edit-point-rule"
          type={type}
          value={ruleid}
          onChange={setRuleid}
          keepId={point.ruleid}
          placeholder={point.ruleid === null && type === point.type ? "Giữ nội dung nhập tự do" : undefined}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-point-students">Học sinh</Label>
        <StudentPicker id="edit-point-students" classid={point.classid} value={students} onChange={setStudents} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <PointDateInput id="edit-point-date" week={week} value={pointdate} onChange={setPointdate} />
        {recompute && (
          <div className="pb-2">
            <ValuePreview rule={rule} count={students.length} />
          </div>
        )}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Hủy</Button>
        </DialogClose>
        <Button type="submit" disabled={!valid || !dirty || pending}>
          {pending ? "Đang lưu..." : "Lưu"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Điểm 1 phần: gốc + cộng − trừ = điểm
function PartSummary({ label, base, plus, minus, score }: { label: string; base: number; plus: number; minus: number; score: number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-white/50 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{score}</p>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        Gốc {base} · <span className="text-emerald-600">+{plus}</span> · <span className="text-rose-600">−{minus}</span>
      </p>
    </div>
  )
}

function PointList({ week, score }: { week: Week; score: Score }) {
  const points = usePoints(week.id, score.classid)
  const me = useMe().data

  if (points.error) return <ErrorState error={points.error} onRetry={() => points.mutate()} />
  if (points.isLoading) return <TableSkeleton rows={3} />

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {POINT_TYPES.map((type) => {
        const items = points.data?.filter((p) => p.type === type) ?? []
        return (
          <div key={type}>
            <p className="mb-2 text-sm font-medium">
              {type} <span className="text-muted-foreground">({items.length})</span>
            </p>
            {items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                Chưa có lượt chấm
              </p>
            ) : (
              <ul className="divide-y divide-border/70 rounded-lg border border-border/70 bg-white/50">
                {items.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 py-1.5 pr-1 pl-3">
                    <span className="min-w-0 flex-1 text-sm break-words">
                      {p.content}
                      {p.students.length > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {p.students.map((st) => st.name).join(", ")}
                        </span>
                      )}
                      <span className="block text-xs text-muted-foreground/80">
                        Người nhập: {p.accountusername ?? "Không rõ"} · {formatEntered(p)}
                      </span>
                    </span>
                    <SignedValue value={p.value} />
                    {!week.locked && canManagePoint(me, p) && (
                      <div className="flex">
                        <EditPointDialog point={p} week={week} />
                        <ConfirmDelete
                          title="Xóa lượt chấm?"
                          description={`${p.content} (${p.value > 0 ? "+" : ""}${p.value}) của lớp ${p.classname}.`}
                          onConfirm={() => apiDelete(`/points/${p.id}`)}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

const NO_CLASS_MESSAGE = "Bạn chưa được phân công lớp chấm điểm, liên hệ giáo viên quản lý nề nếp."

// Lý do không chấm được lớp đang xem
function readOnlyReason(me: Account | undefined) {
  if (me?.kind === "codo") {
    return me.classes.length
      ? `Bạn chỉ chấm được lớp được phân công: ${me.classes.map((c) => c.name).join(", ")}.`
      : NO_CLASS_MESSAGE
  }
  return "Bạn không có quyền chấm lớp này."
}

function ClassPanel({ week, score }: { week: Week; score: Score }) {
  const me = useMe().data
  const canScore = canScoreClass(me, score.classid)

  return (
    <Card className="gap-5 px-5 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <ClassName name={score.classname} className="px-3 text-lg" />
        <div className="min-w-0">
          <p className="font-medium">{score.teachername ? `GVCN ${score.teachername}` : "Chưa có GVCN"}</p>
          <p className="text-xs text-muted-foreground">Tuần {week.numweek} · {score.entries} lượt chấm</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          {me && canAccessPath(me.kind, "/diem-lop") && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/diem-lop?lop=${score.classid}`}>
                <ChartColumn /> Chi tiết lớp
              </Link>
            </Button>
          )}
          Hạng <RankBadge rank={score.rank} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <PartSummary label="Nề nếp" base={score.conduct_base} plus={score.conduct_plus} minus={score.conduct_minus} score={score.conduct_score} />
        <PartSummary label="Học tập" base={score.study_base} plus={score.study_plus} minus={score.study_minus} score={score.study_score} />
        <div className="rounded-xl bg-primary/10 p-4">
          <p className="text-sm text-primary/80">Tổng điểm</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-primary tabular-nums">{score.total}</p>
          <p className="mt-1 text-xs text-primary/70">Nề nếp + Học tập</p>
        </div>
      </div>

      {/* GVCN chỉ xem: ẩn toàn bộ phần thêm lượt chấm (trạng thái khóa tuần đã có badge ở header) */}
      {me?.kind === "gvcn" ? null : week.locked ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-muted/50 p-4 text-sm">
          <Lock className="size-4 text-muted-foreground" />
          <span className="flex-1">Tuần {week.numweek} đã khóa, không thể thêm, sửa hay xóa lượt chấm.</span>
          <LockWeekButton week={week} />
        </div>
      ) : canScore ? (
        <AddPointForm week={week} score={score} />
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/50 p-4 text-sm">
          <Eye className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1">Chỉ xem. {readOnlyReason(me)}</span>
        </div>
      )}

      <PointList week={week} score={score} />
    </Card>
  )
}

export function ScoringView() {
  const picker = useWeekPicker()
  const week = picker.week
  // Danh sách lớp lọc ở client để hạng hiển thị luôn là hạng toàn trường
  const weekly = useWeeklyScore(week?.id)
  const [scope, setScope] = useState<ScoreScope>({})
  const [classId, setClassId] = useState<number>()
  const me = useMe().data
  const isAdmin = me?.kind === "admin"
  const isCodo = me?.kind === "codo"
  // Cờ đỏ: mặc định chỉ hiện lớp được phân công, bỏ chọn để xem bảng điểm mọi lớp. GVCN chỉ xem nên không lọc
  const [onlyMine, setOnlyMine] = useState(true)
  const filterMine = isCodo && onlyMine
  const noClass = isCodo && me.classes.length === 0

  const rows = (weekly.data?.scores ?? [])
    .filter((s) => (!scope.branchid || s.branchid === scope.branchid) && (!scope.gradeid || s.gradeid === scope.gradeid))
    .filter((s) => !filterMine || canScoreClass(me, s.classid))
    .sort((a, b) => a.numgrade - b.numgrade || a.branchcode.localeCompare(b.branchcode) || a.seq - b.seq)
  // Mặc định: lớp được chấm đầu tiên (cờ đỏ), lớp chủ nhiệm (GVCN), còn lại lớp đầu danh sách
  const selected =
    rows.find((s) => s.classid === classId) ??
    rows.find((s) => canScoreClass(me, s.classid) || s.classid === me?.homeroomclassid) ??
    rows[0]
  const unscored = rows.filter((s) => s.entries === 0).length

  const error = picker.error ?? weekly.error

  return (
    <>
      <PageHeader
        title="Chấm điểm thi đua"
        description={
          week
            ? `Tuần ${week.numweek} (${formatRange(week.startdate, week.enddate)}) · năm học ${week.schoolyearname}`
            : "Chọn năm học và tuần để chấm điểm Nề nếp, Học tập cho từng lớp."
        }
        actions={
          <>
            {week && <WeekStatus week={week} />}
            {week && <LockWeekButton week={week} size="default" />}
            <WeekPickerControls picker={picker} />
          </>
        }
      />

      {error ? (
        <Card className="py-0">
          <ErrorState error={error} onRetry={() => (picker.error ? picker.schoolYears.mutate() : weekly.mutate())} />
        </Card>
      ) : picker.isLoading ? (
        <Card className="py-0">
          <TableSkeleton />
        </Card>
      ) : !picker.schoolYears.data?.length ? (
        <Card className="py-0">
          <EmptyState
            title="Chưa có năm học"
            description={isAdmin ? "Tạo năm học để sinh các tuần trước khi chấm điểm." : undefined}
            action={
              isAdmin && (
                <Button asChild>
                  <Link href="/nam-hoc">Tạo năm học</Link>
                </Button>
              )
            }
          />
        </Card>
      ) : !week ? (
        <Card className="py-0">
          <EmptyState title="Năm học chưa có tuần" />
        </Card>
      ) : (
        <>
          {noClass && (
            <Card className="mb-4 flex-row items-center gap-3 border-amber-500/30 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
              <Info className="size-4 shrink-0" />
              {NO_CLASS_MESSAGE}
            </Card>
          )}
          <div className="grid items-start gap-4 lg:grid-cols-[300px_1fr]">
            <Card className="gap-0 py-0">
              <div className="flex flex-col gap-2 border-b border-border/70 p-3">
                <ScopeFilter value={scope} onChange={setScope} />
                {isCodo && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={onlyMine} onCheckedChange={(v) => setOnlyMine(v === true)} />
                    Chỉ lớp tôi được chấm
                  </label>
                )}
                <p className="text-xs text-muted-foreground">
                  {rows.length} lớp
                  {unscored > 0 && <span className="text-amber-700"> · {unscored} lớp chưa chấm</span>}
                </p>
              </div>
              {weekly.isLoading ? (
                <TableSkeleton rows={6} />
              ) : rows.length === 0 ? (
                <EmptyState
                  title="Không có lớp phù hợp"
                  description={filterMine ? "Bỏ chọn “Chỉ lớp tôi được chấm” để xem bảng điểm các lớp khác." : undefined}
                />
              ) : (
                <ul className="max-h-[70vh] divide-y divide-border/70 overflow-y-auto">
                  {rows.map((s) => {
                    const active = s.classid === selected?.classid
                    return (
                      <li key={s.classid}>
                        <button
                          type="button"
                          onClick={() => setClassId(s.classid)}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/5",
                            active && "bg-primary/10"
                          )}
                        >
                          <ClassName name={s.classname} />
                          <span className="min-w-0 flex-1">
                            <TeacherName name={s.teachername} className="block truncate text-sm" />
                            {s.entries === 0 ? (
                              <span className="text-xs text-amber-700">Chưa chấm</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">{s.entries} lượt</span>
                            )}
                          </span>
                          <span className="text-right">
                            <span className="block font-semibold tabular-nums">{s.total}</span>
                            <span className="text-xs text-muted-foreground">hạng {s.rank}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>

            {selected ? (
              <ClassPanel week={week} score={selected} />
            ) : (
              <Card className="py-0">
                <EmptyState title="Chọn một lớp để chấm điểm" />
              </Card>
            )}
          </div>
        </>
      )}
    </>
  )
}
