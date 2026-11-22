"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarDays, ClipboardCheck, ListChecks, Trophy } from "lucide-react"
import { formatRange } from "@/lib/format"
import {
  useBranches,
  useClasses,
  useMe,
  usePublicMeta,
  usePublicPeriods,
  usePublicWeekRanking,
  useTeachers,
  useViewer,
  useWeeklyScore,
} from "@/hooks/use-data"
import { useWeekPicker } from "@/hooks/use-week-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState, ErrorState, PageHeader, StatCard, TableSkeleton, TeacherName } from "@/components/common"
import { ClassName, RankBadge, WeekStatus } from "@/components/scores"
import { canAccessPath } from "@/components/layout/nav"
import { LoginButtons } from "@/components/layout/login-buttons"

const TOP = 5

// Banner trường: hiện đủ ảnh, giới hạn chiều rộng để không chiếm quá nhiều chiều cao
function Banner() {
  return (
    <div className="mx-auto mb-6 max-w-3xl overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5">
      <Image
        src="/banner.jpg"
        alt="Trường THCS Phan Đình Phùng – Trang web quản lý thi đua lớp học"
        width={1024}
        height={434}
        sizes="(min-width: 800px) 768px, calc(100vw - 32px)"
        preload
        className="h-auto w-full"
      />
    </div>
  )
}

// Khách (chưa đăng nhập) xem bảng xếp hạng tuần qua API công khai; đã đăng nhập xem bản đầy đủ.
// Chưa biết người xem (đang tải /auth/me, lúc prerender) thì chỉ hiện banner, AuthGuard hiện khung chờ
export function OverviewView() {
  const { me, guest } = useViewer()
  return (
    <>
      <Banner />
      {guest ? <GuestOverview /> : me ? <MemberOverview /> : null}
    </>
  )
}

// Dữ liệu công khai: /public/meta → tuần hiện tại (ngoài năm học thì tuần đã bắt đầu gần nhất của năm học mới nhất,
// lấy từ /public/scores/periods) → /public/scores/ranking của tuần đó. Không có nội dung lượt chấm hay học sinh
function GuestOverview() {
  const meta = usePublicMeta()
  const current = meta.data?.currentweek ?? null
  const schoolyearid = current?.schoolyearid ?? meta.data?.schoolyears[0]?.id
  const periods = usePublicPeriods(meta.data && !current ? schoolyearid : undefined)
  const latest = periods.data?.weeks.filter((w) => w.started).at(-1)
  const week = current
    ? { numweek: current.numweek, startdate: current.startdate, enddate: current.enddate, locked: current.locked }
    : latest
  const yearName = current?.schoolyearname ?? periods.data?.schoolyear.name
  const ranking = usePublicWeekRanking(schoolyearid, week?.numweek)

  const scores = ranking.data?.scores ?? []
  const unscored = scores.filter((s) => s.entries === 0)
  const entries = scores.reduce((sum, s) => sum + s.entries, 0)
  const loading = meta.isLoading || periods.isLoading || ranking.isLoading
  const error = meta.error ?? periods.error ?? ranking.error
  const retry = () => (meta.error ? meta.mutate() : periods.error ? periods.mutate() : ranking.mutate())
  const scoreStat = (value: React.ReactNode) => (error ? "—" : week ? value : "—")

  return (
    <>
      <PageHeader
        title="Tổng quan thi đua"
        description={
          week && yearName
            ? `Tuần ${week.numweek} (${formatRange(week.startdate, week.enddate)}) · năm học ${yearName}`
            : "Kết quả thi đua các lớp toàn trường."
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Đăng nhập</CardTitle>
          <CardDescription>
            Phụ huynh đăng nhập để xem kết quả thi đua của lớp con em. Giáo viên và cờ đỏ đăng nhập để chấm điểm, xem xếp hạng
            và dữ liệu trường.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginButtons />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tuần"
          value={scoreStat(week?.numweek)}
          hint={week ? (week.locked ? "Đã khóa" : "Đang chấm") : undefined}
          icon={CalendarDays}
          tone="indigo"
          loading={loading}
        />
        <StatCard
          label="Lớp đã chấm"
          value={scoreStat(`${scores.length - unscored.length}/${scores.length}`)}
          hint={unscored.length ? `${unscored.length} lớp chưa có lượt chấm` : undefined}
          icon={ClipboardCheck}
          tone="emerald"
          loading={loading}
        />
        <StatCard label="Lượt chấm trong tuần" value={scoreStat(entries)} icon={ListChecks} tone="sky" loading={loading} />
        <StatCard
          label="Dẫn đầu"
          value={scoreStat(scores[0]?.classname ?? "—")}
          hint={scores[0] ? `${scores[0].total} điểm` : undefined}
          icon={Trophy}
          tone="amber"
          loading={loading}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Xếp hạng tuần</CardTitle>
            <CardDescription>Toàn trường, theo tổng điểm Nề nếp + Học tập</CardDescription>
            {week && (
              <CardAction>
                <WeekStatus week={week} />
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {error ? (
              <ErrorState error={error} onRetry={retry} />
            ) : loading ? (
              <TableSkeleton rows={TOP} />
            ) : !week ? (
              <EmptyState title="Chưa có tuần thi đua" description="Năm học chưa bắt đầu." />
            ) : scores.length === 0 ? (
              <EmptyState title="Chưa có lớp" />
            ) : (
              // Toàn trường vài chục lớp: cuộn trong khung để không đẩy phần còn lại xuống quá xa
              <ul className="-mx-1 max-h-[32rem] divide-y divide-border/70 overflow-y-auto px-1">
                {scores.map((s) => (
                  <li key={s.classid} className="flex items-center gap-3 py-2.5">
                    <RankBadge rank={s.rank} />
                    <ClassName name={s.classname} />
                    <TeacherName name={s.teachername} className="min-w-0 flex-1 truncate text-sm text-muted-foreground" />
                    <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
                      NN {s.conduct_score} · HT {s.study_score}
                    </span>
                    <span className="w-12 text-right font-semibold tabular-nums">{s.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Chưa chấm</CardTitle>
            <CardDescription>Lớp chưa có lượt chấm trong tuần</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? null : loading ? (
              <TableSkeleton rows={3} />
            ) : !week ? null : unscored.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tất cả các lớp đã có lượt chấm.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {unscored.map((s) => (
                  <Badge key={s.classid} variant="outline" className="border-amber-500/40 text-amber-700">
                    {s.classname}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function MemberOverview() {
  // Tuần mặc định: tuần hiện tại, ngoài năm học thì tuần đã bắt đầu gần nhất
  const picker = useWeekPicker()
  const week = picker.week
  const weekly = useWeeklyScore(week?.id)
  const branches = useBranches()
  const teachers = useTeachers()
  const classes = useClasses()
  // Cờ đỏ chỉ vào Tổng quan và Chấm điểm: ẩn liên kết sang trang không được vào
  const me = useMe().data
  const canOpen = (href: string) => (me ? canAccessPath(me.kind, href) : false)

  const scores = weekly.data?.scores ?? []
  const unscored = scores.filter((s) => s.entries === 0)
  const loading = picker.isLoading || weekly.isLoading
  const error = picker.error ?? weekly.error
  // API lỗi thì hiện "—" thay vì 0 để không hiểu nhầm là chưa có dữ liệu
  const count = (list: { error?: unknown; data?: unknown[] }) => (list.error ? "—" : (list.data?.length ?? 0))
  const scoreStat = (value: React.ReactNode) => (error ? "—" : week ? value : "—")

  return (
    <>
      <PageHeader
        title="Tổng quan thi đua"
        description={
          week
            ? `Tuần ${week.numweek} (${formatRange(week.startdate, week.enddate)}) · năm học ${week.schoolyearname}`
            : "Tình hình chấm điểm thi đua toàn trường."
        }
        actions={
          <Button asChild>
            <Link href="/cham-diem">
              Chấm điểm <ArrowRight />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tuần"
          value={scoreStat(week?.numweek)}
          hint={week ? (week.locked ? "Đã khóa" : "Đang mở") : undefined}
          icon={CalendarDays}
          tone="indigo"
          loading={loading}
        />
        <StatCard
          label="Lớp đã chấm"
          value={scoreStat(`${scores.length - unscored.length}/${scores.length}`)}
          hint={unscored.length ? `${unscored.length} lớp chưa có lượt chấm` : undefined}
          icon={ClipboardCheck}
          tone="emerald"
          loading={loading}
        />
        <StatCard label="Lượt chấm trong tuần" value={scoreStat(week?.entries)} icon={ListChecks} tone="sky" loading={loading} />
        <StatCard
          label="Dẫn đầu"
          value={scoreStat(scores[0]?.classname ?? "—")}
          hint={scores[0] ? `${scores[0].total} điểm` : undefined}
          icon={Trophy}
          tone="amber"
          loading={loading}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top {TOP} lớp trong tuần</CardTitle>
            <CardDescription>Xếp theo tổng điểm Nề nếp + Học tập</CardDescription>
            {canOpen("/tong-hop") && (
              <CardAction>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/tong-hop">
                    Xếp hạng <ArrowRight />
                  </Link>
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {error ? (
              <ErrorState error={error} onRetry={() => (picker.error ? picker.schoolYears.mutate() : weekly.mutate())} />
            ) : loading ? (
              <TableSkeleton rows={TOP} />
            ) : !week ? (
              <EmptyState
                title="Chưa có năm học"
                description="Tạo năm học để bắt đầu chấm điểm."
                action={
                  canOpen("/nam-hoc") && (
                    <Button variant="outline" asChild>
                      <Link href="/nam-hoc">Năm học & tuần</Link>
                    </Button>
                  )
                }
              />
            ) : scores.length === 0 ? (
              <EmptyState title="Chưa có lớp" description="Tạo lớp trong mục Lớp học." />
            ) : (
              <ul className="divide-y divide-border/70">
                {scores.slice(0, TOP).map((s) => (
                  <li key={s.classid} className="flex items-center gap-3 py-2.5">
                    <RankBadge rank={s.rank} />
                    <ClassName name={s.classname} />
                    <TeacherName name={s.teachername} className="min-w-0 flex-1 truncate text-sm text-muted-foreground" />
                    <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
                      NN {s.conduct_score} · HT {s.study_score}
                    </span>
                    <span className="w-12 text-right font-semibold tabular-nums">{s.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Chưa chấm</CardTitle>
              <CardDescription>Lớp chưa có lượt chấm trong tuần</CardDescription>
              {week && <CardAction><WeekStatus week={week} /></CardAction>}
            </CardHeader>
            <CardContent>
              {error ? null : loading ? (
                <TableSkeleton rows={3} />
              ) : !week ? null : unscored.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tất cả các lớp đã có lượt chấm.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {unscored.map((s) => (
                    <Badge key={s.classid} variant="outline" className="border-amber-500/40 text-amber-700">
                      {s.classname}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dữ liệu trường</CardTitle>
              <CardDescription>Cấu hình phân hiệu, giáo viên, lớp</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/70 text-sm">
                {[
                  { href: "/phan-hieu", label: "Phân hiệu", value: count(branches) },
                  { href: "/giao-vien", label: "Giáo viên", value: count(teachers) },
                  { href: "/lop-hoc", label: "Lớp học", value: count(classes) },
                ].map((item) => (
                  <li key={item.href}>
                    {canOpen(item.href) ? (
                      <Link href={item.href} className="flex items-center justify-between py-2 hover:text-primary">
                        <span>{item.label}</span>
                        <span className="font-semibold tabular-nums">{item.value}</span>
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between py-2">
                        <span>{item.label}</span>
                        <span className="font-semibold tabular-nums">{item.value}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
