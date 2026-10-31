import type { Metadata } from "next"
import { TeachersView } from "@/components/views/teachers-view"

export const metadata: Metadata = { title: "Giáo viên" }

export default function TeachersPage() {
  return <TeachersView />
}
