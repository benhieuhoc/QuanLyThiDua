import { AppHeader } from "@/components/layout/app-header"
import { Brand, SidebarNav } from "@/components/layout/sidebar-nav"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Nền: các mảng màu mờ phía sau để lớp kính có chiều sâu */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-32 size-[520px] rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="absolute top-1/3 -right-40 size-[480px] rounded-full bg-sky-200/45 blur-3xl" />
        <div className="absolute -bottom-48 left-1/3 size-[460px] rounded-full bg-violet-200/40 blur-3xl" />
      </div>

      <aside className="glass fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-8 border-r px-3 py-5 md:flex">
        <Brand />
        <SidebarNav />
        <p className="mt-auto px-3 text-xs text-muted-foreground">Phiên bản 0.1</p>
      </aside>

      <div className="flex min-h-screen flex-col md:pl-64">
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
