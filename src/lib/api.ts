import { mutate } from "swr"
import type { Account, FieldError, LoginResult } from "./types"

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

// Bản demo không đăng nhập: người xem có quyền admin để thấy mọi trang và chức năng;
// thao tác ghi vẫn bị chặn ở demoApi (403). Không lấy từ snapshot để bản demo không phụ thuộc tài khoản BE nào
const DEMO_VIEWER: Account = {
  id: 0,
  username: "demo",
  role: "admin",
  kind: "admin",
  active: true,
  teacherid: null,
  teachername: null,
  homeroomclassid: null,
  homeroomclassname: null,
  studentid: null,
  studentcode: null,
  studentname: null,
  studentclassid: null,
  studentclassname: null,
  classes: [],
  created_at: "",
  updated_at: "",
}

// Snapshot lưu { status, body } nguyên trạng response BE (kể cả lỗi như 404 của /weeks/current)
async function demoApi<T>(path: string, init?: RequestInit): Promise<T> {
  if (init?.method && init.method !== "GET") {
    throw new ApiError("Bản demo chỉ cho phép xem, không thể thay đổi dữ liệu", 403)
  }
  if (path === "/auth/me") return DEMO_VIEWER as T
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

// Token đăng nhập (JWT, hết hạn sau 30 phút, BE chưa có refresh) lưu ở localStorage để giữ qua tải lại trang.
// Truy cập storage có thể ném lỗi (chế độ riêng tư, chặn dữ liệu trang) nên luôn bọc try/catch
const TOKEN_KEY = "qllh.token"
export const LOGIN_PATH = "/dang-nhap"

export function getToken() {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Không lưu được token: lần gọi API sau sẽ chuyển về trang đăng nhập
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Bỏ qua
  }
}

// Về trang đăng nhập bằng điều hướng cứng để xóa toàn bộ cache SWR của phiên cũ
export function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== LOGIN_PATH) {
    window.location.replace(LOGIN_PATH)
  }
}

// Đăng xuất: BE không có API logout, chỉ xóa token phía FE
export function logout() {
  clearToken()
  redirectToLogin()
}

const UNAUTHORIZED = "Chưa đăng nhập"

// Gọi API, trả về `data` của response chuẩn { success, data, message }
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (DEMO_MODE) return demoApi<T>(path, init)

  const isLogin = path === "/auth/login"
  const token = getToken()
  // Chưa có token thì không gọi BE (chắc chắn 401)
  if (!token && !isLogin) {
    redirectToLogin()
    throw new ApiError(UNAUTHORIZED, 401)
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token && !isLogin ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(`Không kết nối được máy chủ (${API_URL})`, 0)
  }

  const body = await res.json().catch(() => null)
  // 401 ngoài /auth/login: token hết hạn hoặc tài khoản bị khóa / xóa
  if (res.status === 401 && !isLogin) {
    clearToken()
    redirectToLogin()
  }
  return unwrap<T>(res.ok, res.status, body)
}

export const fetcher = <T>(path: string) => api<T>(path)

export const apiPost = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) })

export const apiPut = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(data) })

export const apiDelete = <T>(path: string) => api<T>(path, { method: "DELETE" })

// POST /auth/login → lưu token; 401 sai tài khoản / mật khẩu, 403 tài khoản bị khóa
export async function login(username: string, password: string) {
  const result = await apiPost<LoginResult>("/auth/login", { username, password })
  setToken(result.token)
  return result
}

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
