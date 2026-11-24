"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight, KeyRound, LogIn, LogOut } from "lucide-react"
import { errorMessage, isUnauthorized, LOGIN_PATH, parentApi, parentLogin, parentLogout } from "@/lib/api"
import type { ParentMe } from "@/lib/types"
import { useParentMe } from "@/hooks/use-data"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ErrorState, TableSkeleton } from "@/components/common"
import { ChangePasswordDialog } from "@/components/layout/app-header"

// Phụ huynh đăng nhập bằng tài khoản riêng (POST /auth/parent/login, token lưu tách khỏi token giáo viên).
// BE chỉ cho token phụ huynh gọi /auth/parent/*; kết quả thi đua xem ở trang lớp công khai BaseQRCode
export function ParentLoginView() {
  const parent = useParentMe()
  // SWR giữ dữ liệu cũ khi lỗi: 401 (hết hạn, bị khóa) thì coi như chưa đăng nhập
  const loggedOut = isUnauthorized(parent.error)
  const me = loggedOut ? undefined : parent.data

  // Đăng nhập xong ở lại trang, hiện ParentPanel (có nút sang trang kết quả thi đua của lớp)
  const onLoggedIn = (result: ParentMe) => {
    void parent.mutate(result, { revalidate: false })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-32 size-[520px] rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="absolute top-1/3 -right-40 size-[480px] rounded-full bg-sky-200/45 blur-3xl" />
        <div className="absolute -bottom-48 left-1/3 size-[460px] rounded-full bg-violet-200/40 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-4 overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5">
          <Image
            src="/banner.jpg"
            alt="Trường THCS Phan Đình Phùng – Trang web quản lý thi đua lớp học"
            width={1024}
            height={434}
            sizes="(min-width: 480px) 448px, calc(100vw - 32px)"
            preload
            className="h-auto w-full"
          />
        </div>

        <Card className="gap-0 px-6 py-6">
          {me ? (
            <ParentPanel me={me} />
          ) : parent.error && !loggedOut ? (
            <ErrorState error={parent.error} onRetry={() => parent.mutate()} />
          ) : parent.isLoading ? (
            <TableSkeleton rows={3} />
          ) : (
            <ParentLoginForm onLoggedIn={onLoggedIn} />
          )}
        </Card>

        <Button variant="ghost" size="sm" className="mt-3" asChild>
          <Link href="/">
            <ArrowLeft /> Về trang tổng quan
          </Link>
        </Button>
      </div>
    </div>
  )
}

function ParentLoginForm({ onLoggedIn }: { onLoggedIn: (parent: ParentMe) => void }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  const valid = username.trim().length > 0 && password.length > 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    setError(undefined)
    try {
      const result = await parentLogin(username.trim(), password)
      onLoggedIn(result.parent)
    } catch (err) {
      // Thông báo chung của BE ("Sai tài khoản hoặc mật khẩu", "Tài khoản đã bị khóa")
      setError(errorMessage(err).title)
      setPending(false)
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Phụ huynh đăng nhập</h1>
      <p className="mt-1 text-sm text-muted-foreground">Dùng tài khoản phụ huynh do nhà trường cấp.</p>

      <form onSubmit={submit} className="mt-5 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="parent-username">Tên đăng nhập</Label>
          <Input
            id="parent-username"
            value={username}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="parent-password">Mật khẩu</Label>
          <Input
            id="parent-password"
            type="password"
            value={password}
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={!valid || pending}>
          <LogIn /> {pending ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Giáo viên, cờ đỏ?{" "}
        <Link href={LOGIN_PATH} className="font-medium text-primary hover:underline">
          Đăng nhập tại đây
        </Link>
      </p>
    </>
  )
}

// Phụ huynh đã đăng nhập (quay lại trang này): thông tin con và lối vào trang kết quả thi đua của lớp
function ParentPanel({ me }: { me: ParentMe }) {
  const [passwordOpen, setPasswordOpen] = useState(false)

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Xin chào {me.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {me.relation} của học sinh <span className="font-medium text-foreground">{me.studentname}</span> ({me.studentcode})
      </p>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg bg-muted/50 px-4 py-3 text-sm">
        <dt className="text-muted-foreground">Lớp</dt>
        <dd className="font-medium">
          {me.classname}
          {me.archivedyearid !== null && <span className="ml-1 font-normal text-muted-foreground">(đã ra trường)</span>}
        </dd>
        <dt className="text-muted-foreground">Phân hiệu</dt>
        <dd>{me.branchname}</dd>
        <dt className="text-muted-foreground">GVCN</dt>
        <dd>{me.teachername ?? <span className="text-muted-foreground">Chưa có GVCN</span>}</dd>
      </dl>

      <Button className="mt-5 w-full" asChild>
        <Link href={me.BaseQRCode}>
          Xem kết quả thi đua của lớp {me.classname} <ArrowRight />
        </Link>
      </Button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setPasswordOpen(true)}>
          <KeyRound /> Đổi mật khẩu
        </Button>
        <Button variant="outline" onClick={parentLogout}>
          <LogOut /> Đăng xuất
        </Button>
      </div>

      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        submit={(body) => parentApi("/auth/parent/password", { method: "PUT", body: JSON.stringify(body) })}
      />
    </>
  )
}
