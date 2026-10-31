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

// Gọi API, trả về `data` của response chuẩn { success, data, message }
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
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
  if (!res.ok || !body?.success) {
    throw new ApiError(body?.message ?? `Lỗi ${res.status}`, res.status, body?.errors)
  }
  return body.data as T
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

// Gộp message và chi tiết lỗi để hiển thị toast
export function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    const detail = err.errors
      ?.map((e) => e.message ?? (e.classname ? `GV #${e.teacherid} đang chủ nhiệm ${e.classname}` : e.teacherid ? `GV #${e.teacherid}` : null))
      .filter(Boolean)
      .join(", ")
    return { title: err.message, description: detail || undefined }
  }
  return { title: "Đã có lỗi xảy ra", description: undefined }
}
