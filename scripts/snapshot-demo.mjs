// Chụp dữ liệu từ BE đang chạy thành file tĩnh cho bản demo (NEXT_PUBLIC_DEMO_MODE=true).
// Chạy: npm run snapshot:demo (BE ở NEXT_PUBLIC_API_URL hoặc http://localhost:3001)
// BE bắt buộc đăng nhập: cần biến môi trường SNAPSHOT_USERNAME, SNAPSHOT_PASSWORD của một tài khoản admin
// để đọc được mọi dữ liệu. Bản demo không đăng nhập: người xem có quyền admin (DEMO_VIEWER trong src/lib/api.ts),
// nên không chụp /auth/me. Có chụp /accounts cho trang Tài khoản (không có mật khẩu, nhưng lộ tên đăng nhập).
// Ngoài POST /auth/login chỉ gọi GET, theo đúng các key SWR trong src/hooks/use-data.ts.
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

const { SNAPSHOT_USERNAME, SNAPSHOT_PASSWORD } = process.env
if (!SNAPSHOT_USERNAME || !SNAPSHOT_PASSWORD) {
  throw new Error("Thiếu SNAPSHOT_USERNAME / SNAPSHOT_PASSWORD (tài khoản admin) để đăng nhập BE")
}

async function login() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: SNAPSHOT_USERNAME, password: SNAPSHOT_PASSWORD }),
  }).catch(() => null)
  const body = await res?.json().catch(() => null)
  if (!res?.ok || !body?.success) {
    throw new Error(`Không đăng nhập được BE ${API_URL}: ${body?.message ?? "không kết nối được"}`)
  }
  if (body.data.account.kind !== "admin") throw new Error("Tài khoản chụp snapshot phải là admin")
  return body.data.token
}

const token = await login()

let saved = 0
let bytes = 0

async function snapshot(p) {
  const res = await fetch(`${API_URL}${p}`, { headers: { Authorization: `Bearer ${token}` } })
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
await snapshotAll(["/teachers", "/weeks/current", "/accounts"])

// Phạm vi lọc phân hiệu/khối của trang xếp hạng, học sinh
const scopes = [{}]
for (const b of branches) scopes.push({ branchid: b.id })
for (const g of grades) scopes.push({ gradeid: g.id })
for (const b of branches) for (const g of grades) scopes.push({ branchid: b.id, gradeid: g.id })

// Trang học sinh: "/students" khi không lọc, còn lại theo phân hiệu/khối hoặc theo lớp; dialog học sinh của lớp
const [allStudents] = await Promise.all(["/students"].map(snapshot))
await snapshotAll([
  ...scopes.filter((scope) => toQuery(scope)).map((scope) => `/students?${toQuery(scope)}`),
  ...classes.map((c) => `/students?classid=${c.id}`),
  ...classes.map((c) => `/classes/${c.id}`),
  // Trang Điểm lớp: mọi lượt chấm của lớp
  ...classes.map((c) => `/points?classid=${c.id}`),
  // Lịch sử lượt chấm của từng học sinh
  ...(allStudents ?? []).map((st) => `/points?studentid=${st.id}`),
])

for (const year of schoolYears) {
  const weeks = (await snapshot(`/weeks?schoolyearid=${year.id}`)) ?? []
  const paths = []

  for (const w of weeks) {
    paths.push(`/scores/weekly?weekid=${w.id}`)
    for (const c of classes) paths.push(`/points?weekid=${w.id}&classid=${c.id}`)
  }
  for (const c of classes) paths.push(`/scores/class/${c.id}?schoolyearid=${year.id}`)

  // Xếp hạng tuần/tháng/học kỳ: chỉ các khoảng đã bắt đầu (khoảng chưa bắt đầu bị tắt trong ô chọn)
  const periods = await snapshot(`/scores/periods?schoolyearid=${year.id}`)
  if (periods) {
    const started = new Set(periods.weeks.filter((w) => w.started).map((w) => w.numweek))
    const ranges = [
      ...[...started].map((n) => ({ week: n })),
      ...periods.months.filter((m) => started.has(m.fromweek)).map((m) => ({ month: m.value })),
      ...periods.semesters.filter((s) => started.has(s.fromweek)).map((s) => ({ semester: s.value })),
    ]
    for (const range of ranges) {
      for (const scope of scopes) paths.push(`/scores/ranking?${toQuery({ schoolyearid: year.id, ...range, ...scope })}`)
    }
  }

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
