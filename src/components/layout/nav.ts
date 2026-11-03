import {
  Building2,
  CalendarRange,
  ChartColumn,
  ClipboardPen,
  GraduationCap,
  LayoutDashboard,
  School,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export type NavSection = {
  title: string
  items: NavItem[]
}

// Chấm điểm thi đua là chức năng chính; phân hiệu, giáo viên, lớp là phần cấu hình
export const navSections: NavSection[] = [
  {
    title: "Thi đua",
    items: [
      { href: "/", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/cham-diem", label: "Chấm điểm", icon: ClipboardPen },
      { href: "/tong-hop", label: "Xếp hạng", icon: Trophy },
      { href: "/diem-lop", label: "Điểm lớp", icon: ChartColumn },
    ],
  },
  {
    title: "Cấu hình",
    items: [
      { href: "/nam-hoc", label: "Năm học & tuần", icon: CalendarRange },
      { href: "/phan-hieu", label: "Phân hiệu", icon: Building2 },
      { href: "/giao-vien", label: "Giáo viên", icon: Users },
      { href: "/lop-hoc", label: "Lớp học", icon: School },
      { href: "/hoc-sinh", label: "Học sinh", icon: GraduationCap },
    ],
  },
]

export const navItems: NavItem[] = navSections.flatMap((s) => s.items)

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href)
