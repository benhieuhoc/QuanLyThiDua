"use client"

import { useState } from "react"
import { Pencil, Plus } from "lucide-react"
import { apiDelete, apiPost, apiPut } from "@/lib/api"
import { isAdmin } from "@/lib/auth"
import type { Branch } from "@/lib/types"
import { useBranches, useClasses, useMe, useTeachers } from "@/hooks/use-data"
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

function BranchFormDialog({ branch, trigger }: { branch?: Branch; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [pending, setPending] = useState(false)

  const onOpenChange = (next: boolean) => {
    if (next) {
      setName(branch?.name ?? "")
      setCode(branch?.code ?? "")
    }
    setOpen(next)
  }

  const valid = name.trim().length > 0 && /^[A-Z]$/.test(code)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    const data = { name: name.trim(), code }
    const ok = await runMutation(
      () => (branch ? apiPut(`/branches/${branch.id}`, data) : apiPost("/branches", data)),
      branch ? "Đã cập nhật phân hiệu" : "Đã thêm phân hiệu"
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
            <DialogTitle>{branch ? "Sửa phân hiệu" : "Thêm phân hiệu"}</DialogTitle>
            <DialogDescription>Mã phân hiệu là chữ cái đứng sau khối trong tên lớp, ví dụ 6A1.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="branch-name">Tên phân hiệu</Label>
            <Input id="branch-name" value={name} maxLength={100} placeholder="Phân hiệu 3" onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="branch-code">Mã</Label>
            <Input
              id="branch-code"
              value={code}
              maxLength={1}
              placeholder="C"
              className="w-20 text-center font-semibold uppercase"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            />
            {branch && code !== branch.code && code && (
              <p className="text-xs text-amber-600">
                Tên các lớp sẽ đổi theo, ví dụ 6{branch.code}1 → 6{code}1.
              </p>
            )}
          </div>
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

export function BranchesView() {
  const branches = useBranches()
  const teachers = useTeachers()
  const classes = useClasses()
  // Chỉ admin được thêm / sửa / xóa (BE trả 403 với tài khoản khác)
  const canEdit = isAdmin(useMe().data)

  const count = (list: { branchid: number }[] | undefined, id: number) => list?.filter((x) => x.branchid === id).length ?? 0

  return (
    <>
      <PageHeader
        title="Phân hiệu"
        description="Mỗi phân hiệu có mã riêng dùng trong tên lớp."
        actions={
          canEdit && (
            <BranchFormDialog
              trigger={
                <Button>
                  <Plus /> Thêm phân hiệu
                </Button>
              }
            />
          )
        }
      />

      <Card className="py-0">
        {branches.error ? (
          <ErrorState error={branches.error} onRetry={() => branches.mutate()} />
        ) : branches.isLoading ? (
          <TableSkeleton rows={3} />
        ) : !branches.data?.length ? (
          <EmptyState title="Chưa có phân hiệu" description={canEdit ? "Thêm phân hiệu đầu tiên để bắt đầu." : undefined} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 pl-4">Mã</TableHead>
                <TableHead>Tên phân hiệu</TableHead>
                <TableHead className="text-right">Giáo viên</TableHead>
                <TableHead className="text-right">Lớp</TableHead>
                {canEdit && <TableHead className="w-24 pr-4 text-right" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.data.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="pl-4">
                    <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary">
                      {b.code}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{count(teachers.data, b.id)}</TableCell>
                  <TableCell className="text-right tabular-nums">{count(classes.data, b.id)}</TableCell>
                  {canEdit && (
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1">
                        <BranchFormDialog
                          branch={b}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="Sửa" className="text-muted-foreground">
                              <Pencil />
                            </Button>
                          }
                        />
                        <ConfirmDelete
                          title={`Xóa ${b.name}?`}
                          description="Chỉ xóa được khi phân hiệu không còn giáo viên và lớp."
                          onConfirm={() => apiDelete(`/branches/${b.id}`)}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  )
}
