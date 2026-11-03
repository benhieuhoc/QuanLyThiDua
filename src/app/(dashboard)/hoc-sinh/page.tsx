import type { Metadata } from "next"
import { StudentsView } from "@/components/views/students-view"

export const metadata: Metadata = { title: "Học sinh" }

export default function StudentsPage() {
  return <StudentsView />
}
