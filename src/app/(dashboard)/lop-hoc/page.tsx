import type { Metadata } from "next"
import { ClassesView } from "@/components/views/classes-view"

export const metadata: Metadata = { title: "Lớp học" }

export default function ClassesPage() {
  return <ClassesView />
}
