import { useEffect, useMemo, useState, useCallback, memo, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, isToday as dateFnsIsToday, isPast, isFuture, parseISO } from 'date-fns';
import { AlertCircle, Calendar, CheckCircle2, Clock3, Sparkles, Plus } from 'lucide-react';
import { MonthCalendar, WeekAgenda } from '@/components/calendar-view';
import { DayEventsModal } from '@/components/day-events-modal';
import { EventFormModal } from '@/components/event-form-modal';
import { EventTable, EventToolbar, type EventFilterMode } from '@/components/event-list';
import { Badge, Button, Card, CardBody, EmptyState, Input, PageShell, Skeleton } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { completeDeadline, createEvent, deleteEvent, getAllEvents, getEventById, getMonthEvents, getTodayEvents, getUpcomingDeadlines, getWeekEvents, toggleEventCompletion, updateEvent } from '@/services/events';
import type { EventItem, EventPayload } from '@/types/event';
import { formatDateShort, formatTimeRange, getDeadlineCountdownLabel, getFreeTimeSuggestions, getMonthCursor, getPriorityLabel, getPriorityTone, getRecurrenceLabel, getTimeStatistics, getTypeLabel, isEventCompleted, isEventInCurrentMonth, isEventInCurrentWeek, isEventToday } from '@/utils/date';
import { exportEventsToExcel } from '@/utils/export';
import { getEventId } from '@/utils/event-id';
import { useNavigateSafe } from './helpers';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useLang } from '@/context/lang-context';


// ─── Real-time event status ───────────────────────────────────────────────────
function getRealtimeStatus(event: EventItem): 'ongoing' | 'passed' | 'upcoming' | 'completed' {
  if (event.is_completed) return 'completed';
  const now = new Date();
  const [startH, startM] = event.start_time.slice(0, 5).split(':').map(Number);
  const [endH, endM] = event.end_time.slice(0, 5).split(':').map(Number);
  const start = new Date(event.event_date);
  start.setHours(startH, startM, 0, 0);
  const end = new Date(event.event_date);
  end.setHours(endH, endM, 0, 0);
  if (now >= start && now <= end) return 'ongoing';
  if (now > end) return 'passed';
  return 'upcoming';
}

let dashboardCache: {
  events: EventItem[];
  todayEvents: EventItem[];
  deadlines: EventItem[];
} | null = null;

const calendarCache = new Map<string, { monthEvents: EventItem[]; weekEvents: EventItem[] }>();

function getCalendarCacheKey(cursor: Date, weekCursor: Date) {
  const weekStart = format(buildWeekStart(weekCursor), 'yyyy-MM-dd');
  const weekEnd = format(buildWeekEnd(weekCursor), 'yyyy-MM-dd');
  return `${cursor.getFullYear()}-${cursor.getMonth() + 1}-${weekStart}-${weekEnd}`;
}

export function DashboardPage() {
  const [events, setEvents] = useState<EventItem[]>(() => dashboardCache?.events ?? []);
  const [todayEvents, setTodayEvents] = useState<EventItem[]>(() => dashboardCache?.todayEvents ?? []);
  const [deadlines, setDeadlines] = useState<EventItem[]>(() => dashboardCache?.deadlines ?? []);
  const [loading, setLoading] = useState(!dashboardCache);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { user } = useAuth();
  const { lang } = useLang();

  const loadData = async () => {
    try {
      setLoading(!dashboardCache);
      const [all, today, upcoming] = await Promise.all([getAllEvents(), getTodayEvents(), getUpcomingDeadlines()]);
      dashboardCache = { events: all, todayEvents: today, deadlines: upcoming };
      setEvents(all);
      setTodayEvents(today);
      setDeadlines(upcoming);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dashboard');
      pushToast({ title: 'Không thể tải dữ liệu', description: err instanceof Error ? err.message : 'Vui lòng thử lại', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [pushToast]);

  const stats = useMemo(() => {
    const deadlineCount = events.filter((event) => event.type === 'deadline').length;
    const completedCount = events.filter((event) => event.is_completed).length;
    const timeStats = getTimeStatistics(events);
    const L = lang === 'ja';
    return [
      { label: L ? '合計イベント' : 'Tổng sự kiện', value: events.length, icon: Calendar, tone: 'brand' as const },
      { label: L ? '今日' : 'Hôm nay', value: todayEvents.length, icon: Clock3, tone: 'success' as const },
      { label: L ? '締め切り' : 'Deadline', value: deadlineCount, icon: AlertCircle, tone: 'warning' as const },
      { label: L ? '完了' : 'Hoàn thành', value: completedCount, icon: CheckCircle2, tone: 'purple' as const },
      { label: L ? '学習時間' : 'Giờ học', value: `${timeStats.studyHours}h`, icon: Calendar, tone: 'brand' as const },
    ];
  }, [events, todayEvents.length, lang]);

  const todayFocusEvents = useMemo(() => {
    return todayEvents.slice(0, 4).map(event => ({
      event,
      status: getRealtimeStatus(event),
    }));
  }, [todayEvents]);

  if (error) {
    return <ErrorPanel title="Không thể tải dashboard" description={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="overflow-hidden border-brand-100 bg-[linear-gradient(135deg,rgba(15,23,42,0.98)_0%,rgba(30,41,59,0.94)_45%,rgba(14,165,233,0.84)_100%)] text-white shadow-2xl">
          <CardBody className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-20">
              <div className="absolute -right-10 top-0 h-44 w-44 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute left-10 bottom-0 h-36 w-36 rounded-full bg-brand-300/30 blur-3xl" />
            </div>
            <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
              <div className="space-y-4">
                <Badge tone="brand">
                  {lang === 'ja' ? '本日の概要' : 'Tổng quan hôm nay'}
                </Badge>
                <div>
                  <p className="text-sm text-slate-300">
                    {lang === 'ja' ? 'こんにちは、' : 'Xin chào, '}
                    {user?.full_name || (lang === 'ja' ? 'ユーザー' : 'bạn')}！
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                    {lang === 'ja'
                      ? 'あなたのスケジュールは明確です。'
                      : 'Lịch trình của bạn đang rất rõ ràng.'}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
                    {lang === 'ja'
                      ? 'デッドライン、空き時間、繰り返しイベントをスマートに管理しましょう。'
                      : 'Theo dõi deadline, thời gian rảnh, sự kiện lặp lại và các điểm nhấn trong ngày bằng giao diện gọn, sáng, dễ demo.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                    <p className="text-slate-300">{lang === 'ja' ? '今日' : 'Hôm nay'}</p>
                    <p className="mt-1 text-lg font-semibold">
                      {todayEvents.length} {lang === 'ja' ? '件' : 'sự kiện'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                    <p className="text-slate-300">{lang === 'ja' ? '急ぎの締め切り' : 'Deadline gấp'}</p>
                    <p className="mt-1 text-lg font-semibold">
                      {todayEvents.filter((event) => event.type === 'deadline' && !event.deadline?.is_completed).length}
                      {' '}{lang === 'ja' ? '件' : 'việc'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                    <p className="text-slate-300">{lang === 'ja' ? '次の目標' : 'Mục tiêu tiếp theo'}</p>
                    <p className="mt-1 text-lg font-semibold">
                      {deadlines[0] ? getDeadlineCountdownLabel(deadlines[0].deadline?.due_datetime) : (lang === 'ja' ? 'なし' : 'Không có')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                <p className="text-sm text-slate-300">{lang === 'ja' ? '作業セッション' : 'Phiên làm việc'}</p>
                <div className="mt-3 space-y-3">
                  {stats.slice(0, 4).map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                        <div>
                          <p className="text-sm text-slate-300">{stat.label}</p>
                          <p className="text-xl font-semibold">{stat.value}</p>
                        </div>
                        <Icon className="h-5 w-5 text-sky-200" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>


        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="overflow-hidden">
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">{stat.value}</p>
                    </div>
                    <div className={`rounded-2xl p-3 ${stat.tone === 'brand' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' : stat.tone === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : stat.tone === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <CardBody>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{lang === 'ja' ? '今日' : 'Hôm nay'}</p>
                  <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? '注目のスケジュール' : 'Lịch trình nổi bật'}</h2>
                </div>
                <Button variant="secondary" onClick={() => navigate('/app/calendar')}>
                  {lang === 'ja' ? 'カレンダー' : 'Xem lịch'}
                </Button>
              </div>

              {todayEvents.length === 0 ? (
                <EmptyState title={lang === 'ja' ? '今日のイベントはありません' : 'Không có sự kiện trong hôm nay'} description={lang === 'ja' ? '今日は余裕があります。必要であればイベントを追加しましょう。' : 'Hôm nay khá thoáng, hãy tạo thêm sự kiện nếu cần.'} />
              ) : (
                <div className="space-y-3">
                  {todayEvents.map((event) => (
                    <div key={getEventId(event)} className="flex flex-col gap-4 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-950 dark:text-slate-50">{event.title}</h3>
                          <Badge tone={event.type === 'deadline' ? 'warning' : event.type === 'hoc' ? 'brand' : 'purple'}>{getTypeLabel(event.type)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{event.description || (lang === 'ja' ? '説明なし' : 'Không có mô tả')}</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{formatTimeRange(event.start_time, event.end_time)} • {event.location || '—'}</p>
                      </div>
                      <Button variant="secondary" onClick={() => navigate(`/app/events/${getEventId(event)}`)}>
                        {lang === 'ja' ? '詳細' : 'Chi tiết'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Deadline</p>
                  <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? '近日締め切り' : 'Sắp đến hạn'}</h2>
                </div>
                <Sparkles className="h-5 w-5 text-brand-500" />
              </div>

              {deadlines.length === 0 ? (
                <EmptyState title={lang === 'ja' ? '未処理の締め切りなし' : 'Không có deadline pending'} description={lang === 'ja' ? 'すべての締め切りが処理されました。' : 'Mọi deadline hiện tại đều đã được xử lý.'} />
              ) : (
                <div className="space-y-3">
                  {deadlines.slice(0, 5).map((event) => (
                    <div key={getEventId(event)} className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950 dark:text-slate-50">{event.title}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDateShort(event.event_date)} • {formatTimeRange(event.start_time, event.end_time)}</p>
                          <p className="mt-1 text-sm font-medium text-rose-600 dark:text-rose-400">{getDeadlineCountdownLabel(event.deadline?.due_datetime)}</p>
                        </div>
                        <Badge tone={getPriorityTone(event.deadline?.priority)}>{getPriorityLabel(event.deadline?.priority)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardBody className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today Focus</p>
                <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? '今日の目標' : 'Mục tiêu hôm nay'}</h2>
              </div>
              {todayFocusEvents.length === 0 ? (
                <EmptyState title={lang === 'ja' ? '今日の目標なし' : 'Chưa có mục tiêu hôm nay'} description={lang === 'ja' ? 'スケジュールを追加してください。' : 'Hãy tạo lịch để hệ thống đề xuất ưu tiên.'} />
              ) : (
                <div className="space-y-3">
                  {todayFocusEvents.map(({ event, status }) => (
                    <div
                      key={getEventId(event)}
                      className={`rounded-2xl border p-4 transition ${
                        status === 'ongoing'
                          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30'
                          : status === 'passed'
                          ? 'border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 opacity-60'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${status === 'passed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-950 dark:text-slate-50'}`}>
                            {event.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatTimeRange(event.start_time, event.end_time)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Badge tone={event.type === 'deadline' ? 'warning' : event.type === 'hoc' ? 'brand' : 'purple'}>{getTypeLabel(event.type)}</Badge>
                          {status === 'ongoing' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {lang === 'ja' ? '進行中' : 'Đang diễn ra'}
                            </span>
                          )}
                          {status === 'passed' && (
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{lang === 'ja' ? '終了' : 'Đã qua'}</span>
                          )}
                          {status === 'upcoming' && (
                            <span className="text-[10px] font-semibold text-brand-500 dark:text-brand-400">{lang === 'ja' ? 'もうすぐ開始' : 'Sắp bắt đầu'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{lang === 'ja' ? '空き時間の提案' : 'Gợi ý thời gian rảnh'}</p>
                <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? '今日の空き時間' : 'Khoảng trống trong ngày'}</h2>
              </div>
              {getFreeTimeSuggestions(todayEvents).length === 0 ? (
                <EmptyState title={lang === 'ja' ? '十分な空き時間がありません' : 'Không có khoảng trống đủ lớn'} description={lang === 'ja' ? '今日のスケジュールはかなり詰まっています。' : 'Lịch hôm nay khá kín hoặc chỉ còn các khoảng rất ngắn.'} />
              ) : (
                <div className="space-y-3">
                  {getFreeTimeSuggestions(todayEvents).map((slot) => (
                    <div key={`${slot.start}-${slot.end}`} className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 px-4 py-3">
                      <p className="font-semibold text-slate-950 dark:text-slate-50">{slot.start} - {slot.end}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{slot.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
        {/* ✨ Feature: Weekly Summary */}
        <WeeklySummaryPanel events={events} />

        {/* ✨ Feature: Smart Deadline Alert (D-7, D-3, D-1) */}
        <SmartDeadlineAlertPanel deadlines={deadlines} />
      </div>

      {/* 🌐 Global inline create modal */}
      <EventFormModal
        open={formOpen}
        mode="create"
        initialValue={null}
        onClose={() => setFormOpen(false)}
        onSubmit={async (payload) => {
          await createEvent(payload);
          pushToast({ title: 'Tạo sự kiện thành công', description: payload.title, variant: 'success' });
          void loadData();
        }}
        allEvents={events}
      />
    </>
  );
}

export function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EventFilterMode>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { lang } = useLang();

  const loadEvents = async () => {
    try {
      setLoading(true);
      setEvents(await getAllEvents());
    } catch (err) {
      pushToast({ title: 'Tải danh sách thất bại', description: err instanceof Error ? err.message : 'Vui lòng thử lại', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const now = new Date();

    // Helper: get datetime for an event
    const getEventDateTime = (e: EventItem) => {
      const [h, m] = e.start_time.slice(0, 5).split(':').map(Number);
      const d = new Date(e.event_date);
      d.setHours(h, m, 0, 0);
      return d;
    };
    const getEventEndDateTime = (e: EventItem) => {
      const [h, m] = e.end_time.slice(0, 5).split(':').map(Number);
      const d = new Date(e.event_date);
      d.setHours(h, m, 0, 0);
      return d;
    };

    // Group weight: 0=ongoing, 1=upcoming, 2=passed/overdue, 3=completed
    const getGroupWeight = (e: EventItem): number => {
      if (e.is_completed) return 3;
      const start = getEventDateTime(e);
      const end = getEventEndDateTime(e);
      if (now >= start && now <= end) return 0; // đang diễn ra
      if (start > now) return 1;                // sắp tới
      return 2;                                 // đã qua / quá hạn
    };

    return events
      .filter((event) => {
        const matchesFilter = (() => {
          switch (filter) {
            case 'all': return true;
            case 'hoc':
            case 'deadline':
            case 'lam_them':
            case 'holiday':
              return event.type === filter;
            case 'today': return isEventToday(event);
            case 'week': return isEventInCurrentWeek(event);
            case 'month': return isEventInCurrentMonth(event);
            case 'completed': return isEventCompleted(event);
            case 'deadline_expired':
              return event.type === 'deadline' && event.deadline?.due_datetime
                ? new Date(event.deadline.due_datetime) < now
                : false;
            case 'deadline_today':
              return event.type === 'deadline' && event.deadline?.due_datetime
                ? (() => {
                    const d = new Date(event.deadline.due_datetime);
                    return d.toDateString() === now.toDateString();
                  })()
                : false;
            case 'deadline_upcoming':
              return event.type === 'deadline' && event.deadline?.due_datetime
                ? new Date(event.deadline.due_datetime) > now && new Date(event.deadline.due_datetime).toDateString() !== now.toDateString()
                : false;
            default: return true;
          }
        })();
        const matchesSearch = !keyword
          ? true
          : [event.title, event.description, event.tag_label, event.location]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(keyword));
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        const ga = getGroupWeight(a);
        const gb = getGroupWeight(b);
        if (ga !== gb) return ga - gb; // sort by group first
        // Within same group: ongoing & upcoming → asc by start; passed → desc by date (most recent first)
        const ta = getEventDateTime(a).getTime();
        const tb = getEventDateTime(b).getTime();
        return ga === 2 ? tb - ta : ta - tb;
      });
  }, [events, filter, search]);

  const handleSubmit = async (payload: EventPayload) => {
    if (editingEvent) {
      await updateEvent(getEventId(editingEvent), payload);
      pushToast({ title: 'Cập nhật thành công', description: editingEvent.title, variant: 'success' });
    } else {
      await createEvent(payload);
      pushToast({ title: 'Tạo sự kiện thành công', description: payload.title, variant: 'success' });
    }
    setEditingEvent(null);
    await loadEvents();
  };

  const handleDelete = async (event: EventItem) => {
    if (!window.confirm(`Xóa sự kiện "${event.title}"?`)) return;
    await deleteEvent(getEventId(event));
    pushToast({ title: 'Đã xoá sự kiện', description: event.title, variant: 'success' });
    await loadEvents();
  };

  const handleComplete = async (event: EventItem) => {
    await toggleEventCompletion(getEventId(event));
    pushToast({ title: 'Đã cập nhật trạng thái', description: event.title, variant: 'success' });
    await loadEvents();
  };

  const showEventsSkeleton = useDelayedLoading(loading);

  return (
    <>
      <div className="space-y-6">
        <EventToolbar
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          onCreate={() => setFormOpen(true)}
          onExportExcel={() => exportEventsToExcel(filteredEvents)}
        />
        {showEventsSkeleton ? <EventsSkeleton /> : <EventTable events={filteredEvents} onEdit={(event) => setEditingEvent(event)} onDelete={handleDelete} onComplete={handleComplete} onOpen={(event) => navigate(`/app/events/${getEventId(event)}`)} />}
      </div>

      <EventFormModal
        open={formOpen || Boolean(editingEvent)}
        mode={editingEvent ? 'edit' : 'create'}
        initialValue={editingEvent}
        onClose={() => {
          setFormOpen(false);
          setEditingEvent(null);
        }}
        onSubmit={handleSubmit}
      />
    </>
  );
}

export function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [weekCursor, setWeekCursor] = useState(new Date());
  const cachedCalendar = calendarCache.get(getCalendarCacheKey(cursor, weekCursor));
  const [monthEvents, setMonthEvents] = useState<EventItem[]>(() => cachedCalendar?.monthEvents ?? []);
  const [weekEvents, setWeekEvents] = useState<EventItem[]>(() => cachedCalendar?.weekEvents ?? []);
  const [loading, setLoading] = useState(!cachedCalendar);
  const [typeFilter, setTypeFilter] = useState<'all' | 'hoc' | 'deadline' | 'lam_them'>('all');
  const [dayEventsModalOpen, setDayEventsModalOpen] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<EventItem[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  // Inline CRUD state
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { lang } = useLang();

  useEffect(() => {
    (async () => {
      try {
        setLoading(!calendarCache.get(getCalendarCacheKey(cursor, weekCursor)));
        const year = cursor.getFullYear();
        const month = cursor.getMonth() + 1;
        const weekStart = format(buildWeekStart(weekCursor), 'yyyy-MM-dd');
        const weekEnd = format(buildWeekEnd(weekCursor), 'yyyy-MM-dd');
        const [monthData, weekData] = await Promise.all([getMonthEvents({ year, month }), getWeekEvents(weekStart, weekEnd)]);
        calendarCache.set(getCalendarCacheKey(cursor, weekCursor), { monthEvents: monthData, weekEvents: weekData });
        setMonthEvents(monthData);
        setWeekEvents(weekData);
      } catch (err) {
        pushToast({ title: 'Không thể tải lịch', description: err instanceof Error ? err.message : 'Vui lòng thử lại', variant: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [cursor, pushToast, weekCursor]);

  const filteredMonthEvents = useMemo(() => {
    if (typeFilter === 'all') return monthEvents;
    return monthEvents.filter((e) => e.type === typeFilter);
  }, [monthEvents, typeFilter]);

  const filteredWeekEvents = useMemo(() => {
    if (typeFilter === 'all') return weekEvents;
    return weekEvents.filter((e) => e.type === typeFilter);
  }, [weekEvents, typeFilter]);

  const handleEventClick = useCallback((event: EventItem) => {
    const dayDate = new Date(event.event_date);
    setSelectedDay(dayDate);
    const dayEvents = (typeFilter === 'all' ? monthEvents : monthEvents.filter((e) => e.type === typeFilter))
      .filter((e) => e.event_date === event.event_date);
    setSelectedDayEvents(dayEvents);
    setDayEventsModalOpen(true);
  }, [typeFilter, monthEvents]);

  const reloadCalendar = async () => {
    const cacheKey = getCalendarCacheKey(cursor, weekCursor);
    const cached = calendarCache.get(cacheKey);
    try {
      setLoading(!cached);
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      const weekStart = format(buildWeekStart(weekCursor), 'yyyy-MM-dd');
      const weekEnd = format(buildWeekEnd(weekCursor), 'yyyy-MM-dd');
      const [monthData, weekData] = await Promise.all([getMonthEvents({ year, month }), getWeekEvents(weekStart, weekEnd)]);
      calendarCache.set(cacheKey, { monthEvents: monthData, weekEvents: weekData });
      setMonthEvents(monthData);
      setWeekEvents(weekData);
    } catch (err) {
      pushToast({ title: 'Không thể tải lịch', description: err instanceof Error ? err.message : 'Vui lòng thử lại', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reloadCalendar();
  }, [cursor, weekCursor]);

  // Inline create/edit handler for Calendar page
  const handleCalendarSubmit = async (payload: EventPayload) => {
    if (editingEvent) {
      await updateEvent(getEventId(editingEvent), payload);
      pushToast({ title: 'Cập nhật thành công', description: payload.title, variant: 'success' });
    } else {
      await createEvent(payload);
      pushToast({ title: 'Tạo sự kiện thành công', description: payload.title, variant: 'success' });
    }
    setEditingEvent(null);
    await reloadCalendar();
  };

  const handleCalendarDelete = async (event: EventItem) => {
    if (!window.confirm(`Xóa sự kiện "${event.title}"?`)) return;
    await deleteEvent(getEventId(event));
    pushToast({ title: 'Đã xoá sự kiện', description: event.title, variant: 'success' });
    setDayEventsModalOpen(false);
    await reloadCalendar();
  };

  const handleCalendarComplete = async (event: EventItem) => {
    await toggleEventCompletion(getEventId(event));
    pushToast({ title: 'Đã cập nhật trạng thái', description: event.title, variant: 'success' });
    await reloadCalendar();
  };

  return (
    <>
      <div className="space-y-6">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant={typeFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setTypeFilter('all')} className="flex items-center gap-2">
            {lang === 'ja' ? 'すべて' : 'Tất cả'} ({monthEvents.length})
          </Button>
          <Button variant={typeFilter === 'hoc' ? 'primary' : 'secondary'} onClick={() => setTypeFilter('hoc')} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-brand-500" />
            {lang === 'ja' ? '学習' : 'Lịch học'} ({monthEvents.filter((e) => e.type === 'hoc').length})
          </Button>
          <Button variant={typeFilter === 'deadline' ? 'primary' : 'secondary'} onClick={() => setTypeFilter('deadline')} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            Deadline ({monthEvents.filter((e) => e.type === 'deadline').length})
          </Button>
          <Button variant={typeFilter === 'lam_them' ? 'primary' : 'secondary'} onClick={() => setTypeFilter('lam_them')} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-violet-500" />
            {lang === 'ja' ? 'アルバイト' : 'Làm thêm'} ({monthEvents.filter((e) => e.type === 'lam_them').length})
          </Button>
        </div>

        {/* Calendar Section */}
        <div className="space-y-6">
          {/* Month Calendar - Full Width */}
          <MonthCalendar
            cursor={cursor}
            setCursor={setCursor}
            events={filteredMonthEvents}
            onSelectDay={(day) => setWeekCursor(day)}
            onEventClick={handleEventClick}
          />

          {/* Week Agenda - Full Width */}
          <WeekAgenda
            weekCursor={weekCursor}
            setWeekCursor={setWeekCursor}
            events={filteredWeekEvents}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            onEventClick={handleEventClick}
          />

          {/* Selected Day Info Card */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="md:col-span-2 lg:col-span-1">
              <CardBody className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{lang === 'ja' ? '選択した日付' : 'Ngày được chọn'}</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">{format(weekCursor, 'EEEE')}</h3>
                  <h4 className="text-3xl font-bold text-brand-600 dark:text-brand-400">{format(weekCursor, 'dd/MM/yyyy')}</h4>
                </div>
                <Button variant="secondary" onClick={() => navigate('/app/events')} className="w-full">
                  {lang === 'ja' ? 'リストを見る' : 'Xem danh sách'}
                </Button>
              </CardBody>
            </Card>

            {/* Quick Stats */}
            <Card className="md:col-span-2 lg:col-span-2">
              <CardBody className="space-y-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{lang === 'ja' ? '日別統計' : 'Thống kê ngày'}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-brand-50 dark:bg-brand-900/20 p-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400">{lang === 'ja' ? '合計' : 'Tổng'}</p>
                    <p className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">{filteredWeekEvents.filter(e => e.event_date === format(weekCursor, 'yyyy-MM-dd')).length}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400">Deadline</p>
                    <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{filteredWeekEvents.filter(e => e.type === 'deadline' && e.event_date === format(weekCursor, 'yyyy-MM-dd')).length}</p>
                  </div>
                  <div className="rounded-2xl bg-violet-50 dark:bg-violet-900/20 p-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400">{lang === 'ja' ? 'アルバイト' : 'Làm thêm'}</p>
                    <p className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">{filteredWeekEvents.filter(e => e.type === 'lam_them' && e.event_date === format(weekCursor, 'yyyy-MM-dd')).length}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        <DayEventsModal
          open={dayEventsModalOpen}
          date={selectedDay}
          events={selectedDayEvents}
          onClose={() => setDayEventsModalOpen(false)}
          onEventClick={(event) => {
            setEditingEvent(event);
            setDayEventsModalOpen(false);
            setTimeout(() => setFormOpen(true), 150);
          }}
        />

        {/* Inline Event Form Modal */}
        <EventFormModal
          open={formOpen || Boolean(editingEvent)}
          mode={editingEvent ? 'edit' : 'create'}
          initialValue={editingEvent}
          onClose={() => { setFormOpen(false); setEditingEvent(null); }}
          onSubmit={handleCalendarSubmit}
          allEvents={[...monthEvents, ...weekEvents]}
        />
      </div>
    </>
  );
}

export function EventDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { lang } = useLang();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    if (!params.id) return;
    try {
      setLoading(true);
      setEvent(await getEventById(params.id));
    } catch (err) {
      pushToast({ title: 'Không tìm thấy sự kiện', description: err instanceof Error ? err.message : 'Vui lòng thử lại', variant: 'error' });
      navigate('/app/events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);


  const handleSave = async (payload: EventPayload) => {
    if (!event) return;
    const updated = await updateEvent(getEventId(event), payload);
    setEvent(updated);
    setEditing(false);
    pushToast({ title: lang === 'ja' ? '更新しました' : 'Cập nhật thành công', description: updated.title, variant: 'success' });
  };

  const handleComplete = async () => {
    if (!event) return;
    const updated = await toggleEventCompletion(getEventId(event));
    setEvent(updated);
    pushToast({ title: lang === 'ja' ? 'ステータス更新' : 'Đã cập nhật trạng thái', description: updated.title, variant: 'success' });
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!window.confirm(lang === 'ja' ? `「${event.title}」を削除しますか？` : `Xóa sự kiện "${event.title}"?`)) return;
    await deleteEvent(getEventId(event));
    pushToast({ title: lang === 'ja' ? '削除しました' : 'Đã xoá sự kiện', description: event.title, variant: 'success' });
    navigate('/app/events');
  };

  return (
    <>
      {loading || !event ? <DetailSkeleton /> : (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardBody className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge tone={event.type === 'deadline' ? 'warning' : event.type === 'hoc' ? 'brand' : 'purple'}>{getTypeLabel(event.type)}</Badge>
                  <h1 className="mt-3 text-3xl font-semibold text-slate-950 dark:text-slate-50">{event.title}</h1>
                  <p className="mt-3 text-slate-600 dark:text-slate-300">{event.description || (lang === 'ja' ? '説明なし' : 'Không có mô tả')}</p>
                </div>
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  {lang === 'ja' ? '編集' : 'Chỉnh sửa'}
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoBox label={lang === 'ja' ? '日付' : 'Ngày'} value={format(new Date(event.event_date), 'dd/MM/yyyy')} />
                <InfoBox label={lang === 'ja' ? '時間' : 'Giờ'} value={formatTimeRange(event.start_time, event.end_time)} />
                <InfoBox label={lang === 'ja' ? '場所' : 'Địa điểm'} value={event.location || '—'} />
                <InfoBox label={lang === 'ja' ? 'タグ' : 'Tag'} value={event.tag_label || '—'} />
                <InfoBox label={lang === 'ja' ? '繰り返し' : 'Lặp lại'} value={getRecurrenceLabel(event.recurrence_frequency, event.recurrence_interval || 1)} />
              </div>

              {event.is_completed ? (
                <div className="rounded-3xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{lang === 'ja' ? '完了済み' : 'Đã hoàn thành'}</p>
                  {event.completed_at && (
                    <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">
                      {format(new Date(event.completed_at), 'HH:mm - dd/MM/yyyy')}
                    </p>
                  )}
                </div>
              ) : null}

              {event.deadline ? (
                <Card className="border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50">
                  <CardBody>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Deadline info</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-lg font-semibold text-slate-950 dark:text-slate-50">Priority:</span>
                          <Badge tone={getPriorityTone(event.deadline.priority)}>{getPriorityLabel(event.deadline.priority)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{lang === 'ja' ? 'ステータス' : 'Trạng thái'}: {event.is_completed ? (lang === 'ja' ? '完了' : 'Hoàn thành') : (lang === 'ja' ? '待機中' : 'Đang chờ')}</p>
                      </div>
                      <div className="flex gap-2">
                        {!event.is_completed ? (
                          <Button onClick={handleComplete}>
                            <CheckCircle2 className="h-4 w-4" />
                            {lang === 'ja' ? '完了にする' : 'Hoàn thành'}
                          </Button>
                        ) : null}
                        <Button variant="secondary" onClick={() => navigate('/app/calendar')}>
                          <Calendar className="h-4 w-4" />
                          {lang === 'ja' ? 'カレンダー' : 'Lịch'}
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button variant="danger" onClick={handleDelete}>{lang === 'ja' ? '削除' : 'Xoá'}</Button>
                <Button variant="secondary" onClick={() => navigate('/app/events')}>{lang === 'ja' ? '戻る' : 'Quay lại'}</Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Preview</p>
              <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-2xl">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{format(new Date(event.event_date), 'EEE, dd MMM')}</p>
                <h2 className="mt-3 text-2xl font-semibold">{event.title}</h2>
                <p className="mt-3 text-sm text-slate-300">{event.description || (lang === 'ja' ? '説明なし' : 'Không có mô tả')}</p>
                <div className="mt-5 space-y-2 text-sm text-slate-300">
                  <p>{formatTimeRange(event.start_time, event.end_time)}</p>
                  <p>{event.location || '—'}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      <EventFormModal
        open={editing && Boolean(event)}
        mode="edit"
        initialValue={event}
        onClose={() => setEditing(false)}
        onSubmit={handleSave}
      />

      {/* Global create modal */}
      <EventFormModal
        open={formOpen}
        mode="create"
        initialValue={null}
        onClose={() => setFormOpen(false)}
        onSubmit={async (payload) => {
          await createEvent(payload);
          pushToast({ title: lang === 'ja' ? 'イベントを作成しました' : 'Tạo sự kiện thành công', description: payload.title, variant: 'success' });
          setFormOpen(false);
        }}
      />
    </>
  );
}

export function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const { pushToast } = useToast();
  const { lang } = useLang();
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setProfileForm({
      full_name: user?.full_name || '',
      email: user?.email || '',
    });
  }, [user]);

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSavingProfile(true);
      await updateProfile({ full_name: profileForm.full_name.trim(), email: profileForm.email.trim() });
      pushToast({ title: 'Đã cập nhật hồ sơ', description: 'Thông tin cá nhân đã được lưu.', variant: 'success' });
    } catch (error) {
      pushToast({ title: 'Cập nhật thất bại', description: error instanceof Error ? error.message : 'Vui lòng thử lại', variant: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      pushToast({ title: 'Mật khẩu không khớp', description: 'Vui lòng kiểm tra lại mật khẩu mới.', variant: 'error' });
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword({ current_password: passwordForm.current_password, new_password: passwordForm.new_password });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      pushToast({ title: 'Đã đổi mật khẩu', description: 'Mật khẩu mới đã được lưu.', variant: 'success' });
    } catch (error) {
      pushToast({ title: 'Đổi mật khẩu thất bại', description: error instanceof Error ? error.message : 'Vui lòng thử lại', variant: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <PageShell
        title={lang === 'ja' ? 'プロフィール' : 'Hồ sơ cá nhân'}
        description={lang === 'ja' ? 'アカウント情報の更新とパスワード変更はこちらで行えます。' : 'Cập nhật thông tin tài khoản và thay đổi mật khẩu tại đây.'}
      >
        <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <Card>
            <CardBody className="space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{lang === 'ja' ? '個人情報' : 'Thông tin cá nhân'}</p>
                <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? 'プロフィール編集' : 'Chỉnh sửa hồ sơ'}</h2>
              </div>

              <form className="space-y-4" onSubmit={handleProfileSubmit}>
                <Field label={lang === 'ja' ? '氏名' : 'Họ và tên'}>
                  <Input value={profileForm.full_name} onChange={(e) => setProfileForm((current) => ({ ...current, full_name: e.target.value }))} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm((current) => ({ ...current, email: e.target.value }))} />
                </Field>

                <Button type="submit" isLoading={savingProfile}>{lang === 'ja' ? '変更を保存' : 'Lưu thay đổi'}</Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{lang === 'ja' ? 'セキュリティ' : 'Bảo mật'}</p>
                <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? 'パスワード変更' : 'Đổi mật khẩu'}</h2>
              </div>

              <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                <Field label={lang === 'ja' ? '現在のパスワード' : 'Mật khẩu hiện tại'}>
                  <Input type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm((current) => ({ ...current, current_password: e.target.value }))} />
                </Field>
                <Field label={lang === 'ja' ? '新しいパスワード' : 'Mật khẩu mới'}>
                  <Input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm((current) => ({ ...current, new_password: e.target.value }))} />
                </Field>
                <Field label={lang === 'ja' ? '新しいパスワード（確認）' : 'Nhập lại mật khẩu mới'}>
                  <Input type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm((current) => ({ ...current, confirm_password: e.target.value }))} />
                </Field>

                <Button type="submit" variant="secondary" isLoading={savingPassword}>{lang === 'ja' ? 'パスワード変更' : 'Đổi mật khẩu'}</Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardBody>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{lang === 'ja' ? '使用中のアカウント' : 'Tài khoản đang dùng'}</p>
                <h3 className="text-xl font-semibold text-slate-950 dark:text-slate-50">{user?.full_name || '—'}</h3>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-700 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                {user?.email || '—'}
              </div>
            </div>
          </CardBody>
        </Card>
      </PageShell>

      {/* Global create modal */}
      <EventFormModal
        open={profileFormOpen}
        mode="create"
        initialValue={null}
        onClose={() => setProfileFormOpen(false)}
        onSubmit={async (payload) => {
          await createEvent(payload);
          pushToast({ title: 'Tạo sự kiện thành công', description: payload.title, variant: 'success' });
          setProfileFormOpen(false);
        }}
      />
    </>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="max-w-xl text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">404</p>
        <h1 className="mt-4 text-4xl font-semibold">Không tìm thấy trang</h1>
        <p className="mt-3 text-slate-300">Đường dẫn này không tồn tại hoặc đã bị chuyển hướng.</p>
        <a href="/app" className="mt-8 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">Về dashboard</a>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Skeleton className="h-[520px] rounded-3xl" />
        <Skeleton className="h-[520px] rounded-3xl" />
      </div>
    </div>
  );
}

function EventsSkeleton() {
  return <Skeleton className="h-[560px] rounded-3xl" />;
}

function CalendarSkeleton() {
  return <Skeleton className="h-[720px] rounded-3xl" />;
}

function DetailSkeleton() {
  return <Skeleton className="h-[700px] rounded-3xl" />;
}

function ErrorPanel({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="max-w-xl">
        <CardBody className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{description}</p>
          <Button className="mt-6" onClick={onRetry}>Tải lại</Button>
        </CardBody>
      </Card>
    </div>
  );
}

function buildWeekStart(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  return copy;
}

function buildWeekEnd(date: Date) {
  const start = buildWeekStart(new Date(date));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

// ─── ✨ Feature #15a: AI Weekly Summary ──────────────────────────────────────
function WeeklySummaryPanel({ events }: { events: EventItem[] }) {
  const { lang } = useLang();
  const summary = useMemo(() => {
    const now = new Date();
    const weekStart = buildWeekStart(now);
    const weekEnd = buildWeekEnd(now);
    const weekEvents = events.filter((e) => {
      const d = new Date(e.event_date);
      return d >= weekStart && d <= weekEnd;
    });

    let studyMins = 0, workMins = 0, deadlineCount = 0, completedCount = 0;
    weekEvents.forEach((e) => {
      const [sh, sm] = e.start_time.slice(0, 5).split(':').map(Number);
      const [eh, em] = e.end_time.slice(0, 5).split(':').map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      if (e.type === 'hoc') studyMins += mins;
      if (e.type === 'lam_them') workMins += mins;
      if (e.type === 'deadline') deadlineCount++;
      if (e.is_completed) completedCount++;
    });

    const toH = (m: number) => `${Math.floor(m / 60)}h${m % 60 > 0 ? `${m % 60}m` : ''}`;
    const completionRate = weekEvents.length > 0 ? Math.round((completedCount / weekEvents.length) * 100) : 0;

    return { studyMins, workMins, deadlineCount, completedCount, total: weekEvents.length, completionRate, toH };
  }, [events]);

  const insight = lang === 'ja'
    ? summary.completionRate >= 80
      ? '🔥 素晴らしい週です！完了率がとても高いです。'
      : summary.completionRate >= 50
      ? '👍 安定した週です。このペースを維持しましょう！'
      : summary.total === 0
      ? '📋 今週のスケジュールがまだありません。計画を立てましょう！'
      : '⚠️ 完了率が低めです。優先度を見直しましょう。'
    : summary.completionRate >= 80
      ? '🔥 Tuần xuất sắc! Tỷ lệ hoàn thành rất cao.'
      : summary.completionRate >= 50
      ? '👍 Tuần ổn định. Hãy duy trì phong độ!'
      : summary.total === 0
      ? '📋 Chưa có lịch tuần này. Hãy lên kế hoạch!'
      : '⚠️ Tỷ lệ hoàn thành thấp. Xem lại mức độ ưu tiên.';

  const statItems = [
    { label: lang === 'ja' ? '学習時間' : 'Giờ học', value: summary.studyMins > 0 ? summary.toH(summary.studyMins) : '0h', color: 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400' },
    { label: lang === 'ja' ? 'アルバイト時間' : 'Giờ làm thêm', value: summary.workMins > 0 ? summary.toH(summary.workMins) : '0h', color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400' },
    { label: 'Deadline', value: `${summary.deadlineCount} ${lang === 'ja' ? '件' : 'việc'}`, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
    { label: lang === 'ja' ? '完了' : 'Hoàn thành', value: `${summary.completionRate}%`, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
  ];

  return (
    <Card className="overflow-hidden border-brand-100 dark:border-brand-900/30">
      <CardBody>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">✨ {lang === 'ja' ? '新機能' : 'Feature mới'}</p>
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? '今週のまとめ' : 'Tổng kết tuần này'}</h2>
          </div>
          <span className="rounded-2xl bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 text-sm font-semibold text-brand-700 dark:text-brand-400">AI Weekly Summary</span>
        </div>

        <div className="mb-4 rounded-2xl border border-brand-100 dark:border-brand-800/30 bg-brand-50/50 dark:bg-brand-950/20 px-4 py-3">
          <p className="text-sm font-medium text-brand-800 dark:text-brand-300">{insight}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statItems.map((item) => (
            <div key={item.label} className={`rounded-2xl ${item.color} p-4`}>
              <p className="text-xs font-medium opacity-80">{item.label}</p>
              <p className="mt-1 text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span>
              {lang === 'ja'
                ? `完了率 (${summary.completedCount}/${summary.total} 件)`
                : `Tỷ lệ hoàn thành (${summary.completedCount}/${summary.total} sự kiện)`}
            </span>
            <span className="font-semibold">{summary.completionRate}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-700 ${summary.completionRate >= 80 ? 'bg-emerald-500' : summary.completionRate >= 50 ? 'bg-brand-500' : 'bg-amber-500'}`}
              style={{ width: `${summary.completionRate}%` }}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// ─── ✨ Feature #15b: Smart Deadline Alert (D-7, D-3, D-1) ───────────────────
function SmartDeadlineAlertPanel({ deadlines }: { deadlines: EventItem[] }) {
  const { lang } = useLang();
  const alerts = useMemo(() => {
    const now = new Date();
    return deadlines
      .filter((e) => e.deadline?.due_datetime && !e.deadline?.is_completed)
      .map((e) => {
        const due = new Date(e.deadline!.due_datetime);
        const diffMs = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        let urgency: 'critical' | 'high' | 'medium' | 'low' = 'low';
        if (diffDays <= 0) urgency = 'critical';
        else if (diffDays <= 1) urgency = 'critical';
        else if (diffDays <= 3) urgency = 'high';
        else if (diffDays <= 7) urgency = 'medium';
        return { event: e, diffDays, urgency };
      })
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 6);
  }, [deadlines]);

  const getBadge = (diffDays: number) => {
    if (diffDays <= 0) return lang === 'ja' ? '🔴 期限切れ！' : '🔴 Quá hạn!';
    if (diffDays === 1) return '🔴 D-1';
    if (diffDays <= 3) return `🟠 D-${diffDays}`;
    if (diffDays <= 7) return `🟡 D-${diffDays}`;
    return `🟢 D-${diffDays}`;
  };

  const urgencyStyle: Record<string, string> = {
    critical: 'border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/20',
    high: 'border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-950/20',
    medium: 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20',
    low: 'border-emerald-100 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/10',
  };

  return (
    <Card>
      <CardBody>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">✨ {lang === 'ja' ? '新機能' : 'Feature mới'}</p>
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">Smart Deadline Alert</h2>
          </div>
          <span className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 text-sm font-semibold text-rose-700 dark:text-rose-400">
            {lang === 'ja' ? 'D-7 → D-1 → 期限切れ' : 'D-7 → D-1 → Quá hạn'}
          </span>
        </div>

        {alerts.length === 0 ? (
          <EmptyState
            title={lang === 'ja' ? '警告が必要な締め切りはありません' : 'Không có deadline nào cần cảnh báo'}
            description={lang === 'ja' ? 'すべての締め切りはまだ余裕があるか、完了済みです。' : 'Tất cả deadline đều còn nhiều thời gian hoặc đã hoàn thành.'}
          />
        ) : (
          <div className="space-y-3">
            {alerts.map(({ event, diffDays, urgency }) => (
              <div key={getEventId(event)} className={`rounded-2xl border p-4 ${urgencyStyle[urgency]}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-950 dark:text-slate-50 truncate">{event.title}</p>
                      <span className="text-sm font-bold">{getBadge(diffDays)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {event.deadline?.due_datetime
                        ? format(new Date(event.deadline.due_datetime), 'HH:mm – dd/MM/yyyy')
                        : (lang === 'ja' ? '不明' : 'Không xác định')}
                    </p>
                    {diffDays <= 3 && diffDays > 0 && (
                      <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                        {lang === 'ja'
                          ? `⚡ あと${diffDays}日！今すぐ優先的に取り組みましょう。`
                          : `⚡ Còn ${diffDays} ngày! Hãy ưu tiên hoàn thành ngay.`}
                      </p>
                    )}
                    {diffDays <= 0 && (
                      <p className="mt-1 text-xs font-bold text-rose-700 dark:text-rose-400">
                        {lang === 'ja'
                          ? '❗ 期限を過ぎています！必要であれば担当者に連絡してください。'
                          : '❗ Đã quá hạn! Liên hệ giảng viên ngay nếu cần.'}
                      </p>
                    )}
                  </div>
                  <Badge tone={getPriorityTone(event.deadline?.priority)}>{getPriorityLabel(event.deadline?.priority)}</Badge>
                </div>

                {/* Countdown progress bar */}
                {diffDays > 0 && diffDays <= 7 && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/50 dark:bg-slate-700/50">
                      <div
                        className={`h-full rounded-full ${diffDays === 1 ? 'bg-rose-500' : diffDays <= 3 ? 'bg-orange-500' : 'bg-amber-400'}`}
                        style={{ width: `${((7 - diffDays) / 7) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-slate-500 dark:text-slate-400">
                      {lang === 'ja' ? `${diffDays}/7日残り` : `${diffDays}/7 ngày còn lại`}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
