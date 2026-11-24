"use client"

import { useState } from "react"
import { ClipboardList, Lock, LockOpen, Pencil, Plus, Search } from "lucide-react"
import { apiDelete, apiPost, apiPut } from "@/lib/api"
import { KIND_LABELS } from "@/lib/auth"
import type { Account, AccountKind, ClassItem, Teacher } from "@/lib/types"
import { useAccounts, useClasses, useMe, useTeachers } from "@/hooks/use-data"
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
import {
  ClassSelect,
  ConfirmDelete,
  ErrorState,
  PageHeader,
  PasswordField,
  StudentSelect,
  TableSkeleton,
  USERNAME_RE,
  UsernameField,
  runMutation,
  validPassword,
} from "@/components/common"


const KINDS: AccountKind[] = ["admin", "gvcn", "codo"]
const NONE = "none"

const kindTone: Record<AccountKind, string> = {
  admin: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700",
  gvcn: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  codo: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}


function CreateAccountDialog({
  accounts,
  teachers,
  classes,
  defaultKind = "gvcn",
  trigger,
}: {
  accounts: Account[]
  teachers: Teacher[]
  classes: ClassItem[]
  // Loại chọn sẵn khi mở (nút thêm của từng khung loại tài khoản)
  defaultKind?: AccountKind
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<AccountKind>(defaultKind)
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
      setKind(defaultKind)
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
        {trigger ?? (
          <Button>
            <Plus /> Tạo tài khoản
          </Button>
        )}
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

// Mỗi loại tài khoản một khung riêng, cột theo loại: Quản lý nề nếp / GVCN gắn giáo viên, cờ đỏ gắn học sinh + lớp chấm
const KIND_SECTIONS: Record<AccountKind, { description: string; linkedLabel: string; empty: string }> = {
  admin: {
    description: "Giáo viên quản lý nề nếp: chấm mọi lớp, sửa toàn bộ dữ liệu.",
    linkedLabel: "Giáo viên",
    empty: "Chưa có tài khoản quản lý nề nếp",
  },
  gvcn: {
    description: "Giáo viên chủ nhiệm: xem mọi trang, không chấm điểm.",
    linkedLabel: "Giáo viên",
    empty: "Chưa có tài khoản GVCN",
  },
  codo: {
    description: "Học sinh cờ đỏ: chấm các lớp được phân công.",
    linkedLabel: "Học sinh",
    empty: "Chưa có tài khoản cờ đỏ",
  },
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
      Hoạt động
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      <Lock /> Đã khóa
    </Badge>
  )
}

function AccountSection({
  kind,
  rows,
  total,
  searching,
  me,
  accounts,
  teachers,
  classes,
}: {
  kind: AccountKind
  // Tài khoản của loại này sau khi lọc theo từ khóa
  rows: Account[]
  // Tổng số tài khoản của loại này (chưa lọc)
  total: number
  searching: boolean
  me?: Account
  accounts: Account[]
  teachers: Teacher[]
  classes: ClassItem[]
}) {
  const section = KIND_SECTIONS[kind]
  const isCodo = kind === "codo"

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-2 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-semibold">
            <Badge variant="outline" className={kindTone[kind]}>
              {KIND_LABELS[kind]}
            </Badge>
            <span className="text-sm font-normal text-muted-foreground tabular-nums">
              {searching ? `${rows.length}/${total}` : total} tài khoản
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{section.description}</p>
        </div>
        <div className="sm:ml-auto">
          <CreateAccountDialog
            accounts={accounts}
            teachers={teachers}
            classes={classes}
            defaultKind={kind}
            trigger={
              <Button variant="outline" size="sm">
                <Plus /> Thêm {KIND_LABELS[kind]}
              </Button>
            }
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          {total ? "Không có tài khoản phù hợp với từ khóa." : section.empty}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Tên đăng nhập</TableHead>
              <TableHead>{section.linkedLabel}</TableHead>
              {isCodo && <TableHead className="hidden md:table-cell">Lớp chấm</TableHead>}
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
                    <LinkedTo account={a} />
                  </TableCell>
                  {isCodo && (
                    <TableCell className="hidden text-sm md:table-cell">
                      {a.classes.length ? (
                        a.classes.map((c) => c.name).join(", ")
                      ) : (
                        <span className="text-amber-700">Chưa phân công</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <StatusBadge active={a.active} />
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-1">
                      {isCodo && <AssignClassesDialog account={a} classes={classes} />}
                      <EditAccountDialog account={a} />
                      {/* BE không cho tự khóa / tự xóa tài khoản đang dùng */}
                      {!self && <ToggleActiveButton account={a} />}
                      {!self && (
                        <ConfirmDelete
                          title={`Xóa tài khoản ${a.username}?`}
                          description={
                            isCodo
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
  )
}

export function AccountsView() {
  const accounts = useAccounts()
  const teachers = useTeachers()
  const classes = useClasses()
  const me = useMe().data
  const [query, setQuery] = useState("")

  const keyword = query.trim().toLowerCase()
  const all = accounts.data ?? []
  const matches = all.filter((a) =>
    [a.username, a.teachername, a.studentname].some((v) => v?.toLowerCase().includes(keyword))
  )

  const error = accounts.error ?? teachers.error ?? classes.error

  return (
    <>
      <PageHeader
        title="Tài khoản"
        description="Tài khoản quản lý nề nếp, giáo viên chủ nhiệm và cờ đỏ, chia theo từng loại."
        actions={<CreateAccountDialog accounts={all} teachers={teachers.data ?? []} classes={classes.data ?? []} />}
      />

      {error ? (
        <Card className="py-0">
          <ErrorState
            error={error}
            onRetry={() => (accounts.error ? accounts.mutate() : teachers.error ? teachers.mutate() : classes.mutate())}
          />
        </Card>
      ) : accounts.isLoading ? (
        <Card className="py-0">
          <TableSkeleton />
        </Card>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên đăng nhập, họ tên"
                aria-label="Tìm tài khoản"
                className="bg-white/70 pl-8"
              />
            </div>
            <p className="text-xs text-muted-foreground sm:ml-auto">
              {keyword ? `${matches.length}/${all.length}` : all.length} tài khoản
            </p>
          </div>

          {KINDS.map((kind) => (
            <AccountSection
              key={kind}
              kind={kind}
              rows={matches.filter((a) => a.kind === kind)}
              total={all.filter((a) => a.kind === kind).length}
              searching={!!keyword}
              me={me}
              accounts={all}
              teachers={teachers.data ?? []}
              classes={classes.data ?? []}
            />
          ))}
        </div>
      )}
    </>
  )
}
