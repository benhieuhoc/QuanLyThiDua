import { mutate } from "swr"
import type { FieldError } from "./types"

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

// Lỗi từ BE: { success: false, message, errors? }
export class ApiError extends Error {
  status: number
  errors?: FieldError[]

  constructor(message: string, status: number, errors?: FieldError[]) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

// Bản demo (Vercel): không gọi BE, đọc snapshot trong public/demo-data do scripts/snapshot-demo.mjs tạo
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

// Tên file snapshot của một path; query được sắp xếp vì thứ tự tham số lọc phụ thuộc thao tác người dùng.
// Giữ khớp với demoFile trong scripts/snapshot-demo.mjs
export function demoFile(path: string) {
  const [pathname, query = ""] = path.split("?")
  const params = [...new URLSearchParams(query)].sort(([a], [b]) => a.localeCompare(b))
  return [pathname.slice(1).replaceAll("/", "."), ...params.map(([k, v]) => `${k}-${v}`)].join(".") + ".json"
}

// Snapshot lưu { status, body } nguyên trạng response BE (kể cả lỗi như 404 của /weeks/current)
async function demoApi<T>(path: string, init?: RequestInit): Promise<T> {
  if (init?.method && init.method !== "GET") {
    throw new ApiError("Bản demo chỉ cho phép xem, không thể thay đổi dữ liệu", 403)
  }
  const res = await fetch(`/demo-data/${demoFile(path)}`).catch(() => null)
  if (!res?.ok) throw new ApiError("Bản demo chưa có dữ liệu cho lựa chọn này", 404)
  const { status, body } = await res.json()
  return unwrap<T>(status >= 200 && status < 300, status, body)
}

type ApiBody = { success?: boolean; data?: unknown; message?: string; errors?: FieldError[] } | null

function unwrap<T>(ok: boolean, status: number, body: ApiBody) {
  if (!ok || !body?.success) {
    throw new ApiError(body?.message ?? `Lỗi ${status}`, status, body?.errors)
  }
  return body.data as T
}

// Gọi API, trả về `data` của response chuẩn { success, data, message }
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (DEMO_MODE) return demoApi<T>(path, init)

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    })
  } catch {
    throw new ApiError(`Không kết nối được máy chủ (${API_URL})`, 0)
  }

  const body = await res.json().catch(() => null)
  return unwrap<T>(res.ok, res.status, body)
}

export const fetcher = <T>(path: string) => api<T>(path)

export const apiPost = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) })

export const apiPut = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(data) })

export const apiDelete = <T>(path: string) => api<T>(path, { method: "DELETE" })

// Dữ liệu các bảng liên quan nhau (tên lớp phụ thuộc phân hiệu, GV kèm lớp chủ nhiệm)
// nên sau mỗi thao tác ghi thì tải lại toàn bộ
export const refreshAll = () => mutate(() => true)

// Lỗi validate khi thêm nhiều học sinh có field "students[i].code": ghi kèm số dòng
const rowLabel = (field?: string) => {
  const index = field?.match(/^students\[(\d+)\]/)?.[1]
  return index === undefined ? "" : `Dòng ${Number(index) + 1}: `
}

// Gộp message và chi tiết lỗi để hiển thị toast
export function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    const detail = err.errors
      ?.map((e) =>
        e.message
          ? rowLabel(e.field) + e.message
          : e.studentid ? (e.name ? String(e.name) : `HS #${e.studentid}`)
          : e.classname ? `GV #${e.teacherid} đang chủ nhiệm ${e.classname}` : e.teacherid ? `GV #${e.teacherid}` : null
      )
      .filter(Boolean)
      .join(", ")
    return { title: err.message, description: detail || undefined }
  }
  return { title: "Đã có lỗi xảy ra", description: undefined }
}
