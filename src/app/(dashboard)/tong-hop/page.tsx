import type { Metadata } from "next"
import { SummaryView } from "@/components/views/summary-view"

export const metadata: Metadata = { title: "Tổng hợp thi đua" }

export default function SummaryPage() {
  return <SummaryView />
}
