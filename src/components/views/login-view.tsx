"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { LogIn } from "lucide-react"
import { DEMO_MODE, errorMessage, getToken, login } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginView() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  // Đã có token (hoặc bản demo không cần đăng nhập) thì vào thẳng Tổng quan; token hết hạn sẽ bị 401 đưa lại đây.
  // Đọc storage trong effect vì không có lúc server render
  useEffect(() => {
    if (DEMO_MODE || getToken()) router.replace("/")
  }, [router])

  const valid = username.trim().length > 0 && password.length > 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    setError(undefined)
    try {
      await login(username.trim(), password)
      router.replace("/")
    } catch (err) {
      // Thông báo chung của BE ("Sai tài khoản hoặc mật khẩu", "Tài khoản đã bị khóa")
      setError(errorMessage(err).title)
      setPending(false)
    }
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
            width={2172}
            height={386}
            sizes="(min-width: 480px) 448px, calc(100vw - 32px)"
            preload
            className="aspect-[3/1] h-auto w-full object-cover object-left"
          />
        </div>

        <Card className="gap-0 px-6 py-6">
          <h1 className="text-xl font-semibold tracking-tight">Đăng nhập</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dùng tài khoản do giáo viên quản lý nề nếp cấp.</p>

          <form onSubmit={submit} className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="login-username">Tên đăng nhập</Label>
              <Input
                id="login-username"
                value={username}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="login-password">Mật khẩu</Label>
              <Input
                id="login-password"
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
        </Card>
      </div>
    </div>
  )
}
