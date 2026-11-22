import type { Metadata } from "next"
import { ParentLoginView } from "@/components/views/parent-login-view"

export const metadata: Metadata = { title: "Phụ huynh đăng nhập" }

// Nằm ngoài route group (dashboard): không có sidebar, header và AuthGuard
export default function ParentLoginPage() {
  return <ParentLoginView />
}
