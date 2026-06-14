import { format, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { EventItem } from '@/types/event';
import { buildMonthGrid, buildWeekRange, formatTimeRange, getMonthCursor, getTypeLabel, isAllDayEvent } from '@/utils/date';
import { getEventId } from '@/utils/event-id';
import { Badge, Button, Card, CardBody } from './ui';
import { useLang } from '@/context/lang-context';

export function MonthCalendar({
  cursor,
  setCursor,
  events,
  onSelectDay,
  onEventClick,
}: {
  cursor: Date;
  setCursor: (date: Date) => void;
  events: EventItem[];
  onSelectDay: (date: Date) => void;
  onEventClick?: (event: EventItem) => void;
}) {
  const grid = buildMonthGrid(cursor);
  const grouped = groupByDate(events);
  const { lang } = useLang();

  const dayLabels = lang === 'ja'
    ? ['月', '火', '水', '木', '金', '土', '日']
    : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {lang === 'ja' ? '月間カレンダー' : 'Lịch tháng'}
            </p>
            <h3 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
              {lang === 'ja' ? format(cursor, 'yyyy年M月', { locale: ja }) : format(cursor, 'MMMM yyyy')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <IconButton onClick={() => setCursor(getMonthCursor(cursor, 'prev'))}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <Button variant="secondary" onClick={() => setCursor(new Date())}>
              <CalendarDays className="h-4 w-4" />
              {lang === 'ja' ? '今日' : 'Hôm nay'}
            </Button>
            <IconButton onClick={() => setCursor(getMonthCursor(cursor, 'next'))}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          {dayLabels.map((day) => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {grid.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = grouped[dayKey] || [];
            const currentMonth = day.getMonth() === cursor.getMonth();
            const today = isSameDay(day, new Date());

            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => onSelectDay(day)}
                className={`min-h-[90px] rounded-2xl border p-2 text-left flex flex-col transition hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 ${
                  today
                    ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600'
                    : 'border-slate-100 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40'
                } ${!currentMonth ? 'opacity-30' : ''}`}
              >
                <p
                  className={`text-xs font-bold leading-none ${
                    today
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {format(day, 'd')}
                </p>

                {/* All-day / holiday banners at top */}
                {(() => {
                  const allDayEvs = dayEvents.filter(isAllDayEvent);
                  const timedEvs  = dayEvents.filter(e => !isAllDayEvent(e));
                  const timedVisible = timedEvs.slice(0, Math.max(0, 2 - allDayEvs.length));
                  const totalExtra = dayEvents.length - allDayEvs.length - timedVisible.length;
                  return (
                    <div className="mt-1.5 flex-1 space-y-1">
                      {/* All-day banners */}
                      {allDayEvs.map(event => (
                        <div
                          key={getEventId(event)}
                          onClick={e => { e.stopPropagation(); onEventClick?.(event); }}
                          className="w-full rounded-lg bg-emerald-500/20 dark:bg-emerald-500/30 border border-emerald-400/40 dark:border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 truncate cursor-pointer hover:bg-emerald-500/30 transition"
                        >
                          🌍 {event.title}
                        </div>
                      ))}
                      {/* Timed events */}
                      {timedVisible.map(event => (
                        <div
                          key={getEventId(event)}
                          onClick={e => { e.stopPropagation(); onEventClick?.(event); }}
                          className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-700/60 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer transition hover:bg-slate-100 dark:hover:bg-slate-600 hover:border-slate-200"
                        >
                          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{event.title}</p>
                          <p className="mt-0.5 truncate">{formatTimeRange(event.start_time, event.end_time)}</p>
                        </div>
                      ))}
                      {totalExtra > 0 && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); onSelectDay(day); }}
                          className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline cursor-pointer"
                        >
                          +{totalExtra} {lang === 'ja' ? '件' : 'sự kiện'}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

export function WeekAgenda({
  weekCursor,
  setWeekCursor,
  events,
  typeFilter,
  setTypeFilter,
  onEventClick,
}: {
  weekCursor: Date;
  setWeekCursor: (date: Date) => void;
  events: EventItem[];
  typeFilter: 'all' | 'hoc' | 'deadline' | 'lam_them';
  setTypeFilter: (type: 'all' | 'hoc' | 'deadline' | 'lam_them') => void;
  onEventClick?: (event: EventItem) => void;
}) {
  const weekRange = buildWeekRange(weekCursor);
  const { lang } = useLang();

  const typeFilters: { label: string; value: typeof typeFilter }[] = lang === 'ja'
    ? [
        { label: 'すべて', value: 'all' },
        { label: '学習', value: 'hoc' },
        { label: '締切', value: 'deadline' },
        { label: 'バイト', value: 'lam_them' },
      ]
    : [
        { label: 'Tất cả', value: 'all' },
        { label: 'Học tập', value: 'hoc' },
        { label: 'Deadline', value: 'deadline' },
        { label: 'Làm thêm', value: 'lam_them' },
      ];

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {lang === 'ja' ? '週間スケジュール' : 'Tuần này'}
            </p>
            <h3 className="text-xl font-semibold text-slate-950 dark:text-slate-50">
              {format(weekRange[0], 'dd/MM')} – {format(weekRange[weekRange.length - 1], 'dd/MM/yyyy')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <IconButton onClick={() => setWeekCursor(prevWeek(weekCursor))}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <Button variant="secondary" onClick={() => setWeekCursor(new Date())}>
              {lang === 'ja' ? '今週' : 'Tuần này'}
            </Button>
            <IconButton onClick={() => setWeekCursor(nextWeek(weekCursor))}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {typeFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTypeFilter(item.value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                typeFilter === item.value
                  ? 'bg-slate-950 dark:bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              {lang === 'ja' ? '今週のイベントはありません' : 'Không có sự kiện trong tuần này'}
            </p>
          ) : (
            events.map((event) => (
              <button
                key={getEventId(event)}
                type="button"
                onClick={() => onEventClick?.(event)}
                className="w-full rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 text-left transition hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-950 dark:text-slate-50 truncate">{event.title}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {format(new Date(event.event_date), 'EEE dd/MM', lang === 'ja' ? { locale: ja } : undefined)} • {formatTimeRange(event.start_time, event.end_time)}
                    </p>
                  </div>
                  <Badge tone={event.type === 'deadline' ? 'warning' : event.type === 'hoc' ? 'brand' : 'purple'}>
                    {getTypeLabel(event.type, lang)}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function IconButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-600 hover:text-slate-950 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

function groupByDate(events: EventItem[]) {
  return events.reduce<Record<string, EventItem[]>>((acc, event) => {
    const key = event.event_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});
}

function prevWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 7);
  return d;
}

function nextWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 7);
  return d;
}
