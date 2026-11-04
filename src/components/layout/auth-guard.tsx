"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ApiError } from "@/lib/api"
import { useMe } from "@/hooks/use-data"
import { Card } from "@/components/ui/card"
import { ErrorState, TableSkeleton } from "@/components/common"
import { canAccessPath } from "./nav"

// Chỉ hiện trang khi đã đăng nhập và loại tài khoản được vào trang hiện tại; không được phép thì về Tổng quan.
// Chưa có token / 401 thì api() đã chuyển về /dang-nhap.
// Luôn render children (ẩn bằng `hidden`) thay vì bỏ đi: lúc prerender chưa có tài khoản, nếu layout bỏ children
// thì Next không render được trang để kiểm tra instant navigation ("could not validate that a segment...").
// Ẩn trang chỉ phục vụ hiển thị, BE mới thực thi quyền
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: me, error, mutate } = useMe()
  const allowed = me ? canAccessPath(me.kind, pathname) : false
  const ready = me !== undefined && allowed

  useEffect(() => {
    if (me && !allowed) router.replace("/")
  }, [me, allowed, router])

  return (
    <>
      {!ready &&
        (error && !(error instanceof ApiError && error.status === 401) ? (
          <Card>
            <ErrorState error={error} onRetry={() => mutate()} />
          </Card>
        ) : (
          <Card>
            <TableSkeleton />
          </Card>
        ))}
      <div hidden={!ready}>{children}</div>
    </>
  )
}
