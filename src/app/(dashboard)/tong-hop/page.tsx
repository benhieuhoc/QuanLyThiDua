import type { Metadata } from "next"
import { SummaryView } from "@/components/views/summary-view"

export const metadata: Metadata = { title: "Xếp hạng thi đua" }

export default function SummaryPage() {
  return <SummaryView />
}
