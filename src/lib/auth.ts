// Quy tắc quyền phía FE, khớp BE (BE/docs/fe-handoff-phan-quyen.md, BE/Ai_rules/security.md).
// BE vẫn tự kiểm tra; ở đây chỉ để ẩn nút / chặn trang cho đúng với quyền
import type { Account, AccountKind, Point } from "./types"

export const KIND_LABELS: Record<AccountKind, string> = {
  admin: "Quản lý nề nếp",
  gvcn: "GVCN",
  codo: "Cờ đỏ",
}

// Chỉ admin được thêm / sửa / xóa dữ liệu cấu hình và khóa tuần
export const isAdmin = (me?: Account) => me?.kind === "admin"

// Tên hiển thị và nhãn vai trò, vd. "GVCN 6A1", "Cờ đỏ 7A1"
export function accountDisplay(me: Account) {
  const name = me.teachername ?? me.studentname ?? me.username
  const className = me.kind === "gvcn" ? me.homeroomclassname : me.kind === "codo" ? me.studentclassname : null
  return { name, role: className ? `${KIND_LABELS[me.kind]} ${className}` : KIND_LABELS[me.kind] }
}

// Lớp được tạo lượt chấm: admin mọi lớp, cờ đỏ lớp được phân công. GVCN chỉ xem, không chấm (BE trả 403)
export function canScoreClass(me: Account | undefined, classid: number) {
  if (!me) return false
  if (me.kind === "admin") return true
  if (me.kind === "codo") return me.classes.some((c) => c.id === classid)
  return false
}

// Sửa / xóa lượt chấm: admin mọi lượt, cờ đỏ chỉ lượt do chính mình nhập ở lớp vẫn đang được phân công.
// GVCN không sửa / xóa lượt nào
export function canManagePoint(me: Account | undefined, point: Point) {
  if (!me) return false
  if (me.kind === "admin") return true
  if (me.kind === "codo") return point.accountid === me.id && me.classes.some((c) => c.id === point.classid)
  return false
}
