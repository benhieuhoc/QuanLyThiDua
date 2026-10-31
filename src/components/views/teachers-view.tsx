"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, Search } from "lucide-react"
import { apiDelete, apiPost, apiPut } from "@/lib/api"
import type { Branch, Teacher } from "@/lib/types"
import { useBranches, useTeachers } from "@/hooks/use-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { BranchSelect, ConfirmDelete, EmptyState, ErrorState, PageHeader, TableSkeleton, runMutation } from "@/components/common"

// teacher.name là varchar(25)
const MAX_NAME = 25

// Tạo hàng loạt: mỗi dòng một tên
function CreateTeachersDialog({ branches }: { branches: Branch[] }) {
  const [open, setOpen] = useState(false)
  const [branchid, setBranchid] = useState("")
  const [text, setText] = useState("")
  const [pending, setPending] = useState(false)

  const names = text.split("\n").map((n) => n.trim()).filter(Boolean)
  const tooLong = names.filter((n) => n.length > MAX_NAME)
  const valid = branchid && names.length > 0 && tooLong.length === 0

  const onOpenChange = (next: boolean) => {
    if (next) {
      setBranchid(branches[0] ? String(branches[0].id) : "")
      setText("")
    }
    setOpen(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await runMutation(
      () => apiPost("/teachers", { branchid: Number(branchid), names }),
      `Đã thêm ${names.length} giáo viên`
    )
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={branches.length === 0}>
          <Plus /> Thêm giáo viên
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Thêm giáo viên</DialogTitle>
            <DialogDescription>Nhập nhiều giáo viên cùng lúc, mỗi dòng một tên.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="teacher-branch">Phân hiệu</Label>
            <BranchSelect id="teacher-branch" branches={branches} value={branchid} onChange={setBranchid} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="teacher-names">Danh sách tên</Label>
            <Textarea
              id="teacher-names"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Nguyễn Văn An\nTrần Thị Bình"}
            />
            <p className={tooLong.length ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              {tooLong.length
                ? `${tooLong.length} tên dài quá ${MAX_NAME} ký tự`
                : `${names.length} giáo viên · tối đa ${MAX_NAME} ký tự mỗi tên`}
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
            <Button type="submit" disabled={!valid || pending}>
              {pending ? "Đang lưu..." : `Thêm ${names.length || ""} giáo viên`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditTeacherDialog({ teacher, branches }: { teacher: Teacher; branches: Branch[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [branchid, setBranchid] = useState("")
  const [pending, setPending] = useState(false)

  const onOpenChange = (next: boolean) => {
    if (next) {
      setName(teacher.name)
      setBranchid(String(teacher.branchid))
    }
    setOpen(next)
  }

  const trimmed = name.trim()
  const valid = trimmed.length > 0 && trimmed.length <= MAX_NAME

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await runMutation(
      () => apiPut(`/teachers/${teacher.id}`, { name: trimmed, branchid: Number(branchid) }),
      "Đã cập nhật giáo viên"
    )
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Sửa" className="text-muted-foreground">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Sửa giáo viên</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="edit-teacher-name">Họ tên</Label>
            <Input id="edit-teacher-name" value={name} maxLength={MAX_NAME} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-teacher-branch">Phân hiệu</Label>
            {/* Đang chủ nhiệm thì không đổi phân hiệu được (BE trả 409) */}
            <BranchSelect
              id="edit-teacher-branch"
              branches={branches}
              value={branchid}
              onChange={setBranchid}
              disabled={teacher.classid !== null}
            />
            {teacher.classid !== null && (
              <p className="text-xs text-muted-foreground">
                Đang chủ nhiệm lớp {teacher.classname}. Đổi giáo viên chủ nhiệm của lớp trước khi chuyển phân hiệu.
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

export function TeachersView() {
  const branches = useBranches()
  const teachers = useTeachers()
  const [branchFilter, setBranchFilter] = useState("all")
  const [status, setStatus] = useState("all")
  const [query, setQuery] = useState("")

  const branchById = useMemo(() => new Map(branches.data?.map((b) => [b.id, b])), [branches.data])

  const rows = (teachers.data ?? []).filter((t) => {
    if (branchFilter !== "all" && t.branchid !== Number(branchFilter)) return false
    if (status === "assigned" && t.classid === null) return false
    if (status === "unassigned" && t.classid !== null) return false
    return t.name?.toLowerCase().includes(query.trim().toLowerCase())
  })

  return (
    <>
      <PageHeader
        title="Giáo viên"
        description="Mỗi giáo viên thuộc một phân hiệu và chủ nhiệm tối đa một lớp."
        actions={<CreateTeachersDialog branches={branches.data ?? []} />}
      />

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b border-border/70 p-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên" className="bg-white/70 pl-8" />
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="bg-white/70 sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phân hiệu</SelectItem>
              {branches.data?.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-white/70 sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="assigned">Đã chủ nhiệm</SelectItem>
              <SelectItem value="unassigned">Chưa chủ nhiệm</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground sm:ml-auto">{rows.length} giáo viên</p>
        </div>

        {teachers.error ? (
          <ErrorState error={teachers.error} onRetry={() => teachers.mutate()} />
        ) : teachers.isLoading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            title={teachers.data?.length ? "Không có giáo viên phù hợp" : "Chưa có giáo viên"}
            description={teachers.data?.length ? "Thử đổi bộ lọc hoặc từ khóa." : "Thêm giáo viên cho từng phân hiệu."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Họ tên</TableHead>
                <TableHead>Phân hiệu</TableHead>
                <TableHead>Lớp chủ nhiệm</TableHead>
                <TableHead className="w-24 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="pl-4 font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{branchById.get(t.branchid)?.name ?? "—"}</TableCell>
                  <TableCell>
                    {t.classname ? (
                      <Badge variant="secondary">{t.classname}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Chưa chủ nhiệm</Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-1">
                      <EditTeacherDialog teacher={t} branches={branches.data ?? []} />
                      <ConfirmDelete
                        title={`Xóa giáo viên ${t.name}?`}
                        description={
                          t.classname
                            ? `Giáo viên đang chủ nhiệm lớp ${t.classname}, cần đổi chủ nhiệm trước khi xóa.`
                            : "Thao tác này không thể hoàn tác."
                        }
                        onConfirm={() => apiDelete(`/teachers/${t.id}`)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  )
}
