import {
  addDays,
  addMonths,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
  startOfMonth,
  isSameDay,
  isToday,
  isWithinInterval,
} from 'date-fns';
import type { EventItem } from '@/types/event';

export function formatDateLabel(input: string | Date) {
  return format(typeof input === 'string' ? parseISO(input) : input, 'dd MMM yyyy');
}

export function formatDateShort(input: string | Date) {
  return format(typeof input === 'string' ? parseISO(input) : input, 'EEE, dd/MM');
}

export function formatTimeRange(startTime: string, endTime: string) {
  return `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`;
}

export function isAllDayEvent(event: Pick<EventItem, 'type' | 'start_time' | 'end_time'>) {
  return event.type === 'holiday' || (event.start_time.slice(0, 5) === '00:00' && event.end_time.slice(0, 5) === '23:59');
}

export function getMonthCursor(date: Date, direction: 'prev' | 'next') {
  return direction === 'prev' ? addMonths(date, -1) : addMonths(date, 1);
}

export function buildMonthGrid(date: Date) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function buildWeekRange(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  return days;
}

export function groupEventsByDate(events: EventItem[]) {
  return events.reduce<Record<string, EventItem[]>>((acc, event) => {
    if (!acc[event.event_date]) acc[event.event_date] = [];
    acc[event.event_date].push(event);
    return acc;
  }, {});
}

export function isEventToday(event: EventItem) {
  return isToday(parseISO(event.event_date));
}

export function isEventInRange(event: EventItem, start: Date, end: Date) {
  return isWithinInterval(parseISO(event.event_date), { start, end });
}

export function isSameCalendarDay(a: Date, b: Date) {
  return isSameDay(a, b);
}

export function getTypeLabel(type: EventItem['type']) {
  switch (type) {
    case 'hoc':
      return 'Học tập';
    case 'deadline':
      return 'Deadline';
    case 'lam_them':
      return 'Làm thêm';
    case 'holiday':
      return 'Ngày lễ';
    default:
      return type;
  }
}

export function getPriorityLabel(priority?: string | null) {
  switch (priority) {
    case 'high':
      return 'Cao';
    case 'medium':
      return 'Trung bình';
    case 'low':
      return 'Thấp';
    default:
      return '—';
  }
}

export function getPriorityTone(priority?: string | null) {
  switch (priority) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'neutral';
  }
}

export function getRecurrenceLabel(frequency?: string | null, interval = 1) {
  switch (frequency) {
    case 'daily':
      return interval > 1 ? `Mỗi ${interval} ngày` : 'Hằng ngày';
    case 'weekly':
      return interval > 1 ? `Mỗi ${interval} tuần` : 'Hằng tuần';
    case 'monthly':
      return interval > 1 ? `Mỗi ${interval} tháng` : 'Hằng tháng';
    default:
      return '—';
  }
}

export function getDeadlineCountdownLabel(dueDatetime?: string | null, now = new Date()) {
  if (!dueDatetime) return '—';

  const target = typeof dueDatetime === 'string' ? parseISO(dueDatetime) : dueDatetime;
  const diffMinutes = differenceInMinutes(target, now);

  if (diffMinutes <= 0) return 'Đã quá hạn';
  if (diffMinutes < 60) return `Còn ${diffMinutes} phút`;

  const diffHours = Math.ceil(diffMinutes / 60);
  if (diffHours < 24) return `Còn ${diffHours} giờ`;

  const diffDays = Math.ceil(diffHours / 24);
  return `Còn ${diffDays} ngày`;
}

export function getEventDurationMinutes(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.slice(0, 5).split(':').map(Number);
  const [endHour, endMinute] = endTime.slice(0, 5).split(':').map(Number);
  return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
}

export function getTimeStatistics(events: EventItem[]) {
  const totals = {
    hoc: 0,
    deadline: 0,
    lam_them: 0,
    holiday: 0,
  };

  let completedDeadlines = 0;

  for (const event of events) {
    const duration = Math.max(0, getEventDurationMinutes(event.start_time, event.end_time));
    totals[event.type] += duration;
    if (event.type === 'deadline' && event.deadline?.is_completed) completedDeadlines += 1;
  }

  return {
    studyHours: Math.round((totals.hoc / 60) * 10) / 10,
    workHours: Math.round((totals.lam_them / 60) * 10) / 10,
    deadlineCount: events.filter((event) => event.type === 'deadline').length,
    completedDeadlines,
  };
}

export function isEventInCurrentWeek(event: EventItem, reference = new Date()) {
  const start = startOfWeek(reference, { weekStartsOn: 1 });
  const end = endOfWeek(reference, { weekStartsOn: 1 });
  return isEventInRange(event, start, end);
}

export function isEventInCurrentMonth(event: EventItem, reference = new Date()) {
  const start = startOfMonth(reference);
  const end = endOfMonth(reference);
  return isEventInRange(event, start, end);
}

export function isEventCompleted(event: EventItem) {
  return Boolean(event.is_completed);
}

export function isEventUrgent(event: EventItem, reference = new Date()) {
  if (event.type !== 'deadline' || event.deadline?.is_completed) return false;
  return getDeadlineCountdownLabel(event.deadline?.due_datetime, reference) !== 'Đã quá hạn'
    && differenceInMinutes(parseISO(event.deadline!.due_datetime), reference) <= 3 * 24 * 60;
}

export function getFreeTimeSuggestions(events: EventItem[], day = new Date()) {
  const selectedDay = format(day, 'yyyy-MM-dd');
  const dayEvents = events
    .filter((event) => event.event_date === selectedDay && !isAllDayEvent(event))
    .slice()
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const workStart = 8 * 60;
  const workEnd = 22 * 60;
  const gaps: Array<{ start: string; end: string; label: string }> = [];

  let cursor = workStart;
  for (const event of dayEvents) {
    const [startHour, startMinute] = event.start_time.slice(0, 5).split(':').map(Number);
    const [endHour, endMinute] = event.end_time.slice(0, 5).split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    if (start > cursor) {
      const gapMinutes = start - cursor;
      if (gapMinutes >= 60) {
        gaps.push({
          start: `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`,
          end: `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
          label: gapMinutes >= 180 ? 'Khoảng trống dài' : 'Khoảng trống vừa',
        });
      }
    }

    cursor = Math.max(cursor, end);
  }

  if (cursor < workEnd) {
    const gapMinutes = workEnd - cursor;
    if (gapMinutes >= 60) {
      gaps.push({
        start: `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`,
        end: '22:00',
        label: gapMinutes >= 180 ? 'Khoảng trống dài' : 'Khoảng trống cuối ngày',
      });
    }
  }

  return gaps.slice(0, 3);
}

export function startOfToday() {
  return startOfDay(new Date());
}
