import type { Metadata } from "next"
import { ParentsView } from "@/components/views/parents-view"

export const metadata: Metadata = { title: "Phụ huynh" }

export default function ParentsPage() {
  return <ParentsView />
}
