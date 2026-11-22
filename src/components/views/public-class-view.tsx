"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ChevronDown, GraduationCap, SearchX, Trophy, UserRound, WifiOff } from "lucide-react"
import { ApiError, errorMessage, isUnauthorized, PARENT_LOGIN_PATH } from "@/lib/api"
import { formatDayLabel, formatRange } from "@/lib/format"
import type { ParentMe, PublicWeek } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useParentMe, useParentPoints, usePublicClass } from "@/hooks/use-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState, IconTile, TableSkeleton } from "@/components/common"
import { ClassName, SignedValue } from "@/components/scores"

// Trang cho phụ huynh (chủ yếu mở trên điện thoại sau khi quét QR): kết quả lớp từ GET /public/classes/:qrcode (không token).
// Phụ huynh đã đăng nhập (token phụ huynh) và đang xem lớp của con thì có thêm khung lượt chấm của con (/auth/parent/points)
export function PublicClassView() {
  // Mã QR là chuỗi ngẫu nhiên do BE cấp, truyền nguyên vào API (BE kiểm tra định dạng)
  const { qrcode } = useParams<{ qrcode: string }>()
  const [schoolyearid, setSchoolyearid] = useState<number>()
  const page = usePublicClass(qrcode, schoolyearid)
  // Không có token phụ huynh: useParentMe lỗi 401 ngay (không gọi BE), không hiện khung của con
  const parent = useParentMe()
  const parentMe = isUnauthorized(parent.error) ? undefined : parent.data

  // 404 (mã sai / đã đổi, lớp không có ở năm học) và 400 (năm học sai) đều báo không tìm thấy
  const notFound = page.error instanceof ApiError && (page.error.status === 400 || page.error.status === 404)
  const data = page.data
  const [latest, ...earlier] = data?.weeks ?? []

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-4 sm:py-8">
      <div className="mb-4 overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5">
        <Image
          src="/banner.jpg"
          alt="Trường THCS Phan Đình Phùng – Trang web quản lý thi đua lớp học"
          width={1024}
          height={434}
          sizes="(min-width: 672px) 640px, calc(100vw - 32px)"
          preload
          className="h-auto w-full"
        />
      </div>

      {notFound ? (
        <Card className="py-0">
          <Message
            icon={SearchX}
            title={page.error instanceof Error ? page.error.message : "Không tìm thấy lớp"}
            description="Kiểm tra lại mã QR hoặc đường dẫn được nhà trường cung cấp. Mã QR cũ có thể đã được nhà trường thay mới."
            action={
              // Lỗi do năm học vừa chọn: cho quay lại năm mặc định thay vì kẹt ở trang lỗi
              schoolyearid !== undefined && (
                <Button variant="outline" size="sm" onClick={() => setSchoolyearid(undefined)}>
                  Xem năm học gần nhất
                </Button>
              )
            }
          />
        </Card>
      ) : page.error ? (
        <Card className="py-0">
          <Message
            icon={WifiOff}
            title="Chưa tải được kết quả thi đua"
            description="Vui lòng kiểm tra kết nối mạng rồi thử lại."
            action={
              <Button variant="outline" size="sm" onClick={() => page.mutate()}>
                Thử lại
              </Button>
            }
          />
        </Card>
      ) : !data ? (
        <Card className="py-0">
          <TableSkeleton rows={6} />
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card className="gap-3 px-4 py-4">
            <div className="flex items-center gap-3">
              <ClassName name={data.schoolyear?.classname ?? data.class.name} className="px-3 text-lg" />
              <div className="min-w-0">
                <h1 className="font-semibold">Kết quả thi đua lớp {data.schoolyear?.classname ?? data.class.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {data.class.branchname}
                  {/* GVCN theo năm đang xem: lấy từ tuần mới nhất, năm chưa có tuần thì dùng GVCN hiện tại */}
                  {(latest ? latest.teachername : data.class.teachername) &&
                    ` · GVCN ${latest ? latest.teachername : data.class.teachername}`}
                </p>
              </div>
            </div>
            {data.class.archivedyearname && (
              <Badge variant="outline" className="w-fit gap-1 text-violet-700">
                <GraduationCap className="size-3.5" />
                Đã ra trường năm {data.class.archivedyearname}
              </Badge>
            )}
            {data.schoolyears.length > 0 && (
              <Select
                value={data.schoolyear ? String(data.schoolyear.id) : ""}
                onValueChange={(v) => setSchoolyearid(Number(v))}
              >
                <SelectTrigger aria-label="Chọn năm học" className="w-full bg-white/70 sm:w-64">
                  <SelectValue placeholder="Chọn năm học" />
                </SelectTrigger>
                <SelectContent>
                  {data.schoolyears.map((y) => (
                    <SelectItem key={y.id} value={String(y.id)} disabled={!y.started}>
                      Năm học {y.name} · lớp {y.classname}
                      {!y.started && " (chưa bắt đầu)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Card>

          {page.isValidating && schoolyearid !== undefined && data.schoolyear?.id !== schoolyearid ? (
            <Card className="py-0">
              <TableSkeleton rows={4} />
            </Card>
          ) : !data.schoolyear ? (
            <Card className="py-0">
              <EmptyState title="Chưa có kết quả thi đua" description="Lớp chưa tham gia năm học nào." />
            </Card>
          ) : !latest ? (
            <Card className="py-0">
              <EmptyState title="Chưa có kết quả thi đua" description={`Năm học ${data.schoolyear.name} chưa có tuần nào bắt đầu.`} />
            </Card>
          ) : (
            <>
              {/* classid trong /auth/parent/me là lớp hiện tại của con, trùng class.id của trang công khai */}
              {parentMe && parentMe.classid === data.class.id && (
                <ChildPoints parent={parentMe} schoolyearid={data.schoolyear.id} classid={data.class.id} />
              )}
              <LatestWeek week={latest} />
              {earlier.length > 0 && (
                <section className="grid gap-2">
                  <h2 className="px-1 text-sm font-semibold text-muted-foreground">Các tuần trước</h2>
                  {earlier.map((w) => (
                    <WeekRow key={w.weekid} week={w} />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Message({
  icon,
  title,
  description,
  action,
}: {
  icon: typeof SearchX
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
      <IconTile icon={icon} tone="rose" />
      <p className="mt-1 text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

function WeekTitle({ week }: { week: PublicWeek }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-semibold">Tuần {week.numweek}</span>
      <span className="text-sm text-muted-foreground">{formatRange(week.startdate, week.enddate)}</span>
      {!week.locked && (
        <Badge variant="outline" className="text-amber-700">
          Đang chấm, điểm có thể thay đổi
        </Badge>
      )}
    </div>
  )
}

function ScoreBox({ label, score, base, highlight }: { label: string; score: number; base?: number; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl px-3 py-2.5 text-center", highlight ? "bg-primary/10 text-primary" : "bg-muted/60")}>
      <p className={cn("text-xs", highlight ? "text-primary/80" : "text-muted-foreground")}>{label}</p>
      <p className="text-xl font-semibold tabular-nums">{score}</p>
      {base !== undefined && score !== base && (
        <p className="text-xs text-muted-foreground tabular-nums">gốc {base}</p>
      )}
    </div>
  )
}

function PointList({ points }: { points: PublicWeek["points"] }) {
  if (points.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">Không có lượt cộng / trừ điểm.</p>
  }
  return (
    <ul className="divide-y divide-border/70">
      {points.map((p, i) => (
        // Lượt chấm công khai không có id; danh sách cố định theo response nên dùng vị trí làm key
        <li key={i} className="flex items-start justify-between gap-3 py-2 text-sm">
          <div className="min-w-0">
            {/* Không hiện tên học sinh trên trang công khai (yêu cầu 2026-11-22); phụ huynh xem lượt chấm của con ở khung riêng */}
            <p className="break-words">{p.content}</p>
            <p className="text-xs text-muted-foreground">
              {p.type} · {formatDayLabel(p.pointdate)}
            </p>
          </div>
          <SignedValue value={p.value} />
        </li>
      ))}
    </ul>
  )
}

function SummaryBox({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-2 py-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold tabular-nums", className)}>{value}</p>
    </div>
  )
}

// Lượt chấm có gắn con trong năm học đang xem (gồm cả lượt ở lớp cũ nếu con đã chuyển lớp, ghi kèm tên lớp).
// Điểm là điểm của cả lượt, lượt có thể gắn nhiều học sinh
function ChildPoints({ parent, schoolyearid, classid }: { parent: ParentMe; schoolyearid: number; classid: number }) {
  const res = useParentPoints(schoolyearid)
  // 401: phiên phụ huynh hết hạn hoặc bị khóa (token đã bị xóa), ẩn khung
  if (isUnauthorized(res.error)) return null
  const data = res.data

  return (
    <Card className="gap-3 px-4 py-4">
      <div className="flex items-start gap-3">
        <IconTile icon={UserRound} tone="sky" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Lượt chấm của con: {parent.studentname}</h2>
          <p className="text-xs text-muted-foreground">
            {data?.schoolyear ? `Năm học ${data.schoolyear.name} · ` : ""}
            <Link href={PARENT_LOGIN_PATH} className="text-primary hover:underline">
              Trang phụ huynh
            </Link>
          </p>
        </div>
      </div>

      {res.error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span>{errorMessage(res.error).title}</span>
          <Button variant="outline" size="sm" onClick={() => res.mutate()}>
            Thử lại
          </Button>
        </div>
      ) : !data ? (
        <TableSkeleton rows={3} />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <SummaryBox label="Số lượt" value={data.summary.count} />
            <SummaryBox label="Cộng" value={`+${data.summary.plus}`} className="text-emerald-700" />
            <SummaryBox label="Trừ" value={`−${data.summary.minus}`} className="text-rose-700" />
            <SummaryBox label="Tổng" value={<SignedValue value={data.summary.total} />} />
          </div>
          {data.points.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Chưa có lượt cộng / trừ điểm nào gắn với con trong năm học này.</p>
          ) : (
            <ul className="-mx-1 max-h-80 divide-y divide-border/70 overflow-y-auto px-1">
              {data.points.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="break-words">{p.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.type} · Tuần {p.numweek} · {formatDayLabel(p.pointdate)}
                      {p.classid !== classid && ` · lớp ${p.classname}`}
                    </p>
                  </div>
                  <SignedValue value={p.value} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">Điểm là điểm của cả lượt chấm, một lượt có thể gắn nhiều học sinh.</p>
        </>
      )}
    </Card>
  )
}

function LatestWeek({ week }: { week: PublicWeek }) {
  return (
    <Card className="gap-4 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Tuần gần nhất</p>
          <WeekTitle week={week} />
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-1.5 text-amber-700">
          <Trophy className="size-4" />
          <span className="text-sm">
            Hạng <span className="text-lg font-semibold tabular-nums">{week.rank}</span>/{week.numclasses}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ScoreBox label="Nề nếp" score={week.conduct_score} base={week.conduct_base} />
        <ScoreBox label="Học tập" score={week.study_score} base={week.study_base} />
        <ScoreBox label="Tổng" score={week.total} highlight />
      </div>
      <div>
        <h2 className="text-sm font-semibold">Lượt cộng / trừ điểm</h2>
        <PointList points={week.points} />
      </div>
    </Card>
  )
}

// Tuần cũ thu gọn; dùng <details> để mở/đóng không cần state và hỗ trợ bàn phím sẵn
function WeekRow({ week }: { week: PublicWeek }) {
  return (
    <Card className="gap-0 py-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <WeekTitle week={week} />
            <p className="text-xs text-muted-foreground tabular-nums">
              Nề nếp {week.conduct_score} · Học tập {week.study_score}
            </p>
          </div>
          <div className="text-right tabular-nums">
            <p className="font-semibold">{week.total}</p>
            <p className="text-xs text-muted-foreground">
              Hạng {week.rank}/{week.numclasses}
            </p>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border/70 px-4 pb-2">
          <PointList points={week.points} />
        </div>
      </details>
    </Card>
  )
}
