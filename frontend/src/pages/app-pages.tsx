import { useEffect, useMemo, useState, useCallback, memo, useRef, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, isToday as dateFnsIsToday, isPast, isFuture, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
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


// â”€â”€â”€ Real-time event status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

let eventsPageCache: EventItem[] | null = null;

const calendarCache = new Map<string, { monthEvents: EventItem[]; weekEvents: EventItem[] }>();

function getCalendarCacheKey(cursor: Date, weekCursor: Date) {
  const weekStart = format(buildWeekStart(weekCursor), 'yyyy-MM-dd');
  const weekEnd = format(buildWeekEnd(weekCursor), 'yyyy-MM-dd');
  return `${cursor.getFullYear()}-${cursor.getMonth() + 1}-${weekStart}-${weekEnd}`;
}

function primeCurrentCalendarCache(events: EventItem[]) {
  const today = new Date();
  const key = getCalendarCacheKey(today, today);
  if (calendarCache.has(key)) return;

  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const weekStart = format(buildWeekStart(today), 'yyyy-MM-dd');
  const weekEnd = format(buildWeekEnd(today), 'yyyy-MM-dd');

  calendarCache.set(key, {
    monthEvents: events.filter((event) => event.event_date.startsWith(monthPrefix)),
    weekEvents: events.filter((event) => event.event_date >= weekStart && event.event_date <= weekEnd),
  });
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
      eventsPageCache = all;
      primeCurrentCalendarCache(all);
      setEvents(all);
      setTodayEvents(today);
      setDeadlines(upcoming);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'KhÃ´ng thá»ƒ táº£i dashboard');
      pushToast({ title: 'KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u', description: err instanceof Error ? err.message : 'Vui lÃ²ng thá»­ láº¡i', variant: 'error' });
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
      { label: L ? 'åˆè¨ˆã‚¤ãƒ™ãƒ³ãƒˆ' : 'Tá»•ng sá»± kiá»‡n', value: events.length, icon: Calendar, tone: 'brand' as const },
      { label: L ? 'ä»Šæ—¥' : 'HÃ´m nay', value: todayEvents.length, icon: Clock3, tone: 'success' as const },
      { label: L ? 'ç· ã‚åˆ‡ã‚Š' : 'Deadline', value: deadlineCount, icon: AlertCircle, tone: 'warning' as const },
      { label: L ? 'å®Œäº†' : 'HoÃ n thÃ nh', value: completedCount, icon: CheckCircle2, tone: 'purple' as const },
      { label: L ? 'å­¦ç¿’æ™‚é–“' : 'Giá» há»c', value: `${timeStats.studyHours}h`, icon: Calendar, tone: 'brand' as const },
    ];
  }, [events, todayEvents.length, lang]);

  const todayFocusEvents = useMemo(() => {
    return todayEvents.slice(0, 4).map(event => ({
      event,
      status: getRealtimeStatus(event),
    }));
  }, [todayEvents]);

  if (error) {
    return <ErrorPanel title="KhÃ´ng thá»ƒ táº£i dashboard" description={error} onRetry={() => window.location.reload()} />;
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
                  {lang === 'ja' ? 'æœ¬æ—¥ã®æ¦‚è¦' : 'Tá»•ng quan hÃ´m nay'}
                </Badge>
                <div>
                  <p className="text-sm text-slate-300">
                    {lang === 'ja' ? 'ã“ã‚“ã«ã¡ã¯ã€' : 'Xin chÃ o, '}
                    {user?.full_name || (lang === 'ja' ? 'ãƒ¦ãƒ¼ã‚¶ãƒ¼' : 'báº¡n')}ï¼
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                    {lang === 'ja'
                      ? 'ã‚ãªãŸã®ã‚¹ã‚±ã‚¸ãƒ¥ãƒ¼ãƒ«ã¯æ˜Žç¢ºã§ã™ã€‚'
                      : 'Lá»‹ch trÃ¬nh cá»§a báº¡n Ä‘ang ráº¥t rÃµ rÃ ng.'}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
                    {lang === 'ja'
                      ? 'ãƒ‡ãƒƒãƒ‰ãƒ©ã‚¤ãƒ³ã€ç©ºãæ™‚é–“ã€ç¹°ã‚Šè¿”ã—ã‚¤ãƒ™ãƒ³ãƒˆã‚’ã‚¹ãƒžãƒ¼ãƒˆã«ç®¡ç†ã—ã¾ã—ã‚‡ã†ã€‚'
                      : 'Theo dÃµi deadline, thá»i gian ráº£nh, sá»± kiá»‡n láº·p láº¡i vÃ  cÃ¡c Ä‘iá»ƒm nháº¥n trong ngÃ y báº±ng giao diá»‡n gá»n, sÃ¡ng, dá»… demo.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                    <p className="text-slate-300">{lang === 'ja' ? 'ä»Šæ—¥' : 'HÃ´m nay'}</p>
                    <p className="mt-1 text-lg font-semibold">
                      {todayEvents.length} {lang === 'ja' ? 'ä»¶' : 'sá»± kiá»‡n'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                    <p className="text-slate-300">{lang === 'ja' ? 'æ€¥ãŽã®ç· ã‚åˆ‡ã‚Š' : 'Deadline gáº¥p'}</p>
                    <p className="mt-1 text-lg font-semibold">
                      {todayEvents.filter((event) => event.type === 'deadline' && !event.deadline?.is_completed).length}
                      {' '}{lang === 'ja' ? 'ä»¶' : 'viá»‡c'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                    <p className="text-slate-300">{lang === 'ja' ? 'æ¬¡ã®ç›®æ¨™' : 'Má»¥c tiÃªu tiáº¿p theo'}</p>
                    <p className="mt-1 text-lg font-semibold">
                      {deadlines[0] ? getDeadlineCountdownLabel(deadlines[0].deadline?.due_datetime, new Date(), lang) : (lang === 'ja' ? 'ãªã—' : 'KhÃ´ng cÃ³')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                <p className="text-sm text-slate-300">{lang === 'ja' ? 'ä½œæ¥­ã‚»ãƒƒã‚·ãƒ§ãƒ³' : 'PhiÃªn lÃ m viá»‡c'}</p>
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
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{lang === 'ja' ? 'ä»Šæ—¥' : 'HÃ´m nay'}</p>
                  <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? 'æ³¨ç›®ã®ã‚¹ã‚±ã‚¸ãƒ¥ãƒ¼ãƒ«' : 'Lá»‹ch trÃ¬nh ná»•i báº­t'}</h2>
                </div>
                <Button variant="secondary" onClick={() => navigate('/app/calendar')}>
                  {lang === 'ja' ? 'ã‚«ãƒ¬ãƒ³ãƒ€ãƒ¼' : 'Xem lá»‹ch'}
                </Button>
              </div>

              {todayEvents.length === 0 ? (
                <EmptyState title={lang === 'ja' ? 'ä»Šæ—¥ã®ã‚¤ãƒ™ãƒ³ãƒˆã¯ã‚ã‚Šã¾ã›ã‚“' : 'KhÃ´ng cÃ³ sá»± kiá»‡n trong hÃ´m nay'} description={lang === 'ja' ? 'ä»Šæ—¥ã¯ä½™è£•ãŒã‚ã‚Šã¾ã™ã€‚å¿…è¦ã§ã‚ã‚Œã°ã‚¤ãƒ™ãƒ³ãƒˆã‚’è¿½åŠ ã—ã¾ã—ã‚‡ã†ã€‚' : 'HÃ´m nay khÃ¡ thoÃ¡ng, hÃ£y táº¡o thÃªm sá»± kiá»‡n náº¿u cáº§n.'} />
              ) : (
                <div className="space-y-3">
                  {todayEvents.map((event) => (
                    <div key={getEventId(event)} className="flex flex-col gap-4 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-950 dark:text-slate-50">{event.title}</h3>
                          <Badge tone={event.type === 'deadline' ? 'warning' : event.type === 'hoc' ? 'brand' : 'purple'}>{getTypeLabel(event.type, lang)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{event.description || (lang === 'ja' ? 'èª¬æ˜Žãªã—' : 'KhÃ´ng cÃ³ mÃ´ táº£')}</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{formatTimeRange(event.start_time, event.end_time)} â€¢ {event.location || 'â€”'}</p>
                      </div>
                      <Button variant="secondary" onClick={() => navigate(`/app/events/${getEventId(event)}`)}>
                        {lang === 'ja' ? 'è©³ç´°' : 'Chi tiáº¿t'}
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
                  <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? 'è¿‘æ—¥ç· ã‚åˆ‡ã‚Š' : 'Sáº¯p Ä‘áº¿n háº¡n'}</h2>
                </div>
                <Sparkles className="h-5 w-5 text-brand-500" />
              </div>

              {deadlines.length === 0 ? (
                <EmptyState title={lang === 'ja' ? 'æœªå‡¦ç†ã®ç· ã‚åˆ‡ã‚Šãªã—' : 'KhÃ´ng cÃ³ deadline pending'} description={lang === 'ja' ? 'ã™ã¹ã¦ã®ç· ã‚åˆ‡ã‚ŠãŒå‡¦ç†ã•ã‚Œã¾ã—ãŸã€‚' : 'Má»i deadline hiá»‡n táº¡i Ä‘á»u Ä‘Ã£ Ä‘Æ°á»£c xá»­ lÃ½.'} />
              ) : (
                <div className="space-y-3">
                  {deadlines.slice(0, 5).map((event) => (
                    <div key={getEventId(event)} className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950 dark:text-slate-50">{event.title}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDateShort(event.event_date, lang)} â€¢ {formatTimeRange(event.start_time, event.end_time)}</p>
                          <p className="mt-1 text-sm font-medium text-rose-600 dark:text-rose-400">{getDeadlineCountdownLabel(event.deadline?.due_datetime, new Date(), lang)}</p>
                        </div>
                        <Badge tone={getPriorityTone(event.deadline?.priority)}>{getPriorityLabel(event.deadline?.priority, lang)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="min-w-0">
            <CardBody className="min-w-0 space-y-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today Focus</p>
                <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? 'ä»Šæ—¥ã®ç›®æ¨™' : 'Má»¥c tiÃªu hÃ´m nay'}</h2>
              </div>
              {todayFocusEvents.length === 0 ? (
                <EmptyState title={lang === 'ja' ? 'ä»Šæ—¥ã®ç›®æ¨™ãªã—' : 'ChÆ°a cÃ³ má»¥c tiÃªu hÃ´m nay'} description={lang === 'ja' ? 'ã‚¹ã‚±ã‚¸ãƒ¥ãƒ¼ãƒ«ã‚’è¿½åŠ ã—ã¦ãã ã•ã„ã€‚' : 'HÃ£y táº¡o lá»‹ch Ä‘á»ƒ há»‡ thá»‘ng Ä‘á» xuáº¥t Æ°u tiÃªn.'} />
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
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${status === 'passed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-950 dark:text-slate-50'}`}>
                            {event.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatTimeRange(event.start_time, event.end_time)}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:flex-col sm:items-end">
                          <Badge tone={event.type === 'deadline' ? 'warning' : event.type === 'hoc' ? 'brand' : 'purple'}>{getTypeLabel(event.type, lang)}</Badge>
                          {status === 'ongoing' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {lang === 'ja' ? 'é€²è¡Œä¸­' : 'Äang diá»…n ra'}
                            </span>
                          )}
                          {status === 'passed' && (
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{lang === 'ja' ? 'çµ‚äº†' : 'ÄÃ£ qua'}</span>
                          )}
                          {status === 'upcoming' && (
                            <span className="text-[10px] font-semibold text-brand-500 dark:text-brand-400">{lang === 'ja' ? 'ã‚‚ã†ã™ãé–‹å§‹' : 'Sáº¯p báº¯t Ä‘áº§u'}</span>
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
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{lang === 'ja' ? 'ç©ºãæ™‚é–“ã®ææ¡ˆ' : 'Gá»£i Ã½ thá»i gian ráº£nh'}</p>
                <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? 'ä»Šæ—¥ã®ç©ºãæ™‚é–“' : 'Khoáº£ng trá»‘ng trong ngÃ y'}</h2>
              </div>
              {getFreeTimeSuggestions(todayEvents).length === 0 ? (
                <EmptyState title={lang === 'ja' ? 'ååˆ†ãªç©ºãæ™‚é–“ãŒã‚ã‚Šã¾ã›ã‚“' : 'KhÃ´ng cÃ³ khoáº£ng trá»‘ng Ä‘á»§ lá»›n'} description={lang === 'ja' ? 'ä»Šæ—¥ã®ã‚¹ã‚±ã‚¸ãƒ¥ãƒ¼ãƒ«ã¯ã‹ãªã‚Šè©°ã¾ã£ã¦ã„ã¾ã™ã€‚' : 'Lá»‹ch hÃ´m nay khÃ¡ kÃ­n hoáº·c chá»‰ cÃ²n cÃ¡c khoáº£ng ráº¥t ngáº¯n.'} />
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
        {/* âœ¨ Feature: Weekly Summary */}
        <WeeklySummaryPanel events={events} />

        {/* âœ¨ Feature: Smart Deadline Alert (D-7, D-3, D-1) */}
        <SmartDeadlineAlertPanel deadlines={deadlines} />
      </div>

      {/* ðŸŒ Global inline create modal */}
      <EventFormModal
        open={formOpen}
        mode="create"
        initialValue={null}
        onClose={() => setFormOpen(false)}
        onSubmit={async (payload) => {
          await createEvent(payload);
          pushToast({ title: 'Táº¡o sá»± kiá»‡n thÃ nh cÃ´ng', description: payload.title, variant: 'success' });
          void loadData();
        }}
        allEvents={events}
      />
    </>
  );
}

export function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>(() => eventsPageCache ?? []);
  const [loading, setLoading] = useState(!eventsPageCache);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EventFilterMode>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { lang } = useLang();

  const loadEvents = async () => {
    try {
      setLoading(!eventsPageCache && events.length === 0);
      const data = await getAllEvents();
      eventsPageCache = data;
      setEvents(data);
    } catch (err) {
      pushToast({ title: 'Táº£i danh sÃ¡ch tháº¥t báº¡i', description: err instanceof Error ? err.message : 'Vui lÃ²ng thá»­ láº¡i', variant: 'error' });
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
      if (now >= start && now <= end) return 0; // Ä‘ang diá»…n ra
      if (start > now) return 1;                // sáº¯p tá»›i
      return 2;                                 // Ä‘Ã£ qua / quÃ¡ háº¡n
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
        // Within same group: ongoing & upcoming â†’ asc by start; passed â†’ desc by date (most recent first)
        const ta = getEventDateTime(a).getTime();
        const tb = getEventDateTime(b).getTime();
        return ga === 2 ? tb - ta : ta - tb;
      });
  }, [events, filter, search]);

  const handleSubmit = async (payload: EventPayload) => {
    if (editingEvent) {
      await updateEvent(getEventId(editingEvent), payload);
      pushToast({ title: 'Cáº­p nháº­t thÃ nh cÃ´ng', description: editingEvent.title, variant: 'success' });
    } else {
      await createEvent(payload);
      pushToast({ title: 'Táº¡o sá»± kiá»‡n thÃ nh cÃ´ng', description: payload.title, variant: 'success' });
    }
    setEditingEvent(null);
    await loadEvents();
  };

  const handleDelete = async (event: EventItem) => {
    if (!window.confirm(`XÃ³a sá»± kiá»‡n "${event.title}"?`)) return;
    await deleteEvent(getEventId(event));
    pushToast({ title: 'ÄÃ£ xoÃ¡ sá»± kiá»‡n', description: event.title, variant: 'success' });
    await loadEvents();
  };

  const handleComplete = async (event: EventItem) => {
    await toggleEventCompletion(getEventId(event));
    pushToast({ title: 'ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i', description: event.title, variant: 'success' });
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
    return;
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
        pushToast({ title: 'KhÃ´ng thá»ƒ táº£i lá»‹ch', description: err instanceof Error ? err.message : 'Vui lÃ²ng thá»­ láº¡i', variant: 'error' });
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
    setWeekCursor(dayDate);
    const dayEvents = (typeFilter === 'all' ? monthEvents : monthEvents.filter((e) => e.type === typeFilter))
      .filter((e) => e.event_date === event.event_date);
    setSelectedDayEvents(dayEvents);
    setDayEventsModalOpen(true);
  }, [typeFilter, monthEvents]);

  const handleSelectDay = useCallback((dayDate: Date) => {
    const dayKey = format(dayDate, 'yyyy-MM-dd');
    setSelectedDay(dayDate);
    setWeekCursor(dayDate);
    const dayEvents = (typeFilter === 'all' ? monthEvents : monthEvents.filter((e) => e.type === typeFilter))
      .filter((e) => e.event_date === dayKey);
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
      const [monthData, weekData, allEvents] = await Promise.all([
        getMonthEvents({ year, month }),
        getWeekEvents(weekStart, weekEnd),
        eventsPageCache ? Promise.resolve(null) : getAllEvents(),
      ]);
      calendarCache.set(cacheKey, { monthEvents: monthData, weekEvents: weekData });
      if (allEvents) eventsPageCache = allEvents;
      setMonthEvents(monthData);
      setWeekEvents(weekData);
    } catch (err) {
      pushToast({ title: 'KhÃ´ng thá»ƒ táº£i lá»‹ch', description: err instanceof Error ? err.message : 'Vui lÃ²ng thá»­ láº¡i', variant: 'error' });
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
      pushToast({ title: 'Cáº­p nháº­t thÃ nh cÃ´ng', description: payload.title, variant: 'success' });
    } else {
      await createEvent(payload);
      pushToast({ title: 'Táº¡o sá»± kiá»‡n thÃ nh cÃ´ng', description: payload.title, variant: 'success' });
    }
    setEditingEvent(null);
    await reloadCalendar();
  };

  const handleCalendarDelete = async (event: EventItem) => {
    if (!window.confirm(`XÃ³a sá»± kiá»‡n "${event.title}"?`)) return;
    await deleteEvent(getEventId(event));
    pushToast({ title: 'ÄÃ£ xoÃ¡ sá»± kiá»‡n', description: event.title, variant: 'success' });
    setDayEventsModalOpen(false);
    await reloadCalendar();
  };

  const handleCalendarComplete = async (event: EventItem) => {
    await toggleEventCompletion(getEventId(event));
    pushToast({ title: 'ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i', description: event.title, variant: 'success' });
    await reloadCalendar();
  };

  return (
    <>
      <div className="space-y-6">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant={typeFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setTypeFilter('all')} className="flex items-center gap-2">
            {lang === 'ja' ? 'ã™ã¹ã¦' : 'Táº¥t cáº£'} ({monthEvents.length})
          </Button>
          <Button variant={typeFilter === 'hoc' ? 'primary' : 'secondary'} onClick={() => setTypeFilter('hoc')} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-brand-500" />
            {lang === 'ja' ? 'å­¦ç¿’' : 'Lá»‹ch há»c'} ({monthEvents.filter((e) => e.type === 'hoc').length})
          </Button>
          <Button variant={typeFilter === 'deadline' ? 'primary' : 'secondary'} onClick={() => setTypeFilter('deadline')} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            Deadline ({monthEvents.filter((e) => e.type === 'deadline').length})
          </Button>
          <Button variant={typeFilter === 'lam_them' ? 'primary' : 'secondary'} onClick={() => setTypeFilter('lam_them')} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-violet-500" />
            {lang === 'ja' ? 'ã‚¢ãƒ«ãƒã‚¤ãƒˆ' : 'LÃ m thÃªm'} ({monthEvents.filter((e) => e.type === 'lam_them').length})
          </Button>
        </div>

        {/* Calendar Section */}
        <div className="space-y-6">
          {/* Month Calendar - Full Width */}
          <MonthCalendar
            cursor={cursor}
            setCursor={setCursor}
            events={filteredMonthEvents}
            onSelectDay={handleSelectDay}
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
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{lang === 'ja' ? 'é¸æŠžã—ãŸæ—¥ä»˜' : 'NgÃ y Ä‘Æ°á»£c chá»n'}</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">{format(weekCursor, 'EEEE', lang === 'ja' ? { locale: ja } : undefined)}</h3>
                  <h4 className="text-3xl font-bold text-brand-600 dark:text-brand-400">{format(weekCursor, 'dd/MM/yyyy')}</h4>
                </div>
                <Button variant="secondary" onClick={() => navigate('/app/events')} className="w-full">
                  {lang === 'ja' ? 'ãƒªã‚¹ãƒˆã‚’è¦‹ã‚‹' : 'Xem danh sÃ¡ch'}
                </Button>
              </CardBody>
            </Card>

            {/* Quick Stats */}
            <Card className="md:col-span-2 lg:col-span-2">
              <CardBody className="space-y-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{lang === 'ja' ? 'æ—¥åˆ¥çµ±è¨ˆ' : 'Thá»‘ng kÃª ngÃ y'}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-brand-50 dark:bg-brand-900/20 p-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400">{lang === 'ja' ? 'åˆè¨ˆ' : 'Tá»•ng'}</p>
                    <p className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">{filteredWeekEvents.filter(e => e.event_date === format(weekCursor, 'yyyy-MM-dd')).length}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400">Deadline</p>
                    <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{filteredWeekEvents.filter(e => e.type === 'deadline' && e.event_date === format(weekCursor, 'yyyy-MM-dd')).length}</p>
                  </div>
                  <div className="rounded-2xl bg-violet-50 dark:bg-violet-900/20 p-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400">{lang === 'ja' ? 'ã‚¢ãƒ«ãƒã‚¤ãƒˆ' : 'LÃ m thÃªm'}</p>
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
      pushToast({ title: 'KhÃ´ng tÃ¬m tháº¥y sá»± kiá»‡n', description: err instanceof Error ? err.message : 'Vui lÃ²ng thá»­ láº¡i', variant: 'error' });
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
    pushToast({ title: lang === 'ja' ? 'æ›´æ–°ã—ã¾ã—ãŸ' : 'Cáº­p nháº­t thÃ nh cÃ´ng', description: updated.title, variant: 'success' });
  };

  const handleComplete = async () => {
    if (!event) return;
    const updated = await toggleEventCompletion(getEventId(event));
    setEvent(updated);
    pushToast({ title: lang === 'ja' ? 'ã‚¹ãƒ†ãƒ¼ã‚¿ã‚¹æ›´æ–°' : 'ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i', description: updated.title, variant: 'success' });
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!window.confirm(lang === 'ja' ? `ã€Œ${event.title}ã€ã‚’å‰Šé™¤ã—ã¾ã™ã‹ï¼Ÿ` : `XÃ³a sá»± kiá»‡n "${event.title}"?`)) return;
    await deleteEvent(getEventId(event));
    pushToast({ title: lang === 'ja' ? 'å‰Šé™¤ã—ã¾ã—ãŸ' : 'ÄÃ£ xoÃ¡ sá»± kiá»‡n', description: event.title, variant: 'success' });
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
                  <Badge tone={event.type === 'deadline' ? 'warning' : event.type === 'hoc' ? 'brand' : 'purple'}>{getTypeLabel(event.type, lang)}</Badge>
                  <h1 className="mt-3 text-3xl font-semibold text-slate-950 dark:text-slate-50">{event.title}</h1>
                  <p className="mt-3 text-slate-600 dark:text-slate-300">{event.description || (lang === 'ja' ? 'èª¬æ˜Žãªã—' : 'KhÃ´ng cÃ³ mÃ´ táº£')}</p>
                </div>
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  {lang === 'ja' ? 'ç·¨é›†' : 'Chá»‰nh sá»­a'}
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoBox label={lang === 'ja' ? 'æ—¥ä»˜' : 'NgÃ y'} value={format(new Date(event.event_date), 'dd/MM/yyyy')} />
                <InfoBox label={lang === 'ja' ? 'æ™‚é–“' : 'Giá»'} value={formatTimeRange(event.start_time, event.end_time)} />
                <InfoBox label={lang === 'ja' ? 'å ´æ‰€' : 'Äá»‹a Ä‘iá»ƒm'} value={event.location || 'â€”'} />
                <InfoBox label={lang === 'ja' ? 'ã‚¿ã‚°' : 'Tag'} value={event.tag_label || 'â€”'} />
                <InfoBox label={lang === 'ja' ? 'ç¹°ã‚Šè¿”ã—' : 'Láº·p láº¡i'} value={getRecurrenceLabel(event.recurrence_frequency, event.recurrence_interval || 1, lang)} />
              </div>

              {event.is_completed ? (
                <div className="rounded-3xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{lang === 'ja' ? 'å®Œäº†æ¸ˆã¿' : 'ÄÃ£ hoÃ n thÃ nh'}</p>
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
                          <Badge tone={getPriorityTone(event.deadline.priority)}>{getPriorityLabel(event.deadline.priority, lang)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{lang === 'ja' ? 'ã‚¹ãƒ†ãƒ¼ã‚¿ã‚¹' : 'Tráº¡ng thÃ¡i'}: {event.is_completed ? (lang === 'ja' ? 'å®Œäº†' : 'HoÃ n thÃ nh') : (lang === 'ja' ? 'å¾…æ©Ÿä¸­' : 'Äang chá»')}</p>
                      </div>
                      <div className="flex gap-2">
                        {!event.is_completed ? (
                          <Button onClick={handleComplete}>
                            <CheckCircle2 className="h-4 w-4" />
                            {lang === 'ja' ? 'å®Œäº†ã«ã™ã‚‹' : 'HoÃ n thÃ nh'}
                          </Button>
                        ) : null}
                        <Button variant="secondary" onClick={() => navigate('/app/calendar')}>
                          <Calendar className="h-4 w-4" />
                          {lang === 'ja' ? 'ã‚«ãƒ¬ãƒ³ãƒ€ãƒ¼' : 'Lá»‹ch'}
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button variant="danger" onClick={handleDelete}>{lang === 'ja' ? 'å‰Šé™¤' : 'XoÃ¡'}</Button>
                <Button variant="secondary" onClick={() => navigate('/app/events')}>{lang === 'ja' ? 'æˆ»ã‚‹' : 'Quay láº¡i'}</Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Preview</p>
              <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-2xl">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{format(new Date(event.event_date), 'EEE, dd MMM')}</p>
                <h2 className="mt-3 text-2xl font-semibold">{event.title}</h2>
                <p className="mt-3 text-sm text-slate-300">{event.description || (lang === 'ja' ? 'èª¬æ˜Žãªã—' : 'KhÃ´ng cÃ³ mÃ´ táº£')}</p>
                <div className="mt-5 space-y-2 text-sm text-slate-300">
                  <p>{formatTimeRange(event.start_time, event.end_time)}</p>
                  <p>{event.location || 'â€”'}</p>
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
          pushToast({ title: lang === 'ja' ? 'ã‚¤ãƒ™ãƒ³ãƒˆã‚’ä½œæˆã—ã¾ã—ãŸ' : 'Táº¡o sá»± kiá»‡n thÃ nh cÃ´ng', description: payload.title, variant: 'success' });
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
      pushToast({ title: 'ÄÃ£ cáº­p nháº­t há»“ sÆ¡', description: 'ThÃ´ng tin cÃ¡ nhÃ¢n Ä‘Ã£ Ä‘Æ°á»£c lÆ°u.', variant: 'success' });
    } catch (error) {
      pushToast({ title: 'Cáº­p nháº­t tháº¥t báº¡i', description: error instanceof Error ? error.message : 'Vui lÃ²ng thá»­ láº¡i', variant: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      pushToast({ title: 'Máº­t kháº©u khÃ´ng khá»›p', description: 'Vui lÃ²ng kiá»ƒm tra láº¡i máº­t kháº©u má»›i.', variant: 'error' });
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword({ current_password: passwordForm.current_password, new_password: passwordForm.new_password });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      pushToast({ title: 'ÄÃ£ Ä‘á»•i máº­t kháº©u', description: 'Máº­t kháº©u má»›i Ä‘Ã£ Ä‘Æ°á»£c lÆ°u.', variant: 'success' });
    } catch (error) {
      pushToast({ title: 'Äá»•i máº­t kháº©u tháº¥t báº¡i', description: error instanceof Error ? error.message : 'Vui lÃ²ng thá»­ láº¡i', variant: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <PageShell
        title={lang === 'ja' ? 'ãƒ—ãƒ­ãƒ•ã‚£ãƒ¼ãƒ«' : 'Há»“ sÆ¡ cÃ¡ nhÃ¢n'}
        description={lang === 'ja' ? 'ã‚¢ã‚«ã‚¦ãƒ³ãƒˆæƒ…å ±ã®æ›´æ–°ã¨ãƒ‘ã‚¹ãƒ¯ãƒ¼ãƒ‰å¤‰æ›´ã¯ã“ã¡ã‚‰ã§è¡Œãˆã¾ã™ã€‚' : 'Cáº­p nháº­t thÃ´ng tin tÃ i khoáº£n vÃ  thay Ä‘á»•i máº­t kháº©u táº¡i Ä‘Ã¢y.'}
      >
        <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <Card>
            <CardBody className="space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{lang === 'ja' ? 'å€‹äººæƒ…å ±' : 'ThÃ´ng tin cÃ¡ nhÃ¢n'}</p>
                <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? 'ãƒ—ãƒ­ãƒ•ã‚£ãƒ¼ãƒ«ç·¨é›†' : 'Chá»‰nh sá»­a há»“ sÆ¡'}</h2>
              </div>

              <form className="space-y-4" onSubmit={handleProfileSubmit}>
                <Field label={lang === 'ja' ? 'æ°å' : 'Há» vÃ  tÃªn'}>
                  <Input value={profileForm.full_name} onChange={(e) => setProfileForm((current) => ({ ...current, full_name: e.target.value }))} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm((current) => ({ ...current, email: e.target.value }))} />
                </Field>

                <Button type="submit" isLoading={savingProfile}>{lang === 'ja' ? 'å¤‰æ›´ã‚’ä¿å­˜' : 'LÆ°u thay Ä‘á»•i'}</Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{lang === 'ja' ? 'ã‚»ã‚­ãƒ¥ãƒªãƒ†ã‚£' : 'Báº£o máº­t'}</p>
                <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? 'ãƒ‘ã‚¹ãƒ¯ãƒ¼ãƒ‰å¤‰æ›´' : 'Äá»•i máº­t kháº©u'}</h2>
              </div>

              <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                <Field label={lang === 'ja' ? 'ç¾åœ¨ã®ãƒ‘ã‚¹ãƒ¯ãƒ¼ãƒ‰' : 'Máº­t kháº©u hiá»‡n táº¡i'}>
                  <Input type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm((current) => ({ ...current, current_password: e.target.value }))} />
                </Field>
                <Field label={lang === 'ja' ? 'æ–°ã—ã„ãƒ‘ã‚¹ãƒ¯ãƒ¼ãƒ‰' : 'Máº­t kháº©u má»›i'}>
                  <Input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm((current) => ({ ...current, new_password: e.target.value }))} />
                </Field>
                <Field label={lang === 'ja' ? 'æ–°ã—ã„ãƒ‘ã‚¹ãƒ¯ãƒ¼ãƒ‰ï¼ˆç¢ºèªï¼‰' : 'Nháº­p láº¡i máº­t kháº©u má»›i'}>
                  <Input type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm((current) => ({ ...current, confirm_password: e.target.value }))} />
                </Field>

                <Button type="submit" variant="secondary" isLoading={savingPassword}>{lang === 'ja' ? 'ãƒ‘ã‚¹ãƒ¯ãƒ¼ãƒ‰å¤‰æ›´' : 'Äá»•i máº­t kháº©u'}</Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardBody>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{lang === 'ja' ? 'ä½¿ç”¨ä¸­ã®ã‚¢ã‚«ã‚¦ãƒ³ãƒˆ' : 'TÃ i khoáº£n Ä‘ang dÃ¹ng'}</p>
                <h3 className="text-xl font-semibold text-slate-950 dark:text-slate-50">{user?.full_name || 'â€”'}</h3>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-700 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                {user?.email || 'â€”'}
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
          pushToast({ title: 'Táº¡o sá»± kiá»‡n thÃ nh cÃ´ng', description: payload.title, variant: 'success' });
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
        <h1 className="mt-4 text-4xl font-semibold">KhÃ´ng tÃ¬m tháº¥y trang</h1>
        <p className="mt-3 text-slate-300">ÄÆ°á»ng dáº«n nÃ y khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ bá»‹ chuyá»ƒn hÆ°á»›ng.</p>
        <a href="/app" className="mt-8 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">Vá» dashboard</a>
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

function EventsSkeleton() {
  return <Skeleton className="h-[560px] rounded-3xl" />;
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
          <Button className="mt-6" onClick={onRetry}>Táº£i láº¡i</Button>
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

// â”€â”€â”€ âœ¨ Feature #15a: AI Weekly Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      ? 'ðŸ”¥ ç´ æ™´ã‚‰ã—ã„é€±ã§ã™ï¼å®Œäº†çŽ‡ãŒã¨ã¦ã‚‚é«˜ã„ã§ã™ã€‚'
      : summary.completionRate >= 50
      ? 'ðŸ‘ å®‰å®šã—ãŸé€±ã§ã™ã€‚ã“ã®ãƒšãƒ¼ã‚¹ã‚’ç¶­æŒã—ã¾ã—ã‚‡ã†ï¼'
      : summary.total === 0
      ? 'ðŸ“‹ ä»Šé€±ã®ã‚¹ã‚±ã‚¸ãƒ¥ãƒ¼ãƒ«ãŒã¾ã ã‚ã‚Šã¾ã›ã‚“ã€‚è¨ˆç”»ã‚’ç«‹ã¦ã¾ã—ã‚‡ã†ï¼'
      : 'âš ï¸ å®Œäº†çŽ‡ãŒä½Žã‚ã§ã™ã€‚å„ªå…ˆåº¦ã‚’è¦‹ç›´ã—ã¾ã—ã‚‡ã†ã€‚'
    : summary.completionRate >= 80
      ? 'ðŸ”¥ Tuáº§n xuáº¥t sáº¯c! Tá»· lá»‡ hoÃ n thÃ nh ráº¥t cao.'
      : summary.completionRate >= 50
      ? 'ðŸ‘ Tuáº§n á»•n Ä‘á»‹nh. HÃ£y duy trÃ¬ phong Ä‘á»™!'
      : summary.total === 0
      ? 'ðŸ“‹ ChÆ°a cÃ³ lá»‹ch tuáº§n nÃ y. HÃ£y lÃªn káº¿ hoáº¡ch!'
      : 'âš ï¸ Tá»· lá»‡ hoÃ n thÃ nh tháº¥p. Xem láº¡i má»©c Ä‘á»™ Æ°u tiÃªn.';

  const statItems = [
    { label: lang === 'ja' ? 'å­¦ç¿’æ™‚é–“' : 'Giá» há»c', value: summary.studyMins > 0 ? summary.toH(summary.studyMins) : '0h', color: 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400' },
    { label: lang === 'ja' ? 'ã‚¢ãƒ«ãƒã‚¤ãƒˆæ™‚é–“' : 'Giá» lÃ m thÃªm', value: summary.workMins > 0 ? summary.toH(summary.workMins) : '0h', color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400' },
    { label: 'Deadline', value: `${summary.deadlineCount} ${lang === 'ja' ? 'ä»¶' : 'viá»‡c'}`, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
    { label: lang === 'ja' ? 'å®Œäº†' : 'HoÃ n thÃ nh', value: `${summary.completionRate}%`, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
  ];

  return (
    <Card className="overflow-hidden border-brand-100 dark:border-brand-900/30">
      <CardBody>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{lang === 'ja' ? 'ä»Šé€±ã®ã¾ã¨ã‚' : 'Tá»•ng káº¿t tuáº§n nÃ y'}</h2>
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
                ? `å®Œäº†çŽ‡ (${summary.completedCount}/${summary.total} ä»¶)`
                : `Tá»· lá»‡ hoÃ n thÃ nh (${summary.completedCount}/${summary.total} sá»± kiá»‡n)`}
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

// â”€â”€â”€ âœ¨ Feature #15b: Smart Deadline Alert (D-7, D-3, D-1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    if (diffDays <= 0) return lang === 'ja' ? 'ðŸ”´ æœŸé™åˆ‡ã‚Œï¼' : 'ðŸ”´ QuÃ¡ háº¡n!';
    if (diffDays === 1) return 'ðŸ”´ D-1';
    if (diffDays <= 3) return `ðŸŸ  D-${diffDays}`;
    if (diffDays <= 7) return `ðŸŸ¡ D-${diffDays}`;
    return `ðŸŸ¢ D-${diffDays}`;
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
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">Smart Deadline Alert</h2>
          </div>
          <span className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 text-sm font-semibold text-rose-700 dark:text-rose-400">
            {lang === 'ja' ? 'D-7 â†’ D-1 â†’ æœŸé™åˆ‡ã‚Œ' : 'D-7 â†’ D-1 â†’ QuÃ¡ háº¡n'}
          </span>
        </div>

        {alerts.length === 0 ? (
          <EmptyState
            title={lang === 'ja' ? 'è­¦å‘ŠãŒå¿…è¦ãªç· ã‚åˆ‡ã‚Šã¯ã‚ã‚Šã¾ã›ã‚“' : 'KhÃ´ng cÃ³ deadline nÃ o cáº§n cáº£nh bÃ¡o'}
            description={lang === 'ja' ? 'ã™ã¹ã¦ã®ç· ã‚åˆ‡ã‚Šã¯ã¾ã ä½™è£•ãŒã‚ã‚‹ã‹ã€å®Œäº†æ¸ˆã¿ã§ã™ã€‚' : 'Táº¥t cáº£ deadline Ä‘á»u cÃ²n nhiá»u thá»i gian hoáº·c Ä‘Ã£ hoÃ n thÃ nh.'}
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
                        ? format(new Date(event.deadline.due_datetime), 'HH:mm â€“ dd/MM/yyyy')
                        : (lang === 'ja' ? 'ä¸æ˜Ž' : 'KhÃ´ng xÃ¡c Ä‘á»‹nh')}
                    </p>
                    {diffDays <= 3 && diffDays > 0 && (
                      <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                        {lang === 'ja'
                          ? `âš¡ ã‚ã¨${diffDays}æ—¥ï¼ä»Šã™ãå„ªå…ˆçš„ã«å–ã‚Šçµ„ã¿ã¾ã—ã‚‡ã†ã€‚`
                          : `âš¡ CÃ²n ${diffDays} ngÃ y! HÃ£y Æ°u tiÃªn hoÃ n thÃ nh ngay.`}
                      </p>
                    )}
                    {diffDays <= 0 && (
                      <p className="mt-1 text-xs font-bold text-rose-700 dark:text-rose-400">
                        {lang === 'ja'
                          ? 'â— æœŸé™ã‚’éŽãŽã¦ã„ã¾ã™ï¼å¿…è¦ã§ã‚ã‚Œã°æ‹…å½“è€…ã«é€£çµ¡ã—ã¦ãã ã•ã„ã€‚'
                          : 'â— ÄÃ£ quÃ¡ háº¡n! LiÃªn há»‡ giáº£ng viÃªn ngay náº¿u cáº§n.'}
                      </p>
                    )}
                  </div>
                  <Badge tone={getPriorityTone(event.deadline?.priority)}>{getPriorityLabel(event.deadline?.priority, lang)}</Badge>
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
                      {lang === 'ja' ? `${diffDays}/7æ—¥æ®‹ã‚Š` : `${diffDays}/7 ngÃ y cÃ²n láº¡i`}
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

