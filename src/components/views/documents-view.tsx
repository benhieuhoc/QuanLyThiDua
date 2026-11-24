"use client"

import { useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ChevronRight,
  Download,
  Ellipsis,
  FileText,
  Folder as FolderIcon,
  FolderInput,
  FolderPlus,
  House,
  Pencil,
  RefreshCw,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import { ApiError, apiDelete, apiDownload, apiPost, apiPostForm, apiPut, apiPutForm, errorMessage, refreshAll } from "@/lib/api"
import { isAdmin } from "@/lib/auth"
import { formatDateTime, formatFileSize } from "@/lib/format"
import type { FileItem, Folder, FolderContents } from "@/lib/types"
import { useFolder, useMe } from "@/hooks/use-data"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDelete, EmptyState, ErrorState, PageHeader, TableSkeleton, runMutation } from "@/components/common"

const PAGE_PATH = "/tai-lieu"
const FOLDER_PARAM = "thu-muc"

// Giới hạn tên theo BE: bắt buộc, ≤ 255 ký tự, không chứa / \ hay ký tự điều khiển
const MAX_NAME = 255
const INVALID_NAME_RE = /[/\\\u0000-\u001f\u007f]/
const nameError = (value: string) => {
  const name = value.trim()
  if (!name) return "Nhập tên"
  if (name.length > MAX_NAME) return `Tối đa ${MAX_NAME} ký tự`
  if (INVALID_NAME_RE.test(name)) return "Tên không được chứa / hoặc \\"
  return null
}

// ?thu-muc= sai / thiếu → thư mục gốc
function parseFolderId(value: string | null) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : undefined
}

const isNotFound = (err: unknown) => err instanceof ApiError && (err.status === 404 || err.status === 400)

// Breadcrumb từ gốc; mục cuối là thư mục đang mở (không bấm được)
function FolderPath({ path, onOpen }: { path: FolderContents["path"]; onOpen: (id?: number) => void }) {
  const crumbs = [{ id: undefined as number | undefined, name: "Tài liệu" }, ...path]
  return (
    <nav aria-label="Đường dẫn thư mục" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1
        return (
          <span key={c.id ?? "root"} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
            {last ? (
              <span className="flex min-w-0 items-center gap-1 truncate font-medium" aria-current="page">
                {i === 0 && <House className="size-3.5 shrink-0" />}
                {c.name}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onOpen(c.id)}
                className="flex min-w-0 items-center gap-1 truncate rounded text-muted-foreground hover:text-foreground hover:underline"
              >
                {i === 0 && <House className="size-3.5 shrink-0" />}
                {c.name}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}

// Dialog nhập tên (tạo thư mục, đổi tên thư mục / file); chỉ đóng khi lưu thành công
function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  initial = "",
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  initial?: string
  onSubmit: (name: string) => Promise<boolean>
}) {
  const [name, setName] = useState(initial)
  const [pending, setPending] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (next) setName(initial)
    onOpenChange(next)
  }

  const error = name ? nameError(name) : null
  const unchanged = name.trim() === initial

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nameError(name) || unchanged) return
    setPending(true)
    const ok = await onSubmit(name.trim())
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="item-name">Tên</Label>
            <Input
              id="item-name"
              value={name}
              maxLength={MAX_NAME}
              autoFocus
              aria-invalid={error ? true : undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
            <Button type="submit" disabled={!!nameError(name) || unchanged || pending}>
              {pending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Nội dung dialog chuyển: duyệt cây thư mục bằng GET /folders/:id (chỉ mount khi dialog mở)
function MoveBrowser({
  currentParent,
  excludeId,
  onSubmit,
}: {
  currentParent: number | null
  // Thư mục đang chuyển: không chọn được chính nó và thư mục con của nó
  excludeId?: number
  onSubmit: (target: number | null) => Promise<void>
}) {
  const [browseId, setBrowseId] = useState<number | undefined>(currentParent ?? undefined)
  const [pending, setPending] = useState(false)
  const folder = useFolder(browseId)

  const target = browseId ?? null
  const insideExcluded = excludeId !== undefined && !!folder.data?.path.some((p) => p.id === excludeId)
  const disabled = !folder.data || pending || target === currentParent || insideExcluded

  const submit = async () => {
    setPending(true)
    await onSubmit(target)
    setPending(false)
  }

  return (
    <>
      <div className="grid gap-3">
        <FolderPath path={folder.data?.path ?? []} onOpen={setBrowseId} />
        <div className="max-h-72 min-h-32 overflow-y-auto rounded-lg border">
          {folder.error ? (
            <ErrorState error={folder.error} onRetry={() => folder.mutate()} />
          ) : folder.isLoading || !folder.data ? (
            <TableSkeleton rows={3} />
          ) : !folder.data.folders.length ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Không có thư mục con</p>
          ) : (
            <ul className="divide-y">
              {folder.data.folders.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    disabled={f.id === excludeId}
                    onClick={() => setBrowseId(f.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FolderIcon className="size-4 shrink-0 text-amber-600" />
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    {f.id === excludeId ? (
                      <span className="text-xs text-muted-foreground">Đang chuyển</span>
                    ) : (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {insideExcluded && (
          <p className="text-xs text-destructive">Không thể chuyển thư mục vào chính nó hoặc thư mục con của nó.</p>
        )}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Hủy</Button>
        </DialogClose>
        <Button type="button" disabled={disabled} onClick={submit}>
          {pending ? "Đang chuyển..." : "Chuyển vào đây"}
        </Button>
      </DialogFooter>
    </>
  )
}

function MoveDialog({
  open,
  onOpenChange,
  name,
  currentParent,
  excludeId,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  currentParent: number | null
  excludeId?: number
  onSubmit: (target: number | null) => Promise<boolean>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chuyển “{name}”</DialogTitle>
          <DialogDescription>Mở thư mục muốn chuyển tới rồi bấm “Chuyển vào đây”.</DialogDescription>
        </DialogHeader>
        {open && (
          <MoveBrowser
            currentParent={currentParent}
            excludeId={excludeId}
            onSubmit={async (target) => {
              if (await onSubmit(target)) onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DownloadButton({ file }: { file: FileItem }) {
  const [pending, setPending] = useState(false)
  const download = async () => {
    setPending(true)
    try {
      await apiDownload(`/files/${file.id}/download`, file.name)
    } catch (err) {
      const { title, description } = errorMessage(err)
      toast.error(title, { description })
    } finally {
      setPending(false)
    }
  }
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Tải về ${file.name}`}
      title="Tải về"
      className="text-muted-foreground"
      disabled={pending}
      onClick={download}
    >
      <Download />
    </Button>
  )
}

type RowDialog = "rename" | "move" | null

function FolderActions({ folder }: { folder: Folder }) {
  const [dialog, setDialog] = useState<RowDialog>(null)
  const nonEmpty = folder.numfolders + folder.numfiles > 0
  const setOpen = (kind: RowDialog) => (open: boolean) => setDialog(open ? kind : null)

  return (
    <div className="flex justify-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${folder.name}`} className="text-muted-foreground">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog("rename")}>
            <Pencil /> Đổi tên
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("move")}>
            <FolderInput /> Chuyển tới...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDelete
        title={`Xóa thư mục “${folder.name}”?`}
        description={
          nonEmpty
            ? `Thư mục còn ${folder.numfolders} thư mục con và ${folder.numfiles} file. Toàn bộ nội dung bên trong (kể cả thư mục con) sẽ bị xóa vĩnh viễn.`
            : "Thư mục trống sẽ bị xóa."
        }
        // Thư mục còn nội dung: người dùng đã xác nhận nên gửi recursive=true (BE trả 409 nếu không gửi)
        onConfirm={() => apiDelete(`/folders/${folder.id}${nonEmpty ? "?recursive=true" : ""}`)}
      />
      <NameDialog
        open={dialog === "rename"}
        onOpenChange={setOpen("rename")}
        title="Đổi tên thư mục"
        initial={folder.name}
        onSubmit={(name) => runMutation(() => apiPut(`/folders/${folder.id}`, { name }), "Đã đổi tên thư mục")}
      />
      <MoveDialog
        open={dialog === "move"}
        onOpenChange={setOpen("move")}
        name={folder.name}
        currentParent={folder.parentid}
        excludeId={folder.id}
        onSubmit={(parentid) => runMutation(() => apiPut(`/folders/${folder.id}`, { parentid }), "Đã chuyển thư mục")}
      />
    </div>
  )
}

function FileActions({ file, canEdit }: { file: FileItem; canEdit: boolean }) {
  const [dialog, setDialog] = useState<RowDialog>(null)
  const replaceInput = useRef<HTMLInputElement>(null)
  const setOpen = (kind: RowDialog) => (open: boolean) => setDialog(open ? kind : null)

  // Thay nội dung: giữ id và tên, BE cập nhật mimetype / size theo file mới
  const replace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    e.target.value = ""
    if (!picked) return
    const form = new FormData()
    form.append("file", picked)
    await runMutation(() => apiPutForm(`/files/${file.id}`, form), `Đã thay nội dung “${file.name}”`)
  }

  return (
    <div className="flex justify-end gap-1">
      <DownloadButton file={file} />
      {canEdit && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${file.name}`} className="text-muted-foreground">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setDialog("rename")}>
                <Pencil /> Đổi tên
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog("move")}>
                <FolderInput /> Chuyển tới...
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => replaceInput.current?.click()}>
                <RefreshCw /> Thay nội dung...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input ref={replaceInput} type="file" className="hidden" tabIndex={-1} aria-hidden onChange={replace} />
          <ConfirmDelete
            title={`Xóa file “${file.name}”?`}
            description="File sẽ bị xóa vĩnh viễn khỏi kho tài liệu."
            onConfirm={() => apiDelete(`/files/${file.id}`)}
          />
          <NameDialog
            open={dialog === "rename"}
            onOpenChange={setOpen("rename")}
            title="Đổi tên file"
            description="Nên giữ đuôi file (vd. .docx, .pdf) để mở đúng ứng dụng sau khi tải về."
            initial={file.name}
            onSubmit={(name) => runMutation(() => apiPut(`/files/${file.id}`, { name }), "Đã đổi tên file")}
          />
          <MoveDialog
            open={dialog === "move"}
            onOpenChange={setOpen("move")}
            name={file.name}
            currentParent={file.folderid}
            onSubmit={(folderid) => runMutation(() => apiPut(`/files/${file.id}`, { folderid }), "Đã chuyển file")}
          />
        </>
      )}
    </div>
  )
}

// Tải lên nhiều file: BE nhận 1 file / request nên gửi lần lượt; báo lỗi riêng từng file (trùng tên 409, quá lớn 413)
function UploadButton({ folderid }: { folderid?: number }) {
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (!files.length) return
    let uploaded = 0
    setProgress({ done: 0, total: files.length })
    for (const [i, file] of files.entries()) {
      const form = new FormData()
      form.append("file", file)
      if (folderid) form.append("folderid", String(folderid))
      try {
        await apiPostForm<FileItem>("/files", form)
        uploaded++
      } catch (err) {
        const { title, description } = errorMessage(err)
        toast.error(`${file.name}: ${title}`, { description })
      }
      setProgress({ done: i + 1, total: files.length })
    }
    setProgress(null)
    if (uploaded) {
      toast.success(files.length === 1 ? `Đã tải lên “${files[0].name}”` : `Đã tải lên ${uploaded}/${files.length} file`)
      refreshAll()
    }
  }

  return (
    <>
      <input ref={input} type="file" multiple className="hidden" tabIndex={-1} aria-hidden onChange={upload} />
      <Button disabled={!!progress} onClick={() => input.current?.click()}>
        <Upload /> {progress ? `Đang tải lên ${progress.done}/${progress.total}...` : "Tải file lên"}
      </Button>
    </>
  )
}

function NewFolderButton({ parentid }: { parentid?: number }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FolderPlus /> Thư mục mới
      </Button>
      <NameDialog
        open={open}
        onOpenChange={setOpen}
        title="Tạo thư mục"
        description="Tên không trùng với thư mục khác trong cùng thư mục (không phân biệt hoa thường)."
        onSubmit={(name) => runMutation(() => apiPost("/folders", { name, parentid: parentid ?? null }), "Đã tạo thư mục")}
      />
    </>
  )
}

const ownerName = (username: string | null) =>
  username ?? <span className="text-muted-foreground italic">Không rõ</span>

export function DocumentsView() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const folderId = parseFolderId(searchParams.get(FOLDER_PARAM))
  const folder = useFolder(folderId)
  // Chỉ admin được tạo / sửa / xóa (BE trả 403 với tài khoản khác)
  const canEdit = isAdmin(useMe().data)

  const open = (id?: number) => router.push(id ? `${pathname}?${FOLDER_PARAM}=${id}` : PAGE_PATH)

  const data = folder.data
  const empty = data && !data.folders.length && !data.files.length

  return (
    <>
      <PageHeader
        title="Tài liệu"
        description={
          canEdit
            ? "Kho tài liệu dùng chung: tạo thư mục, tải file lên cho giáo viên và cờ đỏ xem, tải về."
            : "Kho tài liệu dùng chung của nhà trường. Bấm vào file để tải về."
        }
        actions={
          canEdit &&
          !folder.error && (
            <>
              <NewFolderButton parentid={folderId} />
              <UploadButton folderid={folderId} />
            </>
          )
        }
      />

      <Card className="gap-0 py-0">
        <div className="border-b px-4 py-3">
          <FolderPath path={data?.path ?? []} onOpen={open} />
        </div>
        {folder.error ? (
          folderId && isNotFound(folder.error) ? (
            <EmptyState
              title={errorMessage(folder.error).title}
              description="Thư mục có thể đã bị xóa hoặc đường dẫn không đúng."
              action={
                <Button variant="outline" size="sm" onClick={() => open()}>
                  Về thư mục gốc
                </Button>
              }
            />
          ) : (
            <ErrorState error={folder.error} onRetry={() => folder.mutate()} />
          )
        ) : folder.isLoading || !data ? (
          <TableSkeleton rows={5} />
        ) : empty ? (
          <EmptyState
            title="Thư mục trống"
            description={canEdit ? "Tạo thư mục con hoặc tải file lên để bắt đầu." : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Tên</TableHead>
                <TableHead className="w-36 text-right">Kích thước</TableHead>
                <TableHead className="hidden w-36 md:table-cell">Người tạo</TableHead>
                <TableHead className="hidden w-40 sm:table-cell">Cập nhật</TableHead>
                <TableHead className="w-28 pr-4 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.folders.map((f) => (
                <TableRow key={`folder-${f.id}`}>
                  <TableCell className="max-w-0 pl-4">
                    <button
                      type="button"
                      onClick={() => open(f.id)}
                      className="flex w-full min-w-0 items-center gap-2 text-left font-medium hover:underline"
                    >
                      <FolderIcon className="size-4 shrink-0 fill-amber-500/20 text-amber-600" />
                      <span className="truncate">{f.name}</span>
                    </button>
                  </TableCell>
                  <TableCell className="text-right text-sm whitespace-nowrap text-muted-foreground">
                    {f.numfolders + f.numfiles === 0
                      ? "Trống"
                      : [f.numfolders && `${f.numfolders} thư mục`, f.numfiles && `${f.numfiles} file`].filter(Boolean).join(" · ")}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{ownerName(f.accountusername)}</TableCell>
                  <TableCell className="hidden text-sm tabular-nums text-muted-foreground sm:table-cell">
                    {formatDateTime(f.updated_at)}
                  </TableCell>
                  <TableCell className="pr-4">{canEdit && <FolderActions folder={f} />}</TableCell>
                </TableRow>
              ))}
              {data.files.map((f) => (
                <TableRow key={`file-${f.id}`}>
                  <TableCell className="max-w-0 pl-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="size-4 shrink-0 text-sky-600" />
                      <span className="truncate" title={f.name}>{f.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">{formatFileSize(f.size)}</TableCell>
                  <TableCell className="hidden md:table-cell">{ownerName(f.accountusername)}</TableCell>
                  <TableCell className="hidden text-sm tabular-nums text-muted-foreground sm:table-cell">
                    {formatDateTime(f.updated_at)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <FileActions file={f} canEdit={canEdit} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  )
}
