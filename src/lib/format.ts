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
