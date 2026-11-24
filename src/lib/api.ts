import { mutate } from "swr"
import type { Account, FieldError, LoginResult, ParentLoginResult } from "./types"

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
// Token giáo viên / cờ đỏ và token phụ huynh lưu tách nhau: BE chỉ nhận token phụ huynh ở /auth/parent/*.
// Truy cập storage có thể ném lỗi (chế độ riêng tư, chặn dữ liệu trang) nên luôn bọc try/catch
const TOKEN_KEY = "qllh.token"
const PARENT_TOKEN_KEY = "qllh.parentToken"
export const LOGIN_PATH = "/dang-nhap"
export const PARENT_LOGIN_PATH = "/dang-nhap/phu-huynh"
const HOME_PATH = "/"

function readStorage(key: string) {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Không lưu được token: lần gọi API sau coi như chưa đăng nhập
  }
}

export const getToken = () => readStorage(TOKEN_KEY)
export const setToken = (token: string) => writeStorage(TOKEN_KEY, token)
export const clearToken = () => writeStorage(TOKEN_KEY, null)

export const getParentToken = () => readStorage(PARENT_TOKEN_KEY)
export const clearParentToken = () => writeStorage(PARENT_TOKEN_KEY, null)

// Chưa đăng nhập không còn bị chuyển sang trang đăng nhập mà về Tổng quan (chế độ khách).
// Điều hướng cứng để xóa toàn bộ cache SWR của phiên cũ; đang ở Tổng quan thì xóa tài khoản cũ trong cache và tải lại /auth/me
function goHomeAsGuest() {
  if (typeof window === "undefined") return
  if (window.location.pathname === HOME_PATH) void mutate("/auth/me", undefined)
  else window.location.replace(HOME_PATH)
}

// Đăng xuất: BE không có API logout, chỉ xóa token phía FE rồi về Tổng quan (điều hướng cứng để xóa cache)
export function logout() {
  clearToken()
  if (typeof window !== "undefined") window.location.replace(HOME_PATH)
}

const UNAUTHORIZED = "Chưa đăng nhập"

// 401: chưa đăng nhập (không có token) hoặc phiên hết hạn
export const isUnauthorized = (err: unknown) => err instanceof ApiError && err.status === 401

// Gọi API, trả về `data` của response chuẩn { success, data, message }
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (DEMO_MODE) return demoApi<T>(path, init)

  const isLogin = path === "/auth/login"
  const token = getToken()
  // Chưa có token thì không gọi BE (chắc chắn 401); không chuyển trang vì khách vẫn xem được Tổng quan
  if (!token && !isLogin) throw new ApiError(UNAUTHORIZED, 401)

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        // FormData (tải file lên): để trình duyệt tự đặt multipart/form-data kèm boundary
        ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
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
    goHomeAsGuest()
  }
  return unwrap<T>(res.ok, res.status, body)
}

export const fetcher = <T>(path: string) => api<T>(path)

// API công khai (/public/..., phụ huynh không đăng nhập): không gửi token và không chuyển về trang đăng nhập khi lỗi
export async function publicApi<T>(path: string): Promise<T> {
  if (DEMO_MODE) return demoApi<T>(path)

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`)
  } catch {
    throw new ApiError("Không kết nối được máy chủ", 0)
  }
  const body = await res.json().catch(() => null)
  return unwrap<T>(res.ok, res.status, body)
}

export const apiPost = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) })

export const apiPut = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(data) })

export const apiDelete = <T>(path: string) => api<T>(path, { method: "DELETE" })

// Gửi multipart/form-data (POST /files, PUT /files/:id thay nội dung)
export const apiPostForm = <T>(path: string, form: FormData) => api<T>(path, { method: "POST", body: form })
export const apiPutForm = <T>(path: string, form: FormData) => api<T>(path, { method: "PUT", body: form })

// Tên file từ Content-Disposition (BE gửi cả filename* UTF-8 và filename ASCII)
function downloadName(disposition: string | null, fallback: string) {
  const match = /filename\*=UTF-8''([^;]+)/i.exec(disposition ?? "") ?? /filename="([^"]+)"/i.exec(disposition ?? "")
  if (!match) return fallback
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

// Tải file từ BE (vd. Excel /scores/export). Không dùng <a href> được vì cần header Authorization;
// lỗi BE vẫn là JSON { success, message } nên ném ApiError như api()
export async function apiDownload(path: string, fallbackName = "download.xlsx") {
  if (DEMO_MODE) throw new ApiError("Bản demo không hỗ trợ tải file", 403)
  const token = getToken()
  if (!token) throw new ApiError(UNAUTHORIZED, 401)

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    throw new ApiError(`Không kết nối được máy chủ (${API_URL})`, 0)
  }
  if (!res.ok) {
    const body: ApiBody = await res.json().catch(() => null)
    if (res.status === 401) {
      clearToken()
      goHomeAsGuest()
    }
    throw new ApiError(body?.message ?? "Không tải được file", res.status, body?.errors)
  }

  const filename = downloadName(res.headers.get("Content-Disposition"), fallbackName)
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Thu hồi sau khi trình duyệt đã bắt đầu tải
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return filename
}

// POST /auth/login → lưu token; 401 sai tài khoản / mật khẩu, 403 tài khoản bị khóa
export async function login(username: string, password: string) {
  const result = await apiPost<LoginResult>("/auth/login", { username, password })
  setToken(result.token)
  return result
}

// API của phụ huynh (/auth/parent/*): gửi token phụ huynh, không đụng token giáo viên.
// 401 (hết hạn, bị khóa / xóa) → xóa token phụ huynh, trang đăng nhập phụ huynh hiện lại form
export async function parentApi<T>(path: string, init?: RequestInit): Promise<T> {
  const isLogin = path === "/auth/parent/login"
  const token = getParentToken()
  if (!token && !isLogin) throw new ApiError(UNAUTHORIZED, 401)
  if (DEMO_MODE) return demoApi<T>(path, init)

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
    throw new ApiError("Không kết nối được máy chủ", 0)
  }
  const body = await res.json().catch(() => null)
  if (res.status === 401 && !isLogin) clearParentToken()
  return unwrap<T>(res.ok, res.status, body)
}

export const parentFetcher = <T>(path: string) => parentApi<T>(path)

// POST /auth/parent/login → lưu token phụ huynh; 401 sai tài khoản / mật khẩu, 403 tài khoản bị khóa
export async function parentLogin(username: string, password: string) {
  const result = await parentApi<ParentLoginResult>("/auth/parent/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
  writeStorage(PARENT_TOKEN_KEY, result.token)
  return result
}

// Đăng xuất phụ huynh: chỉ xóa token phụ huynh, tải lại /auth/parent/me để trang hiện lại form
export function parentLogout() {
  clearParentToken()
  void mutate("/auth/parent/me", undefined)
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
