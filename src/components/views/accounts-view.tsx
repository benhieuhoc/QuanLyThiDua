"use client"

import { useState } from "react"
import { ClipboardList, Lock, LockOpen, Pencil, Plus, Search } from "lucide-react"
import { apiDelete, apiPost, apiPut, errorMessage } from "@/lib/api"
import { KIND_LABELS } from "@/lib/auth"
import type { Account, AccountKind, ClassItem, Teacher } from "@/lib/types"
import { useAccounts, useClasses, useMe, useStudents, useTeachers } from "@/hooks/use-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
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
import { ConfirmDelete, EmptyState, ErrorState, PageHeader, TableSkeleton, runMutation } from "@/components/common"

// Giới hạn theo BE: username 3–50 ký tự chữ thường, số, . _ -; mật khẩu 6 ký tự – 72 byte
const USERNAME_RE = /^[a-z0-9._-]{3,50}$/
const MIN_PASSWORD = 6
const MAX_PASSWORD_BYTES = 72
const validPassword = (value: string) =>
  value.length >= MIN_PASSWORD && new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES

const KINDS: AccountKind[] = ["admin", "gvcn", "codo"]
const NONE = "none"

const kindTone: Record<AccountKind, string> = {
  admin: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700",
  gvcn: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  codo: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}

function UsernameField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const invalid = value.length > 0 && !USERNAME_RE.test(value)
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Tên đăng nhập</Label>
      <Input
        id={id}
        value={value}
        maxLength={50}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="gvcn.6a1"
        aria-invalid={invalid ? true : undefined}
        // BE tự chuyển về chữ thường; chuyển sẵn để kiểm tra hợp lệ
        onChange={(e) => onChange(e.target.value.toLowerCase())}
      />
      <p className={invalid ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        3–50 ký tự: chữ thường không dấu, số, dấu chấm, gạch dưới, gạch ngang.
      </p>
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  optional,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  optional?: boolean
}) {
  const invalid = value.length > 0 && !validPassword(value)
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label} {optional && <span className="font-normal text-muted-foreground">(bỏ trống nếu không đổi)</span>}
      </Label>
      <Input
        id={id}
        type="password"
        value={value}
        autoComplete="new-password"
        aria-invalid={invalid ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {invalid && <p className="text-xs text-destructive">Tối thiểu {MIN_PASSWORD} ký tự, tối đa {MAX_PASSWORD_BYTES} byte.</p>}
    </div>
  )
}

function ClassSelect({
  id,
  classes,
  value,
  onChange,
}: {
  id: string
  classes: ClassItem[]
  value: string
  onChange: (v: string) => void
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

// Học sinh của lớp đã chọn; học sinh đã có tài khoản thì không chọn được (BE trả 409).
// Chỉ render khi đã chọn lớp: useStudents không có classid sẽ tải toàn trường
function StudentSelect({
  id,
  classid,
  taken,
  value,
  onChange,
}: {
  id: string
  classid: number
  taken: Set<number>
  value: string
  onChange: (v: string) => void
}) {
  const students = useStudents({ classid })
  if (students.error) return <p className="text-sm text-destructive">{errorMessage(students.error).title}</p>
  return (
    <Select value={value} onValueChange={onChange} disabled={students.isLoading}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={students.isLoading ? "Đang tải..." : "Chọn học sinh"} />
      </SelectTrigger>
      <SelectContent>
        {(students.data ?? []).map((st) => (
          <SelectItem key={st.id} value={String(st.id)} disabled={taken.has(st.id)}>
            {st.name} · {st.code}
            {taken.has(st.id) && " (đã có tài khoản)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CreateAccountDialog({ accounts, teachers, classes }: { accounts: Account[]; teachers: Teacher[]; classes: ClassItem[] }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<AccountKind>("gvcn")
  const [teacherId, setTeacherId] = useState(NONE)
  const [classId, setClassId] = useState("")
  const [studentId, setStudentId] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)

  // Mỗi giáo viên / học sinh chỉ có một tài khoản
  const takenTeachers = new Set(accounts.map((a) => a.teacherid).filter((id): id is number => id !== null))
  const takenStudents = new Set(accounts.map((a) => a.studentid).filter((id): id is number => id !== null))

  const onOpenChange = (next: boolean) => {
    if (next) {
      setKind("gvcn")
      setTeacherId(NONE)
      setClassId("")
      setStudentId("")
      setUsername("")
      setPassword("")
    }
    setOpen(next)
  }

  const changeKind = (value: string) => {
    setKind(value as AccountKind)
    setTeacherId(NONE)
    setClassId("")
    setStudentId("")
  }

  const changeClass = (value: string) => {
    setClassId(value)
    setStudentId("")
  }

  const linked = kind === "admin" || (kind === "gvcn" ? teacherId !== NONE : studentId !== "")
  const valid = USERNAME_RE.test(username) && validPassword(password) && linked

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    // Quản lý nề nếp: role admin, giáo viên không bắt buộc. GVCN / cờ đỏ: role user + đúng 1 người gắn
    const body =
      kind === "codo"
        ? { username, password, role: "user", studentid: Number(studentId) }
        : {
            username,
            password,
            role: kind === "admin" ? "admin" : "user",
            ...(teacherId !== NONE ? { teacherid: Number(teacherId) } : {}),
          }
    const ok = await runMutation(() => apiPost("/accounts", body), `Đã tạo tài khoản ${username}`)
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Tạo tài khoản
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Tạo tài khoản</DialogTitle>
            <DialogDescription>Không đổi được loại tài khoản và người gắn sau khi tạo; muốn đổi thì xóa và tạo lại.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="account-kind">Loại tài khoản</Label>
            <Select value={kind} onValueChange={changeKind}>
              <SelectTrigger id="account-kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {kind !== "codo" ? (
            <div className="grid gap-2">
              <Label htmlFor="account-teacher">
                Giáo viên {kind === "admin" && <span className="font-normal text-muted-foreground">(không bắt buộc)</span>}
              </Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger id="account-teacher" className="w-full">
                  <SelectValue placeholder="Chọn giáo viên" />
                </SelectTrigger>
                <SelectContent>
                  {kind === "admin" ? (
                    <SelectItem value={NONE}>Không gắn giáo viên</SelectItem>
                  ) : (
                    <SelectItem value={NONE} disabled>
                      Chọn giáo viên
                    </SelectItem>
                  )}
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)} disabled={takenTeachers.has(t.id)}>
                      {t.name}
                      {t.classname ? ` · CN ${t.classname}` : ""}
                      {takenTeachers.has(t.id) && " (đã có tài khoản)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {kind === "gvcn" && (
                <p className="text-xs text-muted-foreground">GVCN chỉ xem, không chấm điểm. Lớp chủ nhiệm đổi ở trang Lớp học.</p>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
              <div className="grid gap-2">
                <Label htmlFor="account-class">Lớp</Label>
                <ClassSelect id="account-class" classes={classes} value={classId} onChange={changeClass} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account-student">Học sinh</Label>
                {classId ? (
                  <StudentSelect
                    id="account-student"
                    classid={Number(classId)}
                    taken={takenStudents}
                    value={studentId}
                    onChange={setStudentId}
                  />
                ) : (
                  <Select disabled>
                    <SelectTrigger id="account-student" className="w-full">
                      <SelectValue placeholder="Chọn lớp trước" />
                    </SelectTrigger>
                  </Select>
                )}
              </div>
            </div>
          )}

          <UsernameField id="account-username" value={username} onChange={setUsername} />
          <PasswordField id="account-password" label="Mật khẩu" value={password} onChange={setPassword} />

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
            <Button type="submit" disabled={!valid || pending}>
              {pending ? "Đang lưu..." : "Tạo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Đổi tên đăng nhập / đặt lại mật khẩu; chỉ gửi trường thay đổi
function EditAccountDialog({ account }: { account: Account }) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)

  const onOpenChange = (next: boolean) => {
    if (next) {
      setUsername(account.username)
      setPassword("")
    }
    setOpen(next)
  }

  const changed = username !== account.username || password.length > 0
  const valid = USERNAME_RE.test(username) && (password.length === 0 || validPassword(password)) && changed

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    const body = {
      ...(username !== account.username ? { username } : {}),
      ...(password ? { password } : {}),
    }
    const ok = await runMutation(() => apiPut(`/accounts/${account.id}`, body), "Đã cập nhật tài khoản")
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Sửa tài khoản" className="text-muted-foreground">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Sửa tài khoản</DialogTitle>
            <DialogDescription>
              {KIND_LABELS[account.kind]}
              {account.teachername || account.studentname ? ` · ${account.teachername ?? account.studentname}` : ""}
            </DialogDescription>
          </DialogHeader>
          <UsernameField id="edit-account-username" value={username} onChange={setUsername} />
          <PasswordField id="edit-account-password" label="Mật khẩu mới" value={password} onChange={setPassword} optional />
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

// Thay toàn bộ lớp cờ đỏ được chấm; không được chấm lớp của chính em đó
function AssignClassesDialog({ account, classes }: { account: Account; classes: ClassItem[] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [pending, setPending] = useState(false)

  const options = classes.filter((c) => c.id !== account.studentclassid)

  const onOpenChange = (next: boolean) => {
    if (next) setSelected(new Set(account.classes.map((c) => c.id)))
    setOpen(next)
  }

  const toggle = (id: number, checked: boolean) => {
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    setSelected(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    const ok = await runMutation(
      () => apiPut(`/accounts/${account.id}/classes`, { classIds: [...selected] }),
      `Đã phân công ${selected.size} lớp cho ${account.studentname ?? account.username}`
    )
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Phân công lớp chấm" className="text-muted-foreground">
          <ClipboardList />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Phân công lớp chấm</DialogTitle>
            <DialogDescription>
              {account.studentname ?? account.username}
              {account.studentclassname ? ` (lớp ${account.studentclassname}, không được chấm lớp mình)` : ""}
            </DialogDescription>
          </DialogHeader>
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có lớp nào để phân công.</p>
          ) : (
            <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {options.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm hover:bg-primary/5"
                >
                  <Checkbox checked={selected.has(c.id)} onCheckedChange={(v) => toggle(c.id, v === true)} />
                  {c.name}
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Đã chọn {selected.size} lớp. Bỏ hết để thu hồi quyền chấm.</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ToggleActiveButton({ account }: { account: Account }) {
  const [pending, setPending] = useState(false)

  const toggle = async () => {
    setPending(true)
    await runMutation(
      () => apiPut(`/accounts/${account.id}`, { active: !account.active }),
      account.active ? `Đã khóa ${account.username}` : `Đã mở khóa ${account.username}`
    )
    setPending(false)
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={account.active ? "Khóa tài khoản" : "Mở khóa tài khoản"}
      title={account.active ? "Khóa tài khoản" : "Mở khóa tài khoản"}
      className="text-muted-foreground"
      onClick={toggle}
      disabled={pending}
    >
      {account.active ? <Lock /> : <LockOpen />}
    </Button>
  )
}

// Người gắn với tài khoản và lớp liên quan
function LinkedTo({ account }: { account: Account }) {
  if (account.kind === "codo") {
    return (
      <>
        <span className="block font-medium">{account.studentname ?? "—"}</span>
        <span className="text-xs text-muted-foreground">
          {account.studentclassname ? `HS lớp ${account.studentclassname}` : ""}
          {account.studentcode ? ` · ${account.studentcode}` : ""}
        </span>
      </>
    )
  }
  return (
    <>
      <span className="block font-medium">
        {account.teachername ?? <span className="font-normal text-muted-foreground italic">Không gắn giáo viên</span>}
      </span>
      {account.kind === "gvcn" && (
        <span className="text-xs text-muted-foreground">
          {account.homeroomclassname ? `Chủ nhiệm ${account.homeroomclassname}` : "Chưa chủ nhiệm lớp nào"}
        </span>
      )}
    </>
  )
}

export function AccountsView() {
  const accounts = useAccounts()
  const teachers = useTeachers()
  const classes = useClasses()
  const me = useMe().data
  const [kindFilter, setKindFilter] = useState("all")
  const [query, setQuery] = useState("")

  const keyword = query.trim().toLowerCase()
  const rows = (accounts.data ?? []).filter(
    (a) =>
      (kindFilter === "all" || a.kind === kindFilter) &&
      [a.username, a.teachername, a.studentname].some((v) => v?.toLowerCase().includes(keyword))
  )

  const error = accounts.error ?? teachers.error ?? classes.error

  return (
    <>
      <PageHeader
        title="Tài khoản"
        description="Tài khoản quản lý nề nếp, giáo viên chủ nhiệm và cờ đỏ."
        actions={
          <CreateAccountDialog accounts={accounts.data ?? []} teachers={teachers.data ?? []} classes={classes.data ?? []} />
        }
      />

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b border-border/70 p-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên đăng nhập, họ tên"
              aria-label="Tìm tài khoản"
              className="bg-white/70 pl-8"
            />
          </div>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="bg-white/70 sm:w-48" aria-label="Lọc loại tài khoản">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground sm:ml-auto">{rows.length} tài khoản</p>
        </div>

        {error ? (
          <ErrorState
            error={error}
            onRetry={() => (accounts.error ? accounts.mutate() : teachers.error ? teachers.mutate() : classes.mutate())}
          />
        ) : accounts.isLoading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            title={accounts.data?.length ? "Không có tài khoản phù hợp" : "Chưa có tài khoản"}
            description={accounts.data?.length ? "Thử đổi bộ lọc hoặc từ khóa." : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Tên đăng nhập</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Người dùng</TableHead>
                <TableHead className="hidden md:table-cell">Lớp chấm</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-36 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => {
                const self = a.id === me?.id
                return (
                  <TableRow key={a.id}>
                    <TableCell className="pl-4 font-mono text-sm">
                      {a.username}
                      {self && <span className="ml-1 font-sans text-xs text-muted-foreground">(bạn)</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={kindTone[a.kind]}>
                        {KIND_LABELS[a.kind]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <LinkedTo account={a} />
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {a.kind === "admin" ? (
                        "Mọi lớp"
                      ) : a.kind === "gvcn" ? (
                        <span className="text-muted-foreground">Chỉ xem</span>
                      ) : a.classes.length ? (
                        a.classes.map((c) => c.name).join(", ")
                      ) : (
                        <span className="text-amber-700">Chưa phân công</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.active ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                          Hoạt động
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Lock /> Đã khóa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1">
                        {a.kind === "codo" && <AssignClassesDialog account={a} classes={classes.data ?? []} />}
                        <EditAccountDialog account={a} />
                        {/* BE không cho tự khóa / tự xóa tài khoản đang dùng */}
                        {!self && <ToggleActiveButton account={a} />}
                        {!self && (
                          <ConfirmDelete
                            title={`Xóa tài khoản ${a.username}?`}
                            description={
                              a.kind === "codo"
                                ? "Lượt chấm đã nhập vẫn được giữ nhưng mất tên người nhập. Cờ đỏ hết nhiệm kỳ nên Khóa thay vì xóa."
                                : "Lượt chấm đã nhập vẫn được giữ nhưng mất tên người nhập."
                            }
                            onConfirm={() => apiDelete(`/accounts/${a.id}`)}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  )
}
