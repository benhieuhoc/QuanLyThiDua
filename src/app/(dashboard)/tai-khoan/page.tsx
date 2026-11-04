import type { Metadata } from "next"
import { AccountsView } from "@/components/views/accounts-view"

export const metadata: Metadata = { title: "Tài khoản" }

export default function AccountsPage() {
  return <AccountsView />
}
