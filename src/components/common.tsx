"use client"

import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import { Inbox, Trash2, WifiOff } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ApiError, errorMessage, refreshAll } from "@/lib/api"
import type { Branch, Grade } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// Màu phẳng cho ô icon
const tones = {
  indigo: "bg-indigo-500/10 text-indigo-600",
  sky: "bg-sky-500/10 text-sky-600",
  emerald: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  rose: "bg-rose-500/10 text-rose-600",
} as const

export type Tone = keyof typeof tones

export function IconTile({ icon: Icon, tone = "indigo", className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tones[tone], className)}>
      <Icon className="size-5" />
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  loading,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon: LucideIcon
  tone?: Tone
  loading?: boolean
}) {
  return (
    <Card className="flex-row items-center gap-4 px-5 py-5">
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-7 w-12" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        )}
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
      <IconTile icon={Inbox} tone="indigo" />
      <p className="mt-1 text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { title, description } = errorMessage(error)
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
      <IconTile icon={WifiOff} tone="rose" />
      <p className="mt-1 text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {description ??
          (error instanceof ApiError && error.status === 0
            ? "Kiểm tra BE đã chạy (npm run dev trong thư mục BE) và NEXT_PUBLIC_API_URL."
            : "Xem log của BE để biết chi tiết. Nếu vừa đổi schema, hãy chạy lại cscript/migration.sql.")}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  )
}

// Nút xóa có hộp thoại xác nhận; lỗi 409 (đang được dùng) hiển thị qua toast
export function ConfirmDelete({
  title,
  description,
  onConfirm,
}: {
  title: string
  description: string
  onConfirm: () => Promise<unknown>
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    setPending(true)
    try {
      await onConfirm()
      toast.success("Đã xóa")
      setOpen(false)
      refreshAll()
    } catch (err) {
      const { title, description } = errorMessage(err)
      toast.error(title, { description })
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Xóa" className="text-muted-foreground hover:text-destructive">
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={handleConfirm}>
            {pending ? "Đang xóa..." : "Xóa"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Chạy thao tác ghi: toast kết quả, tải lại dữ liệu; trả về true nếu thành công
export async function runMutation(action: () => Promise<unknown>, successMessage: string) {
  try {
    await action()
    toast.success(successMessage)
    refreshAll()
    return true
  } catch (err) {
    const { title, description } = errorMessage(err)
    toast.error(title, { description })
    return false
  }
}

export function BranchSelect({
  branches,
  value,
  onChange,
  disabled,
  id,
}: {
  branches: Branch[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  id?: string
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Chọn phân hiệu" />
      </SelectTrigger>
      <SelectContent>
        {branches.map((b) => (
          <SelectItem key={b.id} value={String(b.id)}>
            {b.name} ({b.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function GradeSelect({
  grades,
  value,
  onChange,
  id,
}: {
  grades: Grade[]
  value: string
  onChange: (v: string) => void
  id?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Chọn khối" />
      </SelectTrigger>
      <SelectContent>
        {grades.map((g) => (
          <SelectItem key={g.id} value={String(g.id)}>
            Khối {g.numgrade}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
