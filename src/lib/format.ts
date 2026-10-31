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

export const formatSigned = (value: number) => (value > 0 ? `+${value}` : String(value))
