"use client"

import { useState } from "react"
import { Minus, Plus, UserRoundPen } from "lucide-react"
import { apiDelete, apiPost, apiPut } from "@/lib/api"
import { isAdmin } from "@/lib/auth"
import type { Branch, ClassItem, Grade, Teacher } from "@/lib/types"
import { formatDate } from "@/lib/format"
import { useArchivedClasses, useBranches, useClass, useClasses, useGrades, useTeachers, useMe } from "@/hooks/use-data"
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
  TeacherName,
  runMutation,
} from "@/components/common"

// Tạo hàng loạt lớp cho 1 khối của 1 phân hiệu; thứ tự chọn giáo viên = thứ tự số lớp,
// các lớp chưa có GVCN (phần tử null của teacherIds) xếp sau
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
  const [unassigned, setUnassigned] = useState(0)
  const [pending, setPending] = useState(false)

  const grade = grades.find((g) => g.id === Number(gradeid))
  const branch = branches.find((b) => b.id === Number(branchid))
  const available = teachers.filter((t) => t.branchid === Number(branchid) && t.classid === null)
  // Xem trước tên lớp; số thứ tự thật do BE cấp
  const maxSeq = Math.max(0, ...classes.filter((c) => c.gradeid === grade?.id && c.branchid === branch?.id).map((c) => c.seq))
  const previewName = (index: number) => (grade && branch ? `${grade.numgrade}${branch.code}${maxSeq + index + 1}` : "")
  const total = selected.length + unassigned

  const onOpenChange = (next: boolean) => {
    if (next) {
      setGradeid(grades[0] ? String(grades[0].id) : "")
      setBranchid(branches[0] ? String(branches[0].id) : "")
      setSelected([])
      setUnassigned(0)
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
    if (!grade || !branch || total === 0) return
    const teacherIds: (number | null)[] = [...selected, ...Array<null>(unassigned).fill(null)]
    setPending(true)
    const ok = await runMutation(
      () => apiPost("/classes", { gradeid: grade.id, branchid: branch.id, teacherIds }),
      `Đã tạo ${total} lớp`
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
              Chọn khối, phân hiệu và giáo viên chủ nhiệm. Mỗi giáo viên được chọn tạo thành một lớp mới; có thể tạo
              thêm lớp chưa có GVCN để phân công sau.
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
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label id="class-unassigned">Lớp chưa có GVCN</Label>
            <div className="flex items-center gap-1" role="group" aria-labelledby="class-unassigned">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Bớt một lớp chưa có GVCN"
                disabled={unassigned === 0}
                onClick={() => setUnassigned((n) => n - 1)}
              >
                <Minus />
              </Button>
              <span className="w-8 text-center font-medium tabular-nums">{unassigned}</span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Thêm một lớp chưa có GVCN"
                onClick={() => setUnassigned((n) => n + 1)}
              >
                <Plus />
              </Button>
            </div>
          </div>

          {total > 0 && (
            <p className="text-xs text-muted-foreground">
              Sẽ tạo: {Array.from({ length: total }, (_, i) => previewName(i)).join(", ")}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
            <Button type="submit" disabled={total === 0 || pending}>
              {pending ? "Đang tạo..." : `Tạo ${total || ""} lớp`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Giá trị Select ứng với "chưa có GVCN" (gửi teacherid: null)
const NO_TEACHER = "none"

function ChangeTeacherDialog({ cls, teachers }: { cls: ClassItem; teachers: Teacher[] }) {
  const [open, setOpen] = useState(false)
  const [teacherid, setTeacherid] = useState("")
  const [pending, setPending] = useState(false)

  // Cùng phân hiệu, chưa chủ nhiệm (hoặc chính GVCN hiện tại)
  const options = teachers.filter((t) => t.branchid === cls.branchid && (t.classid === null || t.id === cls.teacherid))
  const current = cls.teacherid === null ? NO_TEACHER : String(cls.teacherid)

  const onOpenChange = (next: boolean) => {
    if (next) setTeacherid(current)
    setOpen(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    const ok = await runMutation(
      () => apiPut(`/classes/${cls.id}`, { teacherid: teacherid === NO_TEACHER ? null : Number(teacherid) }),
      teacherid === NO_TEACHER ? `Đã bỏ phân công chủ nhiệm lớp ${cls.name}` : `Đã đổi chủ nhiệm lớp ${cls.name}`
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
                <SelectItem value={NO_TEACHER}>
                  {cls.teacherid === null ? "Chưa có GVCN (hiện tại)" : "Bỏ phân công (chưa có GVCN)"}
                </SelectItem>
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
            <Button type="submit" disabled={!teacherid || teacherid === current || pending}>
              {pending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Danh sách học sinh của 1 lớp (GET /classes/:id); thêm/sửa ở trang Học sinh
function ClassStudentsDialog({ classid, onOpenChange }: { classid?: number; onOpenChange: (open: boolean) => void }) {
  const result = useClass(classid)
  const data = result.data

  return (
    <Dialog open={classid !== undefined} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data ? `Lớp ${data.name}` : "Danh sách học sinh"}</DialogTitle>
          <DialogDescription>
            {!data
              ? "Học sinh của lớp"
              : data.archivedyearid !== null
                ? `Đã ra trường (năm học ${data.archivedyearname}) · sĩ số ${data.numstudents} · chỉ xem`
                : `${data.teachername ? `GVCN ${data.teachername}` : "Chưa có GVCN"} · sĩ số ${data.numstudents}`}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {result.error ? (
            <ErrorState error={result.error} onRetry={() => result.mutate()} />
          ) : !data ? (
            <TableSkeleton rows={6} />
          ) : data.students.length === 0 ? (
            <EmptyState
              title="Lớp chưa có học sinh"
              description={data.archivedyearid === null ? "Thêm học sinh trong mục Học sinh." : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">STT</TableHead>
                  <TableHead>Mã HS</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead className="hidden sm:table-cell">Giới tính</TableHead>
                  <TableHead className="hidden sm:table-cell">Ngày sinh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.students.map((st, i) => (
                  <TableRow key={st.id}>
                    <TableCell className="text-center text-muted-foreground tabular-nums">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{st.code}</TableCell>
                    <TableCell className="font-medium">{st.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{st.gender ?? "—"}</TableCell>
                    <TableCell className="hidden tabular-nums sm:table-cell">
                      {st.birthdate ? formatDate(st.birthdate) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

type ClassStatus = "active" | "archived"

export function ClassesView() {
  const branches = useBranches()
  const grades = useGrades()
  const teachers = useTeachers()
  const activeClasses = useClasses()
  const [status, setStatus] = useState<ClassStatus>("active")
  // Chỉ tải lớp ra trường khi chuyển sang xem
  const archivedClasses = useArchivedClasses(status === "archived")
  const archived = status === "archived"
  const classes = archived ? archivedClasses : activeClasses
  const [branchFilter, setBranchFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [detailClass, setDetailClass] = useState<number>()
  // Chỉ admin được tạo lớp, đổi GVCN, xóa lớp (BE trả 403 với tài khoản khác); lớp ra trường chỉ xem
  const isAdminUser = isAdmin(useMe().data)
  const canEdit = isAdminUser && !archived

  const rows = (classes.data ?? []).filter(
    (c) =>
      (branchFilter === "all" || c.branchid === Number(branchFilter)) &&
      (gradeFilter === "all" || c.gradeid === Number(gradeFilter))
  )

  return (
    <>
      <PageHeader
        title="Lớp học"
        description={
          archived
            ? "Lớp khối 9 ra trường khi chuyển năm học. Chỉ xem lớp và học sinh; bảng điểm năm cũ vẫn giữ tên lớp lúc đó."
            : "Tên lớp gồm khối, mã phân hiệu và số thứ tự, ví dụ 6A1."
        }
        actions={
          isAdminUser && (
            <CreateClassesDialog
              grades={grades.data ?? []}
              branches={branches.data ?? []}
              teachers={teachers.data ?? []}
              classes={activeClasses.data ?? []}
            />
          )
        }
      />

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b border-border/70 p-3 sm:flex-row sm:items-center">
          <div className="flex rounded-lg border border-border bg-white/70 p-0.5" role="group" aria-label="Trạng thái lớp">
            {(
              [
                ["active", "Đang học"],
                ["archived", "Đã ra trường"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={status === value ? "default" : "ghost"}
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
              >
                {label}
              </Button>
            ))}
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
            title={classes.data?.length ? "Không có lớp phù hợp" : archived ? "Chưa có lớp ra trường" : "Chưa có lớp"}
            description={
              classes.data?.length
                ? "Thử đổi bộ lọc."
                : archived
                  ? "Lớp khối 9 được lưu trữ ở đây khi tạo năm học mới."
                  : canEdit
                    ? "Tạo lớp, có thể chọn giáo viên chủ nhiệm ngay hoặc phân công sau."
                    : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Lớp</TableHead>
                <TableHead>Khối</TableHead>
                <TableHead>Phân hiệu</TableHead>
                <TableHead>{archived ? "Ra trường" : "Giáo viên chủ nhiệm"}</TableHead>
                <TableHead className="text-right">Sĩ số</TableHead>
                {canEdit && <TableHead className="w-24 pr-4" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-4">
                    <button
                      type="button"
                      onClick={() => setDetailClass(c.id)}
                      aria-label={`Xem học sinh lớp ${c.name}`}
                      className="inline-flex min-w-12 items-center justify-center rounded-lg bg-primary/10 px-2 py-1 font-semibold text-primary transition-colors hover:bg-primary/20"
                    >
                      {c.name}
                    </button>
                  </TableCell>
                  <TableCell>Khối {c.numgrade}</TableCell>
                  <TableCell className="text-muted-foreground">{c.branchname}</TableCell>
                  <TableCell className="font-medium">
                    {c.archivedyearid !== null ? (
                      <Badge variant="secondary">Năm học {c.archivedyearname}</Badge>
                    ) : (
                      <TeacherName name={c.teachername} />
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.numstudents}</TableCell>
                  {canEdit && (
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1">
                        <ChangeTeacherDialog cls={c} teachers={teachers.data ?? []} />
                        <ConfirmDelete
                          title={`Xóa lớp ${c.name}?`}
                          description="Chỉ xóa được lớp chưa có học sinh và chưa có điểm thi đua. Lớp tạo sau sẽ lấy số tiếp theo lớp lớn nhất còn lại."
                          onConfirm={() => apiDelete(`/classes/${c.id}`)}
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

      <ClassStudentsDialog classid={detailClass} onOpenChange={(open) => !open && setDetailClass(undefined)} />
    </>
  )
}
