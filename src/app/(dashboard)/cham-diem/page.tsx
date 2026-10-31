import type { Metadata } from "next"
import { ScoringView } from "@/components/views/scoring-view"

export const metadata: Metadata = { title: "Chấm điểm" }

export default function ScoringPage() {
  return <ScoringView />
}
