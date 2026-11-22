"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useViewer } from "@/hooks/use-data"
import { Card } from "@/components/ui/card"
import { ErrorState, TableSkeleton } from "@/components/common"
import { canAccessPath } from "./nav"

// Chỉ hiện trang khi người xem được vào trang hiện tại; không được phép thì về Tổng quan.
// Khách (chưa đăng nhập / phiên hết hạn) chỉ xem được trang `public` trong nav (Tổng quan), không bị chuyển sang trang đăng nhập.
// Luôn render children (ẩn bằng `hidden`) thay vì bỏ đi: lúc prerender chưa có tài khoản, nếu layout bỏ children
// thì Next không render được trang để kiểm tra instant navigation ("could not validate that a segment...").
// Ẩn trang chỉ phục vụ hiển thị, BE mới thực thi quyền
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { me, guest, error, mutate } = useViewer()
  const known = me !== undefined || guest
  const allowed = known && canAccessPath(me ? me.kind : null, pathname)
  const ready = known && allowed

  useEffect(() => {
    if (known && !allowed) router.replace("/")
  }, [known, allowed, router])

  return (
    <>
      {!ready &&
        (error ? (
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
