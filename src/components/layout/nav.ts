import {
  Building2,
  CalendarRange,
  ChartColumn,
  ClipboardPen,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  School,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { AccountKind } from "@/lib/types"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  // Loại tài khoản được vào trang; bỏ trống = mọi tài khoản
  roles?: AccountKind[]
}

// Cờ đỏ chỉ vào Tổng quan và Chấm điểm (BE không chặn cờ đỏ đọc xếp hạng nên FE chặn trang)
const STAFF: AccountKind[] = ["admin", "gvcn"]

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
      { href: "/tong-hop", label: "Xếp hạng", icon: Trophy, roles: STAFF },
      { href: "/diem-lop", label: "Điểm lớp", icon: ChartColumn, roles: STAFF },
    ],
  },
  {
    title: "Cấu hình",
    items: [
      { href: "/nam-hoc", label: "Năm học & tuần", icon: CalendarRange, roles: STAFF },
      { href: "/phan-hieu", label: "Phân hiệu", icon: Building2, roles: STAFF },
      { href: "/giao-vien", label: "Giáo viên", icon: Users, roles: STAFF },
      { href: "/lop-hoc", label: "Lớp học", icon: School, roles: STAFF },
      { href: "/hoc-sinh", label: "Học sinh", icon: GraduationCap, roles: STAFF },
      { href: "/tai-khoan", label: "Tài khoản", icon: KeyRound, roles: ["admin"] },
    ],
  },
]

export const navItems: NavItem[] = navSections.flatMap((s) => s.items)

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href)

export const canAccess = (kind: AccountKind, item: NavItem) => !item.roles || item.roles.includes(kind)

// Trang không có trong menu (vd. 404) thì để Next xử lý
export const canAccessPath = (kind: AccountKind, pathname: string) => {
  const item = navItems.find((i) => isActive(pathname, i.href))
  return !item || canAccess(kind, item)
}

// Menu đã lọc theo loại tài khoản, bỏ nhóm rỗng
export const navSectionsFor = (kind: AccountKind) =>
  navSections
    .map((s) => ({ ...s, items: s.items.filter((i) => canAccess(kind, i)) }))
    .filter((s) => s.items.length > 0)
