"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMe } from "@/hooks/use-data"
import { isActive, navSectionsFor } from "./nav"

export function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <GraduationCap className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold">Quản lý lớp học</p>
        <p className="text-xs text-muted-foreground">Thi đua toàn trường</p>
      </div>
    </div>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  // Chưa biết loại tài khoản thì chưa hiện menu, tránh lộ mục không được phép
  const me = useMe().data

  return (
    <nav className="flex flex-col gap-5">
      {(me ? navSectionsFor(me.kind) : []).map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            {section.title}
          </p>
          {section.items.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-white/70 hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
