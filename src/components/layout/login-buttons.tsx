"use client"

import Link from "next/link"
import { LogIn, UserRound } from "lucide-react"
import { LOGIN_PATH, PARENT_LOGIN_PATH } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Hai lối đăng nhập riêng cho khách: phụ huynh (bảng parent, token riêng) và giáo viên – cờ đỏ (bảng account)
export function LoginButtons({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", compact ? "flex-nowrap" : "flex-wrap", className)}>
      <Button variant="outline" size={compact ? "sm" : "lg"} asChild>
        <Link href={PARENT_LOGIN_PATH}>
          <UserRound />
          {compact ? (
            <>
              <span className="sm:hidden">Phụ huynh</span>
              <span className="hidden sm:inline">Phụ huynh đăng nhập</span>
            </>
          ) : (
            "Phụ huynh đăng nhập"
          )}
        </Link>
      </Button>
      <Button size={compact ? "sm" : "lg"} asChild>
        <Link href={LOGIN_PATH}>
          <LogIn />
          {compact ? (
            <>
              <span className="sm:hidden">Giáo viên</span>
              <span className="hidden sm:inline">Giáo viên – Cờ đỏ</span>
            </>
          ) : (
            "Giáo viên – Cờ đỏ đăng nhập"
          )}
        </Link>
      </Button>
    </div>
  )
}
