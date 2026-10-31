// Chụp dữ liệu từ BE đang chạy thành file tĩnh cho bản demo (NEXT_PUBLIC_DEMO_MODE=true).
// Chạy: npm run snapshot:demo (BE ở NEXT_PUBLIC_API_URL hoặc http://localhost:3001)
// Chỉ gọi GET, theo đúng các key SWR trong src/hooks/use-data.ts.
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
const OUT_DIR = path.join(process.cwd(), "public", "demo-data")
const CONCURRENCY = 8

// Giữ khớp với demoFile trong src/lib/api.ts
function demoFile(p) {
  const [pathname, query = ""] = p.split("?")
  const params = [...new URLSearchParams(query)].sort(([a], [b]) => a.localeCompare(b))
  return [pathname.slice(1).replaceAll("/", "."), ...params.map(([k, v]) => `${k}-${v}`)].join(".") + ".json"
}

const toQuery = (params) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, String(value))
  return query.toString()
}

let saved = 0
let bytes = 0

async function snapshot(p) {
  const res = await fetch(`${API_URL}${p}`)
  const body = await res.json().catch(() => null)
  const content = JSON.stringify({ status: res.status, body })
  await writeFile(path.join(OUT_DIR, demoFile(p)), content)
  saved++
  bytes += content.length
  return body?.success ? body.data : undefined
}

async function snapshotAll(paths) {
  const queue = [...paths]
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await snapshot(queue.shift())
  })
  await Promise.all(workers)
}

await rm(OUT_DIR, { recursive: true, force: true })
await mkdir(OUT_DIR, { recursive: true })

const [branches, grades, classes, schoolYears] = await Promise.all(
  ["/branches", "/grades", "/classes", "/school-years"].map(snapshot)
)
if (!branches || !grades || !classes || !schoolYears) {
  throw new Error(`Không đọc được dữ liệu từ ${API_URL}; kiểm tra BE đang chạy`)
}
await snapshotAll(["/teachers", "/weeks/current"])

// Phạm vi lọc phân hiệu/khối của trang bảng điểm, tổng hợp
const scopes = [{}]
for (const b of branches) scopes.push({ branchid: b.id })
for (const g of grades) scopes.push({ gradeid: g.id })
for (const b of branches) for (const g of grades) scopes.push({ branchid: b.id, gradeid: g.id })

for (const year of schoolYears) {
  const weeks = (await snapshot(`/weeks?schoolyearid=${year.id}`)) ?? []
  const paths = []

  for (const w of weeks) {
    for (const scope of scopes) paths.push(`/scores/weekly?${toQuery({ weekid: w.id, ...scope })}`)
    for (const c of classes) paths.push(`/points?weekid=${w.id}&classid=${c.id}`)
  }
  for (const c of classes) paths.push(`/scores/class/${c.id}?schoolyearid=${year.id}`)

  // Tổng hợp: mặc định + mọi khoảng tuần đến tuần đã bắt đầu gần nhất (toweek mặc định của BE).
  // Khoảng vượt quá tuần đó không được chụp, bản demo báo chưa có dữ liệu
  const summary = await snapshot(`/scores/summary?schoolyearid=${year.id}`)
  const lastWeek = summary?.toweek ?? 0
  for (const scope of scopes) {
    paths.push(`/scores/summary?${toQuery({ schoolyearid: year.id, ...scope })}`)
    for (let to = 1; to <= lastWeek; to++) {
      for (let from = 1; from <= to; from++) {
        paths.push(`/scores/summary?${toQuery({ schoolyearid: year.id, fromweek: from, toweek: to, ...scope })}`)
      }
    }
  }

  await snapshotAll(paths)
}

console.log(`Đã lưu ${saved} file (${(bytes / 1024 / 1024).toFixed(1)} MB) vào public/demo-data`)
