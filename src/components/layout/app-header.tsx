"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { ChevronDown, Eye, KeyRound, LogOut, Menu } from "lucide-react"
import { apiPut, DEMO_MODE, logout } from "@/lib/api"
import { accountDisplay } from "@/lib/auth"
import { useMe } from "@/hooks/use-data"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { runMutation } from "@/components/common"
import { Brand, SidebarNav } from "./sidebar-nav"
import { isActive, navItems } from "./nav"

// Giới hạn theo BE: mật khẩu mới 6 ký tự – 72 byte, khác mật khẩu cũ
const MIN_PASSWORD = 6
const MAX_PASSWORD_BYTES = 72
const byteLength = (value: string) => new TextEncoder().encode(value).length

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [pending, setPending] = useState(false)

  const change = (next: boolean) => {
    if (next) {
      setOldPassword("")
      setNewPassword("")
      setConfirm("")
    }
    onOpenChange(next)
  }

  const newError =
    newPassword && newPassword.length < MIN_PASSWORD
      ? `Tối thiểu ${MIN_PASSWORD} ký tự`
      : byteLength(newPassword) > MAX_PASSWORD_BYTES
        ? "Mật khẩu quá dài"
        : newPassword && newPassword === oldPassword
          ? "Mật khẩu mới phải khác mật khẩu cũ"
          : null
  const confirmError = confirm && confirm !== newPassword ? "Mật khẩu nhập lại không khớp" : null
  const valid = oldPassword.length > 0 && newPassword.length > 0 && !newError && confirm === newPassword

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await runMutation(() => apiPut("/auth/password", { oldPassword, newPassword }), "Đã đổi mật khẩu")
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
            <DialogDescription>Mật khẩu mới tối thiểu {MIN_PASSWORD} ký tự và khác mật khẩu cũ.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="old-password">Mật khẩu hiện tại</Label>
            <Input
              id="old-password"
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">Mật khẩu mới</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              aria-invalid={newError ? true : undefined}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {newError && <p className="text-xs text-destructive">{newError}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Nhập lại mật khẩu mới</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              aria-invalid={confirmError ? true : undefined}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {confirmError && <p className="text-xs text-destructive">{confirmError}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
            <Button type="submit" disabled={!valid || pending}>
              {pending ? "Đang lưu..." : "Đổi mật khẩu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Chữ cái đầu của 2 từ cuối tên, vd. "Nguyễn Văn An" → "VA"
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

function AccountMenu() {
  const me = useMe().data
  const [passwordOpen, setPasswordOpen] = useState(false)

  if (!me) return null
  // Bản demo không đăng nhập: không có đổi mật khẩu / đăng xuất
  if (DEMO_MODE) {
    return (
      <Badge variant="outline" className="gap-1.5 border-amber-500/40 bg-amber-50/70 text-amber-800">
        <Eye /> Bản demo · Chỉ xem
      </Badge>
    )
  }
  const { name, role } = accountDisplay(me)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto gap-2 px-2 py-1">
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-sm font-medium">{name}</span>
              <span className="block text-xs font-normal text-muted-foreground">{role}</span>
            </span>
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
            </Avatar>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">
              {role} · {me.username}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
            <KeyRound /> Đổi mật khẩu
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={logout}>
            <LogOut /> Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  )
}

export function AppHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const current = navItems.find((item) => isActive(pathname, item.href))

  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 md:px-6">
      {/* Menu trên mobile */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Mở menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="glass w-72 gap-6 p-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Brand />
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <p className="text-sm text-muted-foreground">
        Trường THCS <span className="text-foreground/30">/</span>{" "}
        <span className="font-medium text-foreground">{current?.label}</span>
      </p>

      <div className="ml-auto flex items-center gap-2">
        <AccountMenu />
      </div>
    </header>
  )
}
