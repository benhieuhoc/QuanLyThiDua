"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Brand, SidebarNav } from "./sidebar-nav"
import { isActive, navItems } from "./nav"

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
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-medium">Quản trị viên</p>
          <p className="text-xs text-muted-foreground">admin</p>
        </div>
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">QT</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
