"use client"

import Link from "next/link"
import { LogIn, UserRound } from "lucide-react"
import { LOGIN_PATH, PARENT_LOGIN_PATH } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// Hai lối đăng nhập riêng cho khách: phụ huynh (bảng parent, token riêng) và giáo viên – cờ đỏ (bảng account)
export function LoginButtons({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", compact ? "flex-nowrap" : "flex-wrap", className)}>
      {compact ? (
        // Header: nút gọn chỉ ghi "Phụ huynh", di chuột / focus mới hiện "Đăng nhập phụ huynh"
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" asChild>
              <Link href={PARENT_LOGIN_PATH} aria-label="Đăng nhập phụ huynh">
                <UserRound />
                Phụ huynh
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={4}>
            Đăng nhập phụ huynh
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button variant="outline" size="lg" asChild>
          <Link href={PARENT_LOGIN_PATH}>
            <UserRound />
            Phụ huynh đăng nhập
          </Link>
        </Button>
      )}
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
