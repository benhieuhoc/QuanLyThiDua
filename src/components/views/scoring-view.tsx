"use client"

import { useId, useRef, useState } from "react"
import Link from "next/link"
import { ChartColumn, Eye, Info, Lock, Minus, Pencil, Plus, Search, X } from "lucide-react"
import { apiDelete, apiPost, apiPut } from "@/lib/api"
import { canManagePoint, canScoreClass } from "@/lib/auth"
import { formatRange } from "@/lib/format"
import { POINT_TYPES, type Account, type Point, type PointStudent, type PointType, type Score, type Week } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useMe, usePoints, useStudents, useWeeklyScore, type ScoreScope } from "@/hooks/use-data"
import { useWeekPicker } from "@/hooks/use-week-picker"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  RankBadge,
  ScopeFilter,
  SignedValue,
  WeekPickerControls,
  WeekStatus,
} from "@/components/scores"

// Giới hạn theo BE: content ≤ 255, value là số nguyên khác 0 trong -1000..1000
const MAX_CONTENT = 255
const MAX_VALUE = 1000

type Sign = 1 | -1

// Nhập điểm bằng dấu (cộng/trừ) + độ lớn để không phải gõ dấu âm
function usePointInput(initial?: Point) {
  const [type, setType] = useState<PointType>(initial?.type ?? "Nề nếp")
  const [content, setContent] = useState(initial?.content ?? "")
  const [sign, setSign] = useState<Sign>(initial && initial.value > 0 ? 1 : -1)
  const [amount, setAmount] = useState(initial ? String(Math.abs(initial.value)) : "1")
  const [students, setStudents] = useState<PointStudent[]>(initial?.students ?? [])

  const magnitude = Number(amount)
  const valid =
    content.trim().length > 0 && Number.isInteger(magnitude) && magnitude >= 1 && magnitude <= MAX_VALUE

  return {
    type, setType, content, setContent, sign, setSign, amount, setAmount, students, setStudents, valid,
    body: { type, content: content.trim(), value: sign * magnitude },
    studentIds: students.map((st) => st.id),
  }
}

function SignToggle({ sign, onChange, disabled }: { sign: Sign; onChange: (s: Sign) => void; disabled?: boolean }) {
  return (
    <div className="flex rounded-lg border border-border bg-white/70 p-0.5" role="group" aria-label="Cộng hoặc trừ">
      <Button
        type="button"
        size="sm"
        variant={sign === -1 ? "destructive" : "ghost"}
        aria-pressed={sign === -1}
        onClick={() => onChange(-1)}
        disabled={disabled}
      >
        <Minus /> Trừ
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn(sign === 1 && "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15")}
        aria-pressed={sign === 1}
        onClick={() => onChange(1)}
        disabled={disabled}
      >
        <Plus /> Cộng
      </Button>
    </div>
  )
}

function TypeSelect({ value, onChange, id, disabled }: { value: PointType; onChange: (v: PointType) => void; id?: string; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PointType)} disabled={disabled}>
      <SelectTrigger id={id} className="w-full bg-white/70">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {POINT_TYPES.map((t) => (
          <SelectItem key={t} value={t}>{t}</SelectItem>
        ))}
      </SelectContent>
    </Select>
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

// Tô đậm phần khớp từ khóa (không phân biệt hoa thường)
function Highlight({ text, keyword }: { text: string; keyword: string }) {
  const index = keyword ? text.toLowerCase().indexOf(keyword) : -1
  if (index < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-primary/15 font-semibold text-inherit">{text.slice(index, index + keyword.length)}</mark>
      {text.slice(index + keyword.length)}
    </>
  )
}

// Form thêm nhanh: giữ loại và dấu sau khi thêm để nhập liên tiếp
function AddPointForm({ week, score }: { week: Week; score: Score }) {
  const input = usePointInput()
  const [pending, setPending] = useState(false)
  const contentRef = useRef<HTMLInputElement>(null)

  // Đổi lớp thì bỏ học sinh đã chọn (BE chỉ cho gắn học sinh của lớp được chấm); loại và dấu vẫn giữ
  const [classid, setClassid] = useState(score.classid)
  if (classid !== score.classid) {
    setClassid(score.classid)
    input.setStudents([])
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.valid) return
    setPending(true)
    const ok = await runMutation(
      () => apiPost("/points", { weekid: week.id, classid: score.classid, ...input.body, studentIds: input.studentIds }),
      `Đã chấm ${input.body.value > 0 ? "+" : ""}${input.body.value} ${input.type} cho lớp ${score.classname}`
    )
    setPending(false)
    if (ok) {
      input.setContent("")
      input.setAmount("1")
      input.setStudents([])
      contentRef.current?.focus()
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border/70 bg-white/50 p-4">
      <p className="text-sm font-medium">Thêm lượt chấm</p>
      <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
        <div className="grid gap-1.5">
          <Label htmlFor="point-type">Phần</Label>
          <TypeSelect id="point-type" value={input.type} onChange={input.setType} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="point-content">Nội dung</Label>
          <Input
            id="point-content"
            ref={contentRef}
            value={input.content}
            maxLength={MAX_CONTENT}
            placeholder={input.sign < 0 ? "Đi trễ 2 bạn" : "Tiết học tốt"}
            onChange={(e) => input.setContent(e.target.value)}
            className="bg-white/70"
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="point-students">
          Học sinh <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
        </Label>
        <StudentPicker id="point-students" classid={score.classid} value={input.students} onChange={input.setStudents} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <SignToggle sign={input.sign} onChange={input.setSign} />
        <div className="grid gap-1.5">
          <Label htmlFor="point-amount">Điểm</Label>
          <Input
            id="point-amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_VALUE}
            value={input.amount}
            onChange={(e) => input.setAmount(e.target.value)}
            className="w-24 bg-white/70"
          />
        </div>
        <Button type="submit" className="ml-auto" disabled={!input.valid || pending}>
          {pending ? "Đang lưu..." : "Thêm"}
        </Button>
      </div>
    </form>
  )
}

function EditPointDialog({ point }: { point: Point }) {
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
        <EditPointForm key={version} point={point} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function EditPointForm({ point, onDone }: { point: Point; onDone: () => void }) {
  const input = usePointInput(point)
  const [pending, setPending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.valid) return
    setPending(true)
    // Chỉ gửi studentIds khi danh sách đổi: bỏ trường thì BE giữ nguyên
    const before = point.students.map((st) => st.id).sort((a, b) => a - b).join()
    const after = [...input.studentIds].sort((a, b) => a - b).join()
    const body = before === after ? input.body : { ...input.body, studentIds: input.studentIds }
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
      <div className="grid gap-2">
        <Label htmlFor="edit-point-type">Phần</Label>
        <TypeSelect id="edit-point-type" value={input.type} onChange={input.setType} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-point-content">Nội dung</Label>
        <Input
          id="edit-point-content"
          value={input.content}
          maxLength={MAX_CONTENT}
          onChange={(e) => input.setContent(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-point-students">Học sinh</Label>
        <StudentPicker id="edit-point-students" classid={point.classid} value={input.students} onChange={input.setStudents} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <SignToggle sign={input.sign} onChange={input.setSign} />
        <div className="grid gap-1.5">
          <Label htmlFor="edit-point-amount">Điểm</Label>
          <Input
            id="edit-point-amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_VALUE}
            value={input.amount}
            onChange={(e) => input.setAmount(e.target.value)}
            className="w-24"
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Hủy</Button>
        </DialogClose>
        <Button type="submit" disabled={!input.valid || pending}>
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
                        Người nhập: {p.accountusername ?? "Không rõ"}
                      </span>
                    </span>
                    <SignedValue value={p.value} />
                    {!week.locked && canManagePoint(me, p) && (
                      <div className="flex">
                        <EditPointDialog point={p} />
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
