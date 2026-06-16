import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Edit3, MoreHorizontal, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { EventItem } from '@/types/event';
import { cn } from '@/utils/cn';
import { Badge, Button, Card, CardBody, EmptyState } from './ui';
import { formatTimeRange, getPriorityLabel, getPriorityTone, getRecurrenceLabel, getTypeLabel, isAllDayEvent } from '@/utils/date';
import { getEventId } from '@/utils/event-id';
import { useLang } from '@/context/lang-context';

// ─── Types ────────────────────────────────────────────────────────────────────
export type EventFilterMode =
  | 'all' | EventItem['type'] | 'today' | 'week' | 'month' | 'completed'
  | 'deadline_expired' | 'deadline_today' | 'deadline_upcoming';

type EventStatus = 'ongoing' | 'upcoming' | 'passed' | 'completed';

const PAGE_SIZE = 8;

function getPaginationPages(currentPage: number, totalPages: number, maxVisible = 5) {
  const visibleCount = Math.min(maxVisible, totalPages);
  const maxStart = Math.max(totalPages - visibleCount + 1, 1);
  const start = Math.min(Math.max(currentPage - Math.floor(visibleCount / 2), 1), maxStart);

  return Array.from({ length: visibleCount }, (_, index) => start + index);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRealtimeStatus(event: EventItem): EventStatus {
  if (event.is_completed) return 'completed';
  const now = new Date();
  const [sh, sm] = event.start_time.slice(0, 5).split(':').map(Number);
  const [eh, em] = event.end_time.slice(0, 5).split(':').map(Number);
  const start = new Date(event.event_date); start.setHours(sh, sm, 0, 0);
  const end   = new Date(event.event_date); end.setHours(eh, em, 0, 0);
  if (now >= start && now <= end) return 'ongoing';
  if (start > now) return 'upcoming';
  return 'passed';
}

function getGroupLabel(status: EventStatus, lang: string): string {
  if (lang === 'ja') {
    return { ongoing: '🟢 進行中', upcoming: '🔵 近日予定', passed: '⬜ 終了・期限切れ', completed: '✓ 完了' }[status];
  }
  return { ongoing: '🟢 Đang diễn ra', upcoming: '🔵 Sắp tới', passed: '⬜ Đã qua / Quá hạn', completed: '✓ Hoàn thành' }[status];
}

// ─── EventToolbar ─────────────────────────────────────────────────────────────
export function EventToolbar({
  search, setSearch, filter, setFilter, onCreate, onExportExcel,
}: {
  search: string; setSearch: (v: string) => void;
  filter: EventFilterMode; setFilter: (v: EventFilterMode) => void;
  onCreate: () => void; onExportExcel?: () => void;
}) {
  const { lang } = useLang();

  const mainFilters: { value: EventFilterMode; label: string }[] = [
    { value: 'all',       label: lang === 'ja' ? 'すべて'       : 'Tất cả' },
    { value: 'hoc',       label: lang === 'ja' ? '学習'         : 'Học tập' },
    { value: 'deadline',  label: lang === 'ja' ? '締め切り'     : 'Deadline' },
    { value: 'lam_them',  label: lang === 'ja' ? 'アルバイト'   : 'Làm thêm' },
    { value: 'holiday',   label: lang === 'ja' ? '祝日'         : 'Ngày lễ' },
    { value: 'today',     label: lang === 'ja' ? '今日'         : 'Hôm nay' },
    { value: 'week',      label: lang === 'ja' ? '今週'         : 'Tuần này' },
    { value: 'month',     label: lang === 'ja' ? '今月'         : 'Tháng này' },
    { value: 'completed', label: lang === 'ja' ? '完了'         : 'Hoàn thành' },
  ];

  const deadlineSubFilters: { value: EventFilterMode; label: string }[] = [
    { value: 'deadline_expired',  label: lang === 'ja' ? '🔴 期限切れ'       : '🔴 Quá hạn' },
    { value: 'deadline_today',    label: lang === 'ja' ? '🟡 本日締め切り'   : '🟡 Hôm nay' },
    { value: 'deadline_upcoming', label: lang === 'ja' ? '🟢 近日締め切り'   : '🟢 Sắp đến' },
  ];

  const isDeadlineActive = filter === 'deadline' || deadlineSubFilters.some(f => f.value === filter);

  return (
    <Card>
      <CardBody className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'ja' ? 'タイトル、タグ、説明で検索...' : 'Tìm kiếm theo tiêu đề, tag, mô tả, địa điểm...'}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 pl-12 pr-4 py-4 text-base text-slate-950 dark:text-slate-50 shadow-sm outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900"
          />
        </div>

        {/* Main filters */}
        <div className="flex flex-wrap items-center gap-2">
          {mainFilters.map((item) => (
            <button key={item.value} type="button" onClick={() => setFilter(item.value)}
              className={cn('rounded-2xl px-4 py-2 text-sm font-medium transition',
                filter === item.value
                  ? 'bg-slate-950 dark:bg-brand-600 text-white shadow-glow'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              )}>
              {item.label}
            </button>
          ))}
          {onExportExcel && <Button variant="secondary" onClick={onExportExcel}>Excel</Button>}
          <Button onClick={onCreate}>
            <Calendar className="h-4 w-4" />
            {lang === 'ja' ? '作成' : 'Tạo mới'}
          </Button>
        </div>

        {/* Deadline sub-filters */}
        {isDeadlineActive && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 mr-1">
              {lang === 'ja' ? '締め切りフィルター:' : 'Lọc deadline:'}
            </span>
            {deadlineSubFilters.map((item) => (
              <button key={item.value} type="button" onClick={() => setFilter(item.value)}
                className={cn('rounded-xl px-3 py-1.5 text-xs font-medium transition',
                  filter === item.value
                    ? 'bg-amber-600 text-white'
                    : 'bg-white dark:bg-slate-700 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                )}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ─── EventTable ───────────────────────────────────────────────────────────────
export function EventTable({
  events, onEdit, onDelete, onComplete, onOpen, emptyTitle,
}: {
  events: EventItem[]; onEdit: (e: EventItem) => void;
  onDelete: (e: EventItem) => void; onComplete: (e: EventItem) => void;
  onOpen: (e: EventItem) => void; emptyTitle?: string;
}) {
  const { lang } = useLang();
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const safePage   = Math.max(1, Math.min(page, totalPages));
  const pageEvents = events.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const paginationPages = useMemo(() => getPaginationPages(safePage, totalPages), [safePage, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [events]);

  const L = {
    event:           lang === 'ja' ? 'イベント'   : 'Sự kiện',
    datetime:        lang === 'ja' ? '日時'       : 'Ngày giờ',
    type:            lang === 'ja' ? '種類'       : 'Loại',
    status:          lang === 'ja' ? 'ステータス' : 'Trạng thái',
    loc:             lang === 'ja' ? '場所'       : 'Địa điểm',
    priority:        lang === 'ja' ? '優先度'     : 'Mức độ',
    actions:         lang === 'ja' ? '操作'       : 'Thao tác',
    done:            lang === 'ja' ? '完了'       : 'Hoàn thành',
    edit:            lang === 'ja' ? '編集'       : 'Chỉnh sửa',
    delete:          lang === 'ja' ? '削除'       : 'Xoá',
    noDesc:          lang === 'ja' ? '説明なし'   : 'Không có mô tả',
    empty:           emptyTitle || (lang === 'ja' ? 'イベントがありません' : 'Chưa có sự kiện nào'),
    page:            lang === 'ja' ? 'ページ'     : 'Trang',
    of:              '/',
    events_count:    lang === 'ja' ? '件'         : 'sự kiện',
    ongoing:         lang === 'ja' ? '進行中'     : 'Đang diễn ra',
    passed:          lang === 'ja' ? '終了'       : 'Đã qua',
    upcoming:        lang === 'ja' ? 'もうすぐ開始' : 'Sắp tới',
    completed_label: lang === 'ja' ? '✓ 完了'    : '✓ Hoàn thành',
  };

  if (events.length === 0) {
    return <EmptyState title={L.empty} description={lang === 'ja' ? 'イベントを追加して始めましょう。' : 'Hãy thêm sự kiện để bắt đầu quản lý lịch.'} />;
  }

  return (
    <div className="space-y-4">

      {/* ── Desktop table ── */}
      <div className="hidden overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm lg:block">
        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
          <thead className="bg-slate-50/80 dark:bg-slate-900/50">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <th className="px-6 py-4">{L.event}</th>
              <th className="px-6 py-4">{L.datetime}</th>
              <th className="px-6 py-4">{L.type}</th>
              <th className="px-6 py-4">{L.status}</th>
              <th className="px-6 py-4">{L.loc}</th>
              <th className="px-6 py-4">{L.priority}</th>
              <th className="px-6 py-4 text-right">{L.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
            {(() => {
              let lastGroup: EventStatus | null = null;
              return pageEvents.map((event) => {
                const status = getRealtimeStatus(event);
                const showGroupHeader = status !== lastGroup;
                lastGroup = status;
                return (
                  <React.Fragment key={getEventId(event)}>
                    {showGroupHeader && (
                      <tr className="bg-slate-50/70 dark:bg-slate-900/50">
                        <td colSpan={7} className="px-6 py-2.5">
                          <span className="text-xs font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                            {getGroupLabel(status, lang)}
                          </span>
                        </td>
                      </tr>
                    )}
                    <tr className="transition hover:bg-slate-50/90 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-5">
                        <button className="text-left" onClick={() => onOpen(event)}>
                          <p className="font-semibold text-slate-950 dark:text-slate-50">{event.title}</p>
                          <p className="mt-1 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">{event.description || L.noDesc}</p>
                        </button>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                        <div>{format(new Date(event.event_date), 'dd/MM/yyyy')}</div>
                        {isAllDayEvent(event) ? (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                              🌍 {lang === 'ja' ? '終日' : 'Cả ngày'}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1 text-slate-400 dark:text-slate-500">{formatTimeRange(event.start_time, event.end_time)}</div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <Badge tone={event.type === 'deadline' ? 'warning' : event.type === 'hoc' ? 'brand' : event.type === 'holiday' ? 'success' : 'purple'}>
                          {getTypeLabel(event.type, lang)}
                        </Badge>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={status} isCompleted={event.is_completed} labels={L} />
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm text-slate-600 dark:text-slate-300">{event.location || '—'}</p>
                      </td>
                      <td className="px-6 py-5">
                        {event.deadline?.priority ? (
                          <Badge tone={getPriorityTone(event.deadline.priority)}>
                            {getPriorityLabel(event.deadline.priority, lang)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          {!event.is_completed && (
                            <ActionButton title={L.done} onClick={() => onComplete(event)}>
                              <CheckCircle2 className="h-4 w-4" />
                            </ActionButton>
                          )}
                          <ActionButton title={L.edit} onClick={() => onEdit(event)}>
                            <Edit3 className="h-4 w-4" />
                          </ActionButton>
                          <ActionButton title={L.delete} onClick={() => onDelete(event)} danger>
                            <Trash2 className="h-4 w-4" />
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="grid gap-4 lg:hidden">
        {pageEvents.map((event) => {
          const status = getRealtimeStatus(event);
          return (
            <Card key={getEventId(event)}>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <button className="text-left" onClick={() => onOpen(event)}>
                    <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">{event.title}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{event.description || L.noDesc}</p>
                  </button>
                  <MoreHorizontal className="h-4 w-4 text-slate-400 mt-1" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone={event.type === 'deadline' ? 'warning' : event.type === 'hoc' ? 'brand' : event.type === 'holiday' ? 'success' : 'purple'}>
                    {getTypeLabel(event.type, lang)}
                  </Badge>
                  <StatusBadge status={status} isCompleted={event.is_completed} labels={L} />
                </div>
                <div className="mt-4 grid gap-1 text-sm text-slate-600 dark:text-slate-300">
                  <p>{format(new Date(event.event_date), 'dd/MM/yyyy')} • {formatTimeRange(event.start_time, event.end_time)}</p>
                  <p>{event.location || '—'}</p>
                  {event.deadline?.priority && (
                    <Badge tone={getPriorityTone(event.deadline.priority)}>
                      {getPriorityLabel(event.deadline.priority, lang)}
                    </Badge>
                  )}
                  {event.recurrence_frequency && event.recurrence_frequency !== 'none' && (
                    <p className="text-xs text-slate-400">{getRecurrenceLabel(event.recurrence_frequency, 1, lang)}</p>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  {!event.is_completed && (
                    <Button variant="secondary" className="flex-1" onClick={() => onComplete(event)}>
                      <CheckCircle2 className="h-4 w-4" />{L.done}
                    </Button>
                  )}
                  <Button variant="secondary" className="flex-1" onClick={() => onEdit(event)}>
                    <Edit3 className="h-4 w-4" />{L.edit}
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {L.page} <span className="font-semibold text-slate-950 dark:text-slate-50">{safePage}</span> {L.of} {totalPages}
            {' '}({events.length} {L.events_count})
          </p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {paginationPages.map((pn) => {
              return (
                <button key={pn} type="button" onClick={() => setPage(pn)}
                  className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition',
                    pn === safePage
                      ? 'bg-slate-950 dark:bg-brand-600 text-white'
                      : 'border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                  )}>{pn}</button>
              );
            })}
            <button type="button" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status, isCompleted, labels }: { status: EventStatus; isCompleted?: boolean; labels: Record<string, string> }) {
  if (isCompleted) return <Badge tone="success">{labels.completed_label}</Badge>;
  if (status === 'ongoing') return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />{labels.ongoing}
    </span>
  );
  if (status === 'passed') return <Badge tone="neutral">{labels.passed}</Badge>;
  return <Badge tone="brand">{labels.upcoming}</Badge>;
}

function ActionButton({ children, title, onClick, danger = false }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl border transition',
        danger
          ? 'border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30'
          : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
      )}>
      {children}
    </button>
  );
}
