"use client"

import { useState } from "react"
import { Lock, LockOpen, Pencil, Plus, Search } from "lucide-react"
import { apiDelete, apiPost, apiPut } from "@/lib/api"
import type { ClassItem, Parent, ParentRelation } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useClasses, useParents } from "@/hooks/use-data"
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
  EmptyState,
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

// Theo BE: mỗi học sinh tối đa 1 cha, 1 mẹ; họ tên tối đa 50 ký tự
const RELATIONS: ParentRelation[] = ["Cha", "Mẹ"]
const MAX_NAME = 50
const ALL = "all"

type AccountFilter = "all" | "has" | "none"

function RelationSelect({ id, value, onChange }: { id: string; value: ParentRelation; onChange: (v: ParentRelation) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ParentRelation)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RELATIONS.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Chọn lớp → học sinh (học sinh lấy theo lớp vì toàn trường khoảng 2500 em)
function ClassStudentFields({
  idPrefix,
  classes,
  classId,
  studentId,
  onClassChange,
  onStudentChange,
}: {
  idPrefix: string
  classes: ClassItem[]
  classId: string
  studentId: string
  onClassChange: (v: string) => void
  onStudentChange: (v: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-class`}>Lớp</Label>
        <ClassSelect id={`${idPrefix}-class`} classes={classes} value={classId} onChange={onClassChange} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-student`}>Học sinh</Label>
        {classId ? (
          <StudentSelect id={`${idPrefix}-student`} classid={Number(classId)} value={studentId} onChange={onStudentChange} />
        ) : (
          <Select disabled>
            <SelectTrigger id={`${idPrefix}-student`} className="w-full">
              <SelectValue placeholder="Chọn lớp trước" />
            </SelectTrigger>
          </Select>
        )}
      </div>
    </div>
  )
}

function NameField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Họ tên phụ huynh</Label>
      <Input id={id} value={value} maxLength={MAX_NAME} onChange={(e) => onChange(e.target.value)} autoFocus />
    </div>
  )
}

// Nhóm trường trong dialog: tiêu đề + mô tả ngắn, phần phải (vd. trạng thái tài khoản) tùy chọn
function FormSection({
  title,
  description,
  aside,
  children,
}: {
  title: string
  description?: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-3 rounded-xl border border-border/70 bg-white/50 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

// Trạng thái tài khoản đăng nhập của phụ huynh (bảng và dialog sửa)
function AccountStatus({ parent }: { parent: Parent }) {
  if (!parent.hasaccount) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Chưa có tài khoản
      </Badge>
    )
  }
  return parent.active ? (
    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
      Hoạt động
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      <Lock /> Đã khóa
    </Badge>
  )
}

// Họ tên + quan hệ trên cùng một hàng (màn hình hẹp xếp dọc)
function ParentInfoFields({
  idPrefix,
  name,
  relation,
  onNameChange,
  onRelationChange,
}: {
  idPrefix: string
  name: string
  relation: ParentRelation
  onNameChange: (v: string) => void
  onRelationChange: (v: ParentRelation) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
      <NameField id={`${idPrefix}-name`} value={name} onChange={onNameChange} />
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-relation`}>Quan hệ</Label>
        <RelationSelect id={`${idPrefix}-relation`} value={relation} onChange={onRelationChange} />
      </div>
    </div>
  )
}

// Tên đăng nhập + mật khẩu cạnh nhau trên màn hình rộng
function AccountFields({
  idPrefix,
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  passwordLabel,
  passwordOptional,
}: {
  idPrefix: string
  username: string
  password: string
  onUsernameChange: (v: string) => void
  onPasswordChange: (v: string) => void
  passwordLabel: string
  passwordOptional?: boolean
}) {
  return (
    <div className="grid items-start gap-3 sm:grid-cols-2">
      <UsernameField id={`${idPrefix}-username`} value={username} onChange={onUsernameChange} placeholder="ph.nguyenvanan" />
      <PasswordField
        id={`${idPrefix}-password`}
        label={passwordLabel}
        value={password}
        onChange={onPasswordChange}
        optional={passwordOptional}
      />
    </div>
  )
}

function CreateParentDialog({ classes }: { classes: ClassItem[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [relation, setRelation] = useState<ParentRelation>("Cha")
  const [classId, setClassId] = useState("")
  const [studentId, setStudentId] = useState("")
  const [withAccount, setWithAccount] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)

  const onOpenChange = (next: boolean) => {
    if (next) {
      setName("")
      setRelation("Cha")
      setClassId("")
      setStudentId("")
      setWithAccount(false)
      setUsername("")
      setPassword("")
    }
    setOpen(next)
  }

  const changeClass = (value: string) => {
    setClassId(value)
    setStudentId("")
  }

  const trimmed = name.trim()
  const accountValid = !withAccount || (USERNAME_RE.test(username) && validPassword(password))
  const valid = trimmed.length > 0 && studentId !== "" && accountValid

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    // username và password gửi cùng nhau hoặc bỏ cả hai (BE trả 400 nếu chỉ có một)
    const body = {
      name: trimmed,
      relation,
      studentid: Number(studentId),
      ...(withAccount ? { username, password } : {}),
    }
    const ok = await runMutation(() => apiPost("/parents", body), `Đã thêm phụ huynh ${trimmed}`)
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Thêm phụ huynh
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Thêm phụ huynh</DialogTitle>
            <DialogDescription>Mỗi học sinh tối đa 1 cha và 1 mẹ. Phụ huynh có nhiều con thì thêm riêng cho từng con.</DialogDescription>
          </DialogHeader>

          <FormSection title="Phụ huynh">
            <ParentInfoFields
              idPrefix="parent"
              name={name}
              relation={relation}
              onNameChange={setName}
              onRelationChange={setRelation}
            />
          </FormSection>

          <FormSection title="Học sinh" description="Chọn lớp rồi chọn học sinh là con của phụ huynh.">
            <ClassStudentFields
              idPrefix="parent"
              classes={classes}
              classId={classId}
              studentId={studentId}
              onClassChange={changeClass}
              onStudentChange={setStudentId}
            />
          </FormSection>

          <FormSection title="Tài khoản đăng nhập" description="Không bắt buộc, có thể cấp sau.">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={withAccount} onCheckedChange={(v) => setWithAccount(v === true)} />
              Cấp tài khoản đăng nhập cho phụ huynh
            </label>
            {withAccount && (
              <AccountFields
                idPrefix="parent"
                username={username}
                password={password}
                onUsernameChange={setUsername}
                onPasswordChange={setPassword}
                passwordLabel="Mật khẩu"
              />
            )}
          </FormSection>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
            <Button type="submit" disabled={!valid || pending}>
              {pending ? "Đang lưu..." : "Thêm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Sửa thông tin, đổi con, cấp / đổi / xóa tài khoản đăng nhập; chỉ gửi trường thay đổi
function EditParentDialog({ parent, classes }: { parent: Parent; classes: ClassItem[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [relation, setRelation] = useState<ParentRelation>("Cha")
  const [classId, setClassId] = useState("")
  const [studentId, setStudentId] = useState("")
  // Chưa có tài khoản: có cấp không. Đã có: có xóa không
  const [grant, setGrant] = useState(false)
  const [removeAccount, setRemoveAccount] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)

  // Học sinh lớp đã ra trường không có trong danh sách lớp đang học: không đổi con được
  const archived = parent.archivedyearid !== null

  const onOpenChange = (next: boolean) => {
    if (next) {
      setName(parent.name)
      setRelation(parent.relation)
      setClassId(String(parent.classid))
      setStudentId(String(parent.studentid))
      setGrant(false)
      setRemoveAccount(false)
      setUsername(parent.username ?? "")
      setPassword("")
    }
    setOpen(next)
  }

  const changeClass = (value: string) => {
    setClassId(value)
    setStudentId("")
  }

  const trimmed = name.trim()
  const studentChanged = studentId !== String(parent.studentid)
  const body: Record<string, unknown> = {
    ...(trimmed !== parent.name ? { name: trimmed } : {}),
    ...(relation !== parent.relation ? { relation } : {}),
    ...(studentChanged && studentId ? { studentid: Number(studentId) } : {}),
  }
  let accountValid = true
  if (parent.hasaccount) {
    if (removeAccount) body.username = null
    else {
      if (username !== parent.username) body.username = username
      if (password) body.password = password
      accountValid = USERNAME_RE.test(username) && (password.length === 0 || validPassword(password))
    }
  } else if (grant) {
    // Cấp tài khoản mới: BE cần cả username và password
    body.username = username
    body.password = password
    accountValid = USERNAME_RE.test(username) && validPassword(password)
  }
  const valid = trimmed.length > 0 && studentId !== "" && accountValid && Object.keys(body).length > 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await runMutation(() => apiPut(`/parents/${parent.id}`, body), "Đã cập nhật phụ huynh")
    setPending(false)
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Sửa phụ huynh ${parent.name}`} className="text-muted-foreground">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Sửa phụ huynh</DialogTitle>
            <DialogDescription>
              {parent.name} · {parent.relation} của {parent.studentname} (lớp {parent.classname})
            </DialogDescription>
          </DialogHeader>

          <FormSection title="Phụ huynh">
            <ParentInfoFields
              idPrefix="edit-parent"
              name={name}
              relation={relation}
              onNameChange={setName}
              onRelationChange={setRelation}
            />
          </FormSection>

          <FormSection
            title="Học sinh"
            description={archived ? undefined : "Đổi lớp hoặc học sinh nếu nhập nhầm con của phụ huynh."}
          >
            {archived ? (
              <p className="text-sm text-muted-foreground">
                {parent.studentname} ({parent.studentcode}) thuộc lớp đã ra trường, không đổi được học sinh.
              </p>
            ) : (
              <ClassStudentFields
                idPrefix="edit-parent"
                classes={classes}
                classId={classId}
                studentId={studentId}
                onClassChange={changeClass}
                onStudentChange={setStudentId}
              />
            )}
          </FormSection>

          <FormSection
            title="Tài khoản đăng nhập"
            description={parent.hasaccount ? "Bỏ trống mật khẩu nếu không đặt lại." : "Phụ huynh chưa có tài khoản đăng nhập."}
            aside={<AccountStatus parent={parent} />}
          >
            {parent.hasaccount ? (
              <>
                {!removeAccount && (
                  <AccountFields
                    idPrefix="edit-parent"
                    username={username}
                    password={password}
                    onUsernameChange={setUsername}
                    onPasswordChange={setPassword}
                    passwordLabel="Mật khẩu mới"
                    passwordOptional
                  />
                )}
                <label
                  className={cn(
                    "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                    removeAccount ? "border-destructive/40 bg-destructive/5" : "border-border/70"
                  )}
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={removeAccount}
                    onCheckedChange={(v) => setRemoveAccount(v === true)}
                  />
                  <span>
                    <span className={cn("block font-medium", removeAccount && "text-destructive")}>
                      Xóa tài khoản đăng nhập
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Phụ huynh không đăng nhập được nữa; thông tin phụ huynh vẫn được giữ.
                    </span>
                  </span>
                </label>
              </>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={grant} onCheckedChange={(v) => setGrant(v === true)} />
                  Cấp tài khoản đăng nhập
                </label>
                {grant && (
                  <AccountFields
                    idPrefix="edit-parent"
                    username={username}
                    password={password}
                    onUsernameChange={setUsername}
                    onPasswordChange={setPassword}
                    passwordLabel="Mật khẩu"
                  />
                )}
              </>
            )}
          </FormSection>

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

function ToggleActiveButton({ parent }: { parent: Parent }) {
  const [pending, setPending] = useState(false)
  const label = parent.active ? "Khóa tài khoản" : "Mở khóa tài khoản"

  const toggle = async () => {
    setPending(true)
    await runMutation(
      () => apiPut(`/parents/${parent.id}`, { active: !parent.active }),
      parent.active ? `Đã khóa ${parent.username}` : `Đã mở khóa ${parent.username}`
    )
    setPending(false)
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      className="text-muted-foreground"
      onClick={toggle}
      disabled={pending}
    >
      {parent.active ? <Lock /> : <LockOpen />}
    </Button>
  )
}

export function ParentsView() {
  const classes = useClasses()
  const [classFilter, setClassFilter] = useState(ALL)
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all")
  const [query, setQuery] = useState("")
  // Lọc lớp ở BE (?classid=); không lọc thì BE bỏ phụ huynh của học sinh lớp đã ra trường
  const parents = useParents(classFilter === ALL ? undefined : Number(classFilter))

  const keyword = query.trim().toLowerCase()
  const rows = (parents.data ?? []).filter(
    (p) =>
      (accountFilter === "all" || (accountFilter === "has") === p.hasaccount) &&
      [p.name, p.studentname, p.studentcode, p.username].some((v) => v?.toLowerCase().includes(keyword))
  )

  const error = parents.error ?? classes.error

  return (
    <>
      <PageHeader
        title="Phụ huynh"
        description="Thông tin phụ huynh của học sinh và tài khoản đăng nhập để xem kết quả thi đua của lớp."
        actions={<CreateParentDialog classes={classes.data ?? []} />}
      />

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b border-border/70 p-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm phụ huynh, học sinh, tài khoản"
              aria-label="Tìm phụ huynh"
              className="bg-white/70 pl-8"
            />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="bg-white/70 sm:w-40" aria-label="Lọc theo lớp">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả lớp</SelectItem>
              {(classes.data ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={accountFilter} onValueChange={(v) => setAccountFilter(v as AccountFilter)}>
            <SelectTrigger className="bg-white/70 sm:w-48" aria-label="Lọc theo tài khoản">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="has">Có tài khoản</SelectItem>
              <SelectItem value="none">Chưa có tài khoản</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground sm:ml-auto">{rows.length} phụ huynh</p>
        </div>

        {error ? (
          <ErrorState error={error} onRetry={() => (parents.error ? parents.mutate() : classes.mutate())} />
        ) : parents.isLoading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            title={parents.data?.length ? "Không có phụ huynh phù hợp" : "Chưa có phụ huynh"}
            description={parents.data?.length ? "Thử đổi bộ lọc hoặc từ khóa." : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Phụ huynh</TableHead>
                <TableHead>Học sinh</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead className="hidden md:table-cell">Tài khoản</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-28 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-4">
                    <span className="block font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.relation}</span>
                  </TableCell>
                  <TableCell>
                    <span className="block">{p.studentname}</span>
                    <span className="text-xs text-muted-foreground">{p.studentcode}</span>
                  </TableCell>
                  <TableCell>{p.classname}</TableCell>
                  <TableCell className="hidden font-mono text-sm md:table-cell">
                    {p.username ?? <span className="font-sans text-muted-foreground italic">Chưa có</span>}
                  </TableCell>
                  <TableCell>
                    <AccountStatus parent={p} />
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-1">
                      <EditParentDialog parent={p} classes={classes.data ?? []} />
                      {p.hasaccount && <ToggleActiveButton parent={p} />}
                      <ConfirmDelete
                        title={`Xóa phụ huynh ${p.name}?`}
                        description={
                          p.hasaccount
                            ? `Tài khoản đăng nhập ${p.username} cũng bị xóa.`
                            : "Xóa thông tin phụ huynh của học sinh này."
                        }
                        onConfirm={() => apiDelete(`/parents/${p.id}`)}
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
