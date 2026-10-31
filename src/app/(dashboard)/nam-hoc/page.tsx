import type { Metadata } from "next"
import { SchoolYearsView } from "@/components/views/school-years-view"

export const metadata: Metadata = { title: "Năm học & tuần" }

export default function SchoolYearsPage() {
  return <SchoolYearsView />
}
