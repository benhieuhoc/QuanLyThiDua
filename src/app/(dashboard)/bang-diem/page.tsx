import type { Metadata } from "next"
import { WeeklyScoresView } from "@/components/views/weekly-scores-view"

export const metadata: Metadata = { title: "Bảng điểm tuần" }

export default function WeeklyScoresPage() {
  return <WeeklyScoresView />
}
