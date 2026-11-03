import { Suspense } from "react"
import type { Metadata } from "next"
import { TableSkeleton } from "@/components/common"
import { ClassDetailView } from "@/components/views/class-detail-view"

export const metadata: Metadata = { title: "Điểm lớp" }

// View đọc ?lop= bằng useSearchParams: với cacheComponents phải nằm trong Suspense
export default function ClassDetailPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <ClassDetailView />
    </Suspense>
  )
}
