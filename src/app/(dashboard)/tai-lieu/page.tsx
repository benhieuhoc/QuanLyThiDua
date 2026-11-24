import { Suspense } from "react"
import type { Metadata } from "next"
import { TableSkeleton } from "@/components/common"
import { DocumentsView } from "@/components/views/documents-view"

export const metadata: Metadata = { title: "Tài liệu" }

// View đọc ?thu-muc= bằng useSearchParams: với cacheComponents phải nằm trong Suspense
export default function DocumentsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <DocumentsView />
    </Suspense>
  )
}
