"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, History, Pencil, Plus, Search } from "lucide-react"
import { apiDelete, apiPost, apiPut } from "@/lib/api"
import { GENDERS, type ClassItem, type Gender, type Student } from "@/lib/types"
import { formatDate } from "@/lib/format"
import { useBranches, useClasses, useGrades, useStudentPoints, useStudents, type StudentScope } from "@/hooks/use-data"
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
import { ConfirmDelete, EmptyState, ErrorState, PageHeader, TableSkeleton, runMutation } from "@/components/common"
import { SignedValue } from "@/components/scores"

// student.code: chữ/số, varchar(20), duy nhất; student.name: varchar(50)
const CODE_PATTERN = /^[0-9A-Za-z]{1,20}$/
const MAX_NAME = 50
// Toàn trường khoảng 2500 học sinh nên phân trang ở client
const PAGE_SIZE = 50
// Giá trị Select ứng với null
const NONE = "none"

type StudentInput = { code: string; name: string; gender: Gender | null; birthdate: string | null }

// Chấp nhận "dd/mm/yyyy" (dán từ Excel) hoặc "yyyy-mm-dd"; trả chuỗi "YYYY-MM-DD" như BE, không qua Date
function parseBirthdate(value: string) {
  const vn = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  const parts = vn ? [vn[3], vn[2], vn[1]] : iso ? [iso[1], iso[2], iso[3]] : undefined
  if (!parts) return undefined
  const [y, m, d] = parts
  if (Number(m) < 1 || Number(m) > 12 || Number(d) < 1 || Number(d) > 31) return undefined
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
}

function parseGender(value: string): Gender | null | undefined {
  const v = value.toLowerCase()
  if (!v) return null
  if (v === "nam") return "Nam"
  if (v === "nữ" || v === "nu") return "Nữ"
  return undefined
}

// Mỗi dòng: Mã HS, Họ tên, Giới tính, Ngày sinh — ngăn cách bằng tab (dán từ Excel), dấu phẩy hoặc chấm phẩy
function parseStudents(text: string) {
  const students: StudentInput[] = []
  const errors: string[] = []
  text.split("\n").forEach((line, i) => {
    if (!line.trim()) return
    const [code = "", name = "", gender = "", birthdate = ""] = line.split(/\t|;|,/).map((c) => c.trim())
    const row = `Dòng ${i + 1}`
    if (!CODE_PATTERN.test(code)) errors.push(`${row}: mã HS chỉ gồm chữ/số, tối đa 20 ký tự`)
    if (!name || name.length > MAX_NAME) errors.push(`${row}: họ tên bắt buộc, tối đa ${MAX_NAME} ký tự`)
    const g = parseGender(gender)
    if (g === undefined) errors.push(`${row}: giới tính là Nam, Nữ hoặc để trống`)
    const b = birthdate ? parseBirthdate(birthdate) : null
    if (b === undefined) errors.push(`${row}: ngày sinh dạng dd/mm/yyyy`)
    students.push({ code, name, gender: g ?? null, birthdate: b ?? null })
  })
  const codes = students.map((s) => s.code)
  const duplicated = codes.filter((c, i) => c && codes.indexOf(c) !== i)
  if (duplicated.length) errors.push(`Mã HS bị trùng: ${[...new Set(duplicated)].join(", ")}`)
  return { students, errors }
}

function ClassSelect({
  classes,
  value,
  onChange,
  id,
}: {
  classes: ClassItem[]
  value: string
  onChange: (v: string) => void
  id?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Chọn lớp" />
      </SelectTrigger>
      <SelectContent>
        {classes.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Thêm nhiều học sinh vào 1 lớp: dán danh sách, mỗi dòng một học sinh
function AddStudentsDialog({ classes, defaultClassid }: { classes: ClassItem[]; defaultClassid?: number }) {
  const [open, setOpen] = useState(false)
  const [classid, setClassid] = useState("")
  const [text, setText] = useState("")
  const [pending, setPending] = useState(false)

  const { students, errors } = parseStudents(text)
  const valid = classid && students.length > 0 && errors.length === 0
  const cls = classes.find((c) => c.id === Number(classid))

  const onOpenChange = (next: boolean) => {
    if (next) {
      const initial = defaultClassid ?? classes[0]?.id
      setClassid(initial ? String(initial) : "")
      setText("")
    }
    setOpen(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await runMutation(
      () => apiPost("/students", { classid: Number(classid), students }),
      `Đã thêm ${students.length} học sinh vào lớp ${cls?.name ?? ""}`
    )
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={classes.length === 0}>
          <Plus /> Thêm học sinh
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Thêm học sinh</DialogTitle>
            <DialogDescription>
              Mỗi dòng một học sinh: Mã HS, Họ tên, Giới tính, Ngày sinh. Có thể dán trực tiếp từ Excel; giới tính và
              ngày sinh có thể để trống.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="student-class">Lớp</Label>
            <ClassSelect id="student-class" classes={classes} value={classid} onChange={setClassid} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="student-list">Danh sách học sinh</Label>
            <Textarea
              id="student-list"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"2609138407, Nguyễn Văn An, Nam, 05/09/2014\n2609138408, Trần Thị Bình, Nữ, 21/03/2014"}
              className="font-mono text-xs"
            />
            {errors.length > 0 ? (
              <ul className="max-h-24 space-y-0.5 overflow-y-auto text-xs text-destructive">
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">{students.length} học sinh</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
            <Button type="submit" disabled={!valid || pending}>
              {pending ? "Đang lưu..." : `Thêm ${students.length || ""} học sinh`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Sửa thông tin; đổi lớp là chuyển lớp
function EditStudentDialog({ student, classes }: { student: Student; classes: ClassItem[] }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [gender, setGender] = useState("")
  const [birthdate, setBirthdate] = useState("")
  const [classid, setClassid] = useState("")
  const [pending, setPending] = useState(false)

  const onOpenChange = (next: boolean) => {
    if (next) {
      setCode(student.code)
      setName(student.name)
      setGender(student.gender ?? NONE)
      setBirthdate(student.birthdate ?? "")
      setClassid(String(student.classid))
    }
    setOpen(next)
  }

  const trimmedCode = code.trim()
  const trimmedName = name.trim()
  const valid = CODE_PATTERN.test(trimmedCode) && trimmedName.length > 0 && trimmedName.length <= MAX_NAME && classid

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const moved = Number(classid) !== student.classid
    setPending(true)
    const ok = await runMutation(
      () =>
        apiPut(`/students/${student.id}`, {
          code: trimmedCode,
          name: trimmedName,
          gender: gender === NONE ? null : gender,
          birthdate: birthdate || null,
          classid: Number(classid),
        }),
      moved
        ? `Đã chuyển ${trimmedName} sang lớp ${classes.find((c) => c.id === Number(classid))?.name ?? ""}`
        : "Đã cập nhật học sinh"
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
            <DialogTitle>Sửa học sinh</DialogTitle>
            <DialogDescription>Đổi lớp để chuyển học sinh sang lớp khác.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-student-code">Mã HS</Label>
              <Input id="edit-student-code" value={code} maxLength={20} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-student-class">Lớp</Label>
              <ClassSelect id="edit-student-class" classes={classes} value={classid} onChange={setClassid} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-student-name">Họ tên</Label>
            <Input id="edit-student-name" value={name} maxLength={MAX_NAME} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-student-gender">Giới tính</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="edit-student-gender" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Chưa rõ</SelectItem>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-student-birthdate">Ngày sinh</Label>
              <Input
                id="edit-student-birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
              />
            </div>
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

// Các lượt chấm có gắn học sinh (GET /points?studentid=); chỉ tải khi mở
function StudentHistoryDialog({ student }: { student: Student }) {
  const [open, setOpen] = useState(false)
  const points = useStudentPoints(open ? student.id : undefined)
  const total = (points.data ?? []).reduce((sum, p) => sum + p.value, 0)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Lịch sử chấm điểm" className="text-muted-foreground">
          <History />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student.name}</DialogTitle>
          <DialogDescription>
            Mã HS {student.code} · lớp {student.classname}
            {points.data && points.data.length > 0 && ` · ${points.data.length} lượt chấm, tổng ${total > 0 ? "+" : ""}${total}`}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {points.error ? (
            <ErrorState error={points.error} onRetry={() => points.mutate()} />
          ) : !points.data ? (
            <TableSkeleton rows={4} />
          ) : points.data.length === 0 ? (
            <EmptyState title="Chưa có lượt chấm nào gắn học sinh này" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tuần</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead>Phần</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead className="text-right">Điểm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {points.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="tabular-nums">Tuần {p.numweek}</TableCell>
                    <TableCell>{p.classname}</TableCell>
                    <TableCell className="text-muted-foreground">{p.type}</TableCell>
                    <TableCell className="whitespace-normal">{p.content}</TableCell>
                    <TableCell className="text-right">
                      <SignedValue value={p.value} />
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

export function StudentsView() {
  const branches = useBranches()
  const grades = useGrades()
  const classes = useClasses()
  const [branchFilter, setBranchFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [classFilter, setClassFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)

  // Đã chọn lớp thì chỉ lọc theo lớp; lớp chọn luôn nằm trong phân hiệu/khối đang lọc
  const scope: StudentScope =
    classFilter !== "all"
      ? { classid: Number(classFilter) }
      : {
          branchid: branchFilter === "all" ? undefined : Number(branchFilter),
          gradeid: gradeFilter === "all" ? undefined : Number(gradeFilter),
        }
  const students = useStudents(scope)

  const classOptions = (classes.data ?? []).filter(
    (c) =>
      (branchFilter === "all" || c.branchid === Number(branchFilter)) &&
      (gradeFilter === "all" || c.gradeid === Number(gradeFilter))
  )

  const keyword = query.trim().toLowerCase()
  const rows = (students.data ?? []).filter(
    (s) => s.name.toLowerCase().includes(keyword) || s.code.toLowerCase().includes(keyword)
  )
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const pageRows = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  const changeBranch = (value: string) => {
    setBranchFilter(value)
    setClassFilter("all")
    setPage(0)
  }
  const changeGrade = (value: string) => {
    setGradeFilter(value)
    setClassFilter("all")
    setPage(0)
  }
  const changeClass = (value: string) => {
    setClassFilter(value)
    setPage(0)
  }
  const changeQuery = (value: string) => {
    setQuery(value)
    setPage(0)
  }

  const error = students.error ?? classes.error

  return (
    <>
      <PageHeader
        title="Học sinh"
        description="Mỗi học sinh thuộc một lớp và có mã học sinh duy nhất toàn trường."
        actions={
          <AddStudentsDialog
            classes={classes.data ?? []}
            defaultClassid={classFilter === "all" ? undefined : Number(classFilter)}
          />
        }
      />

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b border-border/70 p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => changeQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc mã HS"
              aria-label="Tìm học sinh"
              className="bg-white/70 pl-8"
            />
          </div>
          <Select value={branchFilter} onValueChange={changeBranch}>
            <SelectTrigger className="bg-white/70 sm:w-44" aria-label="Lọc phân hiệu">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phân hiệu</SelectItem>
              {branches.data?.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={gradeFilter} onValueChange={changeGrade}>
            <SelectTrigger className="bg-white/70 sm:w-36" aria-label="Lọc khối">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khối</SelectItem>
              {grades.data?.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>Khối {g.numgrade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={changeClass}>
            <SelectTrigger className="bg-white/70 sm:w-36" aria-label="Lọc lớp">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả lớp</SelectItem>
              {classOptions.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground sm:ml-auto">{rows.length} học sinh</p>
        </div>

        {error ? (
          <ErrorState error={error} onRetry={() => (students.error ? students.mutate() : classes.mutate())} />
        ) : students.isLoading || classes.isLoading ? (
          <TableSkeleton rows={8} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={students.data?.length ? "Không có học sinh phù hợp" : "Chưa có học sinh"}
            description={students.data?.length ? "Thử đổi từ khóa." : "Thêm học sinh vào lớp bằng nút Thêm học sinh."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 pl-4 text-center">STT</TableHead>
                  <TableHead>Mã HS</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead className="hidden sm:table-cell">Giới tính</TableHead>
                  <TableHead className="hidden md:table-cell">Ngày sinh</TableHead>
                  <TableHead className="w-28 pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((s, i) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-4 text-center text-muted-foreground tabular-nums">
                      {current * PAGE_SIZE + i + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex min-w-12 items-center justify-center rounded-lg bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">
                        {s.classname}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{s.gender ?? "—"}</TableCell>
                    <TableCell className="hidden tabular-nums md:table-cell">
                      {s.birthdate ? formatDate(s.birthdate) : "—"}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1">
                        <StudentHistoryDialog student={s} />
                        <EditStudentDialog student={s} classes={classes.data ?? []} />
                        <ConfirmDelete
                          title={`Xóa học sinh ${s.name}?`}
                          description={`Học sinh ${s.code} sẽ bị xóa khỏi lớp ${s.classname}. Không xóa được học sinh đã được gắn vào lượt chấm điểm.`}
                          onConfirm={() => apiDelete(`/students/${s.id}`)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pageCount > 1 && (
              <div className="flex items-center justify-end gap-2 border-t border-border/70 p-3">
                <p className="text-xs text-muted-foreground tabular-nums">
                  Trang {current + 1}/{pageCount}
                </p>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Trang trước"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Trang sau"
                  disabled={current >= pageCount - 1}
                  onClick={() => setPage(current + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  )
}
