import { format } from 'date-fns';
import { Clock, MapPin, X } from 'lucide-react';
import { useMemo } from 'react';
import type { EventItem } from '@/types/event';
import { formatTimeRange, getPriorityLabel, getPriorityTone, getTypeLabel } from '@/utils/date';
import { getEventId } from '@/utils/event-id';
import { Badge, Button } from './ui';
import { useLang } from '@/context/lang-context';

interface DayEventsModalProps {
  open: boolean;
  date: Date;
  events: EventItem[];
  onClose: () => void;
  onEventClick?: (event: EventItem) => void;
}

export function DayEventsModal({ open, date, events, onClose, onEventClick }: DayEventsModalProps) {
  const { t, lang } = useLang();
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const timeA = a.start_time.split(':').map(Number);
      const timeB = b.start_time.split(':').map(Number);
      return timeA[0] - timeB[0] || timeA[1] - timeB[1];
    });
  }, [events]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm animate-fadeIn p-4 pt-6 pb-10">
      <div className="w-full overflow-hidden rounded-3xl bg-white dark:bg-slate-800 shadow-2xl sm:max-w-2xl animate-fadeInUp">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur px-6 py-5 sm:rounded-t-3xl">
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">{format(date, 'EEEE')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{format(date, 'dd/MM/yyyy')}</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {events.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg text-slate-400 dark:text-slate-500">
                {lang === 'ja' ? 'この日のイベントはありません' : 'Không có sự kiện trong ngày này'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedEvents.map((event) => (
                <div
                  key={getEventId(event)}
                  onClick={() => onEventClick?.(event)}
                  className={`rounded-3xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5 transition ${
                    onEventClick ? 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-md' : ''
                  } ${
                    event.type === 'deadline'
                      ? 'border-l-4 border-l-amber-400'
                      : event.type === 'hoc'
                      ? 'border-l-4 border-l-brand-400'
                      : 'border-l-4 border-l-violet-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50 truncate">{event.title}</h3>
                        <Badge tone={event.type === 'deadline' ? 'warning' : event.type === 'hoc' ? 'brand' : 'purple'}>
                          {getTypeLabel(event.type)}
                        </Badge>
                        {event.is_completed && (
                          <Badge tone="success">{lang === 'ja' ? '完了' : 'Hoàn thành'}</Badge>
                        )}
                      </div>

                      {event.description && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{event.description}</p>
                      )}

                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          <span>{formatTimeRange(event.start_time, event.end_time)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.tag_label && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <span className="inline-flex px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
                              {event.tag_label}
                            </span>
                          </div>
                        )}
                      </div>

                      {event.deadline && (
                        <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Priority</p>
                          <div className="mt-2">
                            <Badge tone={getPriorityTone(event.deadline.priority)}>{getPriorityLabel(event.deadline.priority)}</Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-slate-200/80 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur px-6 py-4">
          <Button onClick={onClose} variant="secondary" className="w-full">
            {lang === 'ja' ? '閉じる' : 'Đóng'}
          </Button>
        </div>
      </div>
    </div>
  );
}
