"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Lock, Minus, Pencil, Plus } from "lucide-react"
import { apiDelete, apiPost, apiPut } from "@/lib/api"
import { formatRange } from "@/lib/format"
import { POINT_TYPES, type Point, type PointType, type Score, type Week } from "@/lib/types"
import { cn } from "@/lib/utils"
import { usePoints, useWeeklyScore, type ScoreScope } from "@/hooks/use-data"
import { useWeekPicker } from "@/hooks/use-week-picker"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { ConfirmDelete, EmptyState, ErrorState, PageHeader, TableSkeleton, runMutation } from "@/components/common"
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

  const magnitude = Number(amount)
  const valid =
    content.trim().length > 0 && Number.isInteger(magnitude) && magnitude >= 1 && magnitude <= MAX_VALUE

  return {
    type, setType, content, setContent, sign, setSign, amount, setAmount, valid,
    body: { type, content: content.trim(), value: sign * magnitude },
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

// Form thêm nhanh: giữ loại và dấu sau khi thêm để nhập liên tiếp
function AddPointForm({ week, score }: { week: Week; score: Score }) {
  const input = usePointInput()
  const [pending, setPending] = useState(false)
  const contentRef = useRef<HTMLInputElement>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.valid) return
    setPending(true)
    const ok = await runMutation(
      () => apiPost("/points", { weekid: week.id, classid: score.classid, ...input.body }),
      `Đã chấm ${input.body.value > 0 ? "+" : ""}${input.body.value} ${input.type} cho lớp ${score.classname}`
    )
    setPending(false)
    if (ok) {
      input.setContent("")
      input.setAmount("1")
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
    const ok = await runMutation(() => apiPut(`/points/${point.id}`, input.body), "Đã cập nhật lượt chấm")
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
                    <span className="min-w-0 flex-1 text-sm break-words">{p.content}</span>
                    <SignedValue value={p.value} />
                    {!week.locked && (
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

function ClassPanel({ week, score }: { week: Week; score: Score }) {
  return (
    <Card className="gap-5 px-5 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <ClassName name={score.classname} className="px-3 text-lg" />
        <div className="min-w-0">
          <p className="font-medium">GVCN {score.teachername}</p>
          <p className="text-xs text-muted-foreground">Tuần {week.numweek} · {score.entries} lượt chấm</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
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

      {week.locked ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-muted/50 p-4 text-sm">
          <Lock className="size-4 text-muted-foreground" />
          <span className="flex-1">Tuần {week.numweek} đã khóa, không thể thêm, sửa hay xóa lượt chấm.</span>
          <LockWeekButton week={week} />
        </div>
      ) : (
        <AddPointForm week={week} score={score} />
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

  const rows = (weekly.data?.scores ?? [])
    .filter((s) => (!scope.branchid || s.branchid === scope.branchid) && (!scope.gradeid || s.gradeid === scope.gradeid))
    .sort((a, b) => a.numgrade - b.numgrade || a.branchcode.localeCompare(b.branchcode) || a.seq - b.seq)
  const selected = rows.find((s) => s.classid === classId) ?? rows[0]
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
            description="Tạo năm học để sinh các tuần trước khi chấm điểm."
            action={
              <Button asChild>
                <Link href="/nam-hoc">Tạo năm học</Link>
              </Button>
            }
          />
        </Card>
      ) : !week ? (
        <Card className="py-0">
          <EmptyState title="Năm học chưa có tuần" />
        </Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[300px_1fr]">
          <Card className="gap-0 py-0">
            <div className="flex flex-col gap-2 border-b border-border/70 p-3">
              <ScopeFilter value={scope} onChange={setScope} />
              <p className="text-xs text-muted-foreground">
                {rows.length} lớp
                {unscored > 0 && <span className="text-amber-700"> · {unscored} lớp chưa chấm</span>}
              </p>
            </div>
            {weekly.isLoading ? (
              <TableSkeleton rows={6} />
            ) : rows.length === 0 ? (
              <EmptyState title="Không có lớp phù hợp" />
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
                          <span className="block truncate text-sm">{s.teachername}</span>
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
      )}
    </>
  )
}
