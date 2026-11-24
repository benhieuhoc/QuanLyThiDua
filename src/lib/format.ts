// Ngày từ BE dạng "YYYY-MM-DD"; tách chuỗi để không lệch múi giờ như khi qua Date
export function formatDate(value: string, withYear = true) {
  const [y, m, d] = value.split("-")
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`
}

export const formatRange = (start: string, end: string) => `${formatDate(start, false)} – ${formatDate(end)}`

// Hôm nay theo giờ máy, cùng dạng với BE để so sánh chuỗi.
// Chỉ gọi khi đã có dữ liệu từ API (trên trình duyệt): gọi lúc prerender sẽ lỗi build với cacheComponents
export function todayISO() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

// "2026-11-17" → "T3 17/11"; tính thứ theo UTC để không lệch múi giờ
export function formatDayLabel(value: string) {
  const [y, m, d] = value.split("-").map(Number)
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${formatDate(value, false)}`
}

// Kẹp ngày "YYYY-MM-DD" vào [min, max] bằng so sánh chuỗi
export const clampDate = (value: string, min: string, max: string) => (value < min ? min : value > max ? max : value)

export const formatSigned =(value: number) => (value > 0 ? `+${value}` : String(value))

// Thời điểm ISO có giờ (cột timestamptz, vd. folder / file) → "HH:mm DD/MM/YYYY" theo giờ Việt Nam.
// Chỉ gọi khi đã có dữ liệu API (không chạy lúc prerender)
export function formatDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  )
  return `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}/${parts.year}`
}

// Dung lượng byte → "512 B", "1,5 KB", "20 MB"
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[i]}`
}
