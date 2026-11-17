import type { Metadata } from "next"
import { RulesView } from "@/components/views/rules-view"

export const metadata: Metadata = { title: "Quy chế thi đua" }

export default function RulesPage() {
  return <RulesView />
}
