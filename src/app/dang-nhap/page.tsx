import type { Metadata } from "next"
import { LoginView } from "@/components/views/login-view"

export const metadata: Metadata = { title: "Đăng nhập" }

// Nằm ngoài route group (dashboard): không có sidebar, header và AuthGuard
export default function LoginPage() {
  return <LoginView />
}
