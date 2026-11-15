import { Suspense } from "react"
import type { Metadata } from "next"
import { TableSkeleton } from "@/components/common"
import { PublicClassView } from "@/components/views/public-class-view"

export const metadata: Metadata = { title: "Kết quả thi đua của lớp" }

// Trang công khai cho phụ huynh quét mã QR (đường dẫn "/LopHoc/<qrcode>" do BE quy định trong BaseQRCode).
// Nằm ngoài route group (dashboard): không có sidebar, header, AuthGuard.
// View đọc [qrcode] bằng useParams: với cacheComponents và không có generateStaticParams phải nằm trong Suspense
export default function PublicClassPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <PublicClassView />
    </Suspense>
  )
}
