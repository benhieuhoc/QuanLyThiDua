"use client"

import { useState } from "react"
import { Plus, UserRoundPen } from "lucide-react"
import { apiDelete, apiPost, apiPut } from "@/lib/api"
import type { Branch, ClassItem, Grade, Teacher } from "@/lib/types"
import { useBranches, useClasses, useGrades, useTeachers } from "@/hooks/use-data"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
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
import {
  BranchSelect,
  ConfirmDelete,
  EmptyState,
  ErrorState,
  GradeSelect,
  PageHeader,
  TableSkeleton,
  runMutation,
} from "@/components/common"

// Tạo hàng loạt lớp cho 1 khối của 1 phân hiệu; thứ tự chọn giáo viên = thứ tự số lớp
function CreateClassesDialog({
  grades,
  branches,
  teachers,
  classes,
}: {
  grades: Grade[]
  branches: Branch[]
  teachers: Teacher[]
  classes: ClassItem[]
}) {
  const [open, setOpen] = useState(false)
  const [gradeid, setGradeid] = useState("")
  const [branchid, setBranchid] = useState("")
  const [selected, setSelected] = useState<number[]>([])
  const [pending, setPending] = useState(false)

  const grade = grades.find((g) => g.id === Number(gradeid))
  const branch = branches.find((b) => b.id === Number(branchid))
  const available = teachers.filter((t) => t.branchid === Number(branchid) && t.classid === null)
  // Xem trước tên lớp; số thứ tự thật do BE cấp
  const maxSeq = Math.max(0, ...classes.filter((c) => c.gradeid === grade?.id && c.branchid === branch?.id).map((c) => c.seq))
  const previewName = (index: number) => (grade && branch ? `${grade.numgrade}${branch.code}${maxSeq + index + 1}` : "")

  const onOpenChange = (next: boolean) => {
    if (next) {
      setGradeid(grades[0] ? String(grades[0].id) : "")
      setBranchid(branches[0] ? String(branches[0].id) : "")
      setSelected([])
    }
    setOpen(next)
  }

  const changeBranch = (value: string) => {
    setBranchid(value)
    setSelected([])
  }

  const toggle = (id: number) =>
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!grade || !branch || selected.length === 0) return
    setPending(true)
    const ok = await runMutation(
      () => apiPost("/classes", { gradeid: grade.id, branchid: branch.id, teacherIds: selected }),
      `Đã tạo ${selected.length} lớp`
    )
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={grades.length === 0 || branches.length === 0}>
          <Plus /> Tạo lớp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Tạo lớp</DialogTitle>
            <DialogDescription>
              Chọn khối, phân hiệu và giáo viên chủ nhiệm. Mỗi giáo viên được chọn tạo thành một lớp mới.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="class-grade">Khối</Label>
              <GradeSelect id="class-grade" grades={grades} value={gradeid} onChange={setGradeid} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="class-branch">Phân hiệu</Label>
              <BranchSelect id="class-branch" branches={branches} value={branchid} onChange={changeBranch} />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Giáo viên chủ nhiệm</Label>
              <span className="text-xs text-muted-foreground">
                {available.length} giáo viên chưa chủ nhiệm
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-white/60">
              {available.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Phân hiệu này không còn giáo viên chưa chủ nhiệm.
                </p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {available.map((t) => {
                    const index = selected.indexOf(t.id)
                    return (
                      <li key={t.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-primary/5",
                            index >= 0 && "bg-primary/5"
                          )}
                        >
                          <Checkbox checked={index >= 0} onCheckedChange={() => toggle(t.id)} />
                          <span className="flex-1 truncate">{t.name}</span>
                          {index >= 0 && <Badge>{previewName(index)}</Badge>}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            {selected.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Sẽ tạo: {selected.map((_, i) => previewName(i)).join(", ")}
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
            <Button type="submit" disabled={selected.length === 0 || pending}>
              {pending ? "Đang tạo..." : `Tạo ${selected.length || ""} lớp`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ChangeTeacherDialog({ cls, teachers }: { cls: ClassItem; teachers: Teacher[] }) {
  const [open, setOpen] = useState(false)
  const [teacherid, setTeacherid] = useState("")
  const [pending, setPending] = useState(false)

  // Cùng phân hiệu, chưa chủ nhiệm (hoặc chính GVCN hiện tại)
  const options = teachers.filter((t) => t.branchid === cls.branchid && (t.classid === null || t.id === cls.teacherid))

  const onOpenChange = (next: boolean) => {
    if (next) setTeacherid(String(cls.teacherid))
    setOpen(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    const ok = await runMutation(
      () => apiPut(`/classes/${cls.id}`, { teacherid: Number(teacherid) }),
      `Đã đổi chủ nhiệm lớp ${cls.name}`
    )
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Đổi chủ nhiệm" className="text-muted-foreground">
          <UserRoundPen />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Đổi chủ nhiệm lớp {cls.name}</DialogTitle>
            <DialogDescription>Chỉ hiện giáo viên của {cls.branchname} chưa chủ nhiệm lớp nào.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="class-teacher">Giáo viên chủ nhiệm</Label>
            <Select value={teacherid} onValueChange={setTeacherid}>
              <SelectTrigger id="class-teacher" className="w-full">
                <SelectValue placeholder="Chọn giáo viên" />
              </SelectTrigger>
              <SelectContent>
                {options.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                    {t.id === cls.teacherid && " (hiện tại)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
            <Button type="submit" disabled={!teacherid || teacherid === String(cls.teacherid) || pending}>
              {pending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ClassesView() {
  const branches = useBranches()
  const grades = useGrades()
  const teachers = useTeachers()
  const classes = useClasses()
  const [branchFilter, setBranchFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")

  const rows = (classes.data ?? []).filter(
    (c) =>
      (branchFilter === "all" || c.branchid === Number(branchFilter)) &&
      (gradeFilter === "all" || c.gradeid === Number(gradeFilter))
  )

  return (
    <>
      <PageHeader
        title="Lớp học"
        description="Tên lớp gồm khối, mã phân hiệu và số thứ tự, ví dụ 6A1."
        actions={
          <CreateClassesDialog
            grades={grades.data ?? []}
            branches={branches.data ?? []}
            teachers={teachers.data ?? []}
            classes={classes.data ?? []}
          />
        }
      />

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b border-border/70 p-3 sm:flex-row sm:items-center">
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
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="bg-white/70 sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khối</SelectItem>
              {grades.data?.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>Khối {g.numgrade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground sm:ml-auto">{rows.length} lớp</p>
        </div>

        {classes.error ? (
          <ErrorState error={classes.error} onRetry={() => classes.mutate()} />
        ) : classes.isLoading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            title={classes.data?.length ? "Không có lớp phù hợp" : "Chưa có lớp"}
            description={
              classes.data?.length ? "Thử đổi bộ lọc." : "Thêm giáo viên trước, sau đó tạo lớp và chọn giáo viên chủ nhiệm."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Lớp</TableHead>
                <TableHead>Khối</TableHead>
                <TableHead>Phân hiệu</TableHead>
                <TableHead>Giáo viên chủ nhiệm</TableHead>
                <TableHead className="w-24 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-4">
                    <span className="inline-flex min-w-12 items-center justify-center rounded-lg bg-primary/10 px-2 py-1 font-semibold text-primary">
                      {c.name}
                    </span>
                  </TableCell>
                  <TableCell>Khối {c.numgrade}</TableCell>
                  <TableCell className="text-muted-foreground">{c.branchname}</TableCell>
                  <TableCell className="font-medium">{c.teachername}</TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-1">
                      <ChangeTeacherDialog cls={c} teachers={teachers.data ?? []} />
                      <ConfirmDelete
                        title={`Xóa lớp ${c.name}?`}
                        description="Chỉ xóa được lớp chưa có điểm thi đua. Lớp tạo sau sẽ lấy số tiếp theo lớp lớn nhất còn lại."
                        onConfirm={() => apiDelete(`/classes/${c.id}`)}
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
