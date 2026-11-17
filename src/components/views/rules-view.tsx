"use client"

import { useId, useState } from "react"
import { Ban, ChevronDown, CircleCheck, Minus, Pencil, Plus, Trash2 } from "lucide-react"
import { apiDelete, apiPost, apiPut } from "@/lib/api"
import { isAdmin } from "@/lib/auth"
import { POINT_TYPES, type PointType, type Rule } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useMe, useRules } from "@/hooks/use-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { PointTypeSelect, SignedValue } from "@/components/scores"

// Giới hạn theo BE: content ≤ 255, value là số nguyên khác 0 trong -1000..1000
const MAX_CONTENT = 255
const MAX_VALUE = 1000

type Sign = 1 | -1

// Nhập điểm bằng dấu (cộng/trừ) + độ lớn để không phải gõ dấu âm
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

function RuleFormDialog({
  rule,
  defaultType = "Nề nếp",
  defaultSign = -1,
  trigger,
}: {
  rule?: Rule
  defaultType?: PointType
  defaultSign?: Sign
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<PointType>(defaultType)
  const [content, setContent] = useState("")
  const [sign, setSign] = useState<Sign>(defaultSign)
  const [amount, setAmount] = useState("1")
  const [pending, setPending] = useState(false)

  // Mỗi lần mở lấy lại giá trị của mục đang sửa / giá trị mặc định của nhóm
  const onOpenChange = (next: boolean) => {
    if (next) {
      setType(rule?.type ?? defaultType)
      setContent(rule?.content ?? "")
      setSign(rule ? (rule.value > 0 ? 1 : -1) : defaultSign)
      setAmount(rule ? String(Math.abs(rule.value)) : "1")
    }
    setOpen(next)
  }

  const magnitude = Number(amount)
  const valid = content.trim().length > 0 && Number.isInteger(magnitude) && magnitude >= 1 && magnitude <= MAX_VALUE

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    const data = { type, content: content.trim(), value: sign * magnitude }
    const ok = await runMutation(
      () => (rule ? apiPut(`/rules/${rule.id}`, data) : apiPost("/rules", data)),
      rule ? "Đã cập nhật mục quy chế" : "Đã thêm mục quy chế"
    )
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{rule ? "Sửa mục quy chế" : "Thêm mục quy chế"}</DialogTitle>
            <DialogDescription>Điểm là điểm cho 1 lần vi phạm / 1 học sinh.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="rule-type">Phần</Label>
            <PointTypeSelect id="rule-type" value={type} onChange={setType} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rule-content">Nội dung</Label>
            <Input
              id="rule-content"
              value={content}
              maxLength={MAX_CONTENT}
              placeholder={sign < 0 ? "Đi học trễ" : "Tiết học tốt"}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <SignToggle sign={sign} onChange={setSign} />
            <div className="grid gap-1.5">
              <Label htmlFor="rule-amount">Điểm</Label>
              <Input
                id="rule-amount"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_VALUE}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-24"
              />
            </div>
          </div>
          {rule && rule.uses > 0 && (
            <p className="text-xs text-amber-700">
              Mục đã dùng trong {rule.uses} lượt chấm; các lượt đó giữ nguyên nội dung và điểm đã chấm.
            </p>
          )}
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

function ToggleActiveButton({ rule }: { rule: Rule }) {
  const [pending, setPending] = useState(false)

  const toggle = async () => {
    setPending(true)
    await runMutation(
      () => apiPut(`/rules/${rule.id}`, { active: !rule.active }),
      rule.active ? "Đã ngừng áp dụng mục quy chế" : "Đã áp dụng lại mục quy chế"
    )
    setPending(false)
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={rule.active ? "Ngừng áp dụng" : "Áp dụng lại"}
      title={rule.active ? "Ngừng áp dụng" : "Áp dụng lại"}
      className="text-muted-foreground"
      onClick={toggle}
      disabled={pending}
    >
      {rule.active ? <Ban /> : <CircleCheck />}
    </Button>
  )
}

function RuleTable({ rules }: { rules: Rule[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">Nội dung</TableHead>
          <TableHead className="w-16 text-right">Điểm</TableHead>
          <TableHead className="w-40">Trạng thái</TableHead>
          <TableHead className="w-24 text-right">Lượt dùng</TableHead>
          <TableHead className="w-32 pr-4" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((r) => (
          <TableRow key={r.id} className={cn(!r.active && "text-muted-foreground")}>
            <TableCell className="pl-4 whitespace-normal break-words">{r.content}</TableCell>
            <TableCell className={cn("text-right", !r.active && "opacity-60")}>
              <SignedValue value={r.value} />
            </TableCell>
            <TableCell>
              {r.active ? (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">
                  <CircleCheck /> Đang áp dụng
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Ban /> Ngừng áp dụng
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">{r.uses}</TableCell>
            <TableCell className="pr-4">
              <div className="flex justify-end gap-1">
                <RuleFormDialog
                  rule={r}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label="Sửa" className="text-muted-foreground">
                      <Pencil />
                    </Button>
                  }
                />
                <ToggleActiveButton rule={r} />
                {r.uses === 0 ? (
                  <ConfirmDelete
                    title="Xóa mục quy chế?"
                    description={`${r.content} (${r.value > 0 ? "+" : ""}${r.value}, ${r.type}).`}
                    onConfirm={() => apiDelete(`/rules/${r.id}`)}
                  />
                ) : (
                  // BE trả 409 khi xóa mục đã dùng: gợi ý ngừng áp dụng thay vì xóa
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled
                    aria-label="Không xóa được mục đã dùng, hãy ngừng áp dụng"
                    title="Mục đã dùng trong lượt chấm, không xóa được. Hãy ngừng áp dụng."
                    className="text-muted-foreground"
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Nút thu gọn / mở rộng một vùng nội dung (vùng dùng id + hidden)
function CollapseToggle({
  open,
  onToggle,
  controls,
  className,
  children,
}: {
  open: boolean
  onToggle: () => void
  controls: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        className
      )}
    >
      <ChevronDown className={cn("size-4 shrink-0 transition-transform", !open && "-rotate-90")} />
      {children}
    </button>
  )
}

function RuleGroup({ type, sign, rules }: { type: PointType; sign: Sign; rules: Rule[] }) {
  const [open, setOpen] = useState(true)
  const contentId = useId()
  const label = sign < 0 ? "Điểm trừ" : "Điểm cộng"

  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-white/80">
      <div className="flex items-center gap-2 border-b border-border/70 bg-white px-3 py-2">
        <CollapseToggle
          open={open}
          onToggle={() => setOpen((v) => !v)}
          controls={contentId}
          className={cn("text-sm font-medium", sign < 0 ? "text-rose-700" : "text-emerald-700")}
        >
          {label} <span className="font-normal text-muted-foreground">({rules.length})</span>
        </CollapseToggle>
        <RuleFormDialog
          defaultType={type}
          defaultSign={sign}
          trigger={
            <Button variant="ghost" size="sm" aria-label={`Thêm mục ${label.toLowerCase()} ${type}`}>
              <Plus /> Thêm
            </Button>
          }
        />
      </div>
      {/* Cuộn riêng khi nhóm dài */}
      <div id={contentId} hidden={!open} className="max-h-80 overflow-y-auto overscroll-contain">
        {rules.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Chưa có mục {label.toLowerCase()}</p>
        ) : (
          <RuleTable rules={rules} />
        )}
      </div>
    </div>
  )
}

function RuleTypeCard({ type, rules }: { type: PointType; rules: Rule[] }) {
  const [open, setOpen] = useState(true)
  const contentId = useId()
  const active = rules.filter((r) => r.active).length

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center gap-2 bg-primary/12 px-4 py-3">
        <CollapseToggle open={open} onToggle={() => setOpen((v) => !v)} controls={contentId} className="font-semibold text-primary">
          {type}
          <span className="text-xs font-normal text-primary/70">
            {rules.length} mục · {active} đang áp dụng
          </span>
        </CollapseToggle>
      </div>
      <div id={contentId} hidden={!open} className="grid gap-3 p-3 lg:grid-cols-2">
        <RuleGroup type={type} sign={-1} rules={rules.filter((r) => r.value < 0)} />
        <RuleGroup type={type} sign={1} rules={rules.filter((r) => r.value > 0)} />
      </div>
    </Card>
  )
}

export function RulesView() {
  const rules = useRules()
  const data = rules.data
  // Trang chỉ dành cho admin (nav.ts + AuthGuard); BE trả 403 với thao tác ghi của tài khoản khác
  const canEdit = isAdmin(useMe().data)

  return (
    <>
      <PageHeader
        title="Quy chế thi đua"
        description="Danh mục điểm cộng / trừ để chọn khi chấm. Mục đã dùng không xóa được, hãy ngừng áp dụng."
        actions={
          canEdit && (
            <RuleFormDialog
              trigger={
                <Button>
                  <Plus /> Thêm mục quy chế
                </Button>
              }
            />
          )
        }
      />

      {rules.error ? (
        <Card className="py-0">
          <ErrorState error={rules.error} onRetry={() => rules.mutate()} />
        </Card>
      ) : !data ? (
        <Card className="py-0">
          <TableSkeleton rows={6} />
        </Card>
      ) : data.length === 0 && !canEdit ? (
        <Card className="py-0">
          <EmptyState title="Chưa có mục quy chế" />
        </Card>
      ) : (
        <div className="grid gap-4">
          {POINT_TYPES.map((type) => (
            <RuleTypeCard key={type} type={type} rules={data.filter((r) => r.type === type)} />
          ))}
        </div>
      )}
    </>
  )
}
