import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Bell, CalendarRange, Clock3, LayoutDashboard, ListTodo, LogOut, Menu, Moon, Plus, Sun, UserCircle2, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';
import { NAV_ITEMS } from '@/utils/constants';
import { Badge, Button, Card } from './ui';
import { useAuth } from '@/context/auth-context';
import { getUpcomingNotifications } from '@/services/events';
import { formatTimeRange } from '@/utils/date';
import { getEventId } from '@/utils/event-id';
import type { EventItem } from '@/types/event';
import { useTheme } from '@/context/theme-context';
import { useLang } from '@/context/lang-context';
import { useToast } from '@/context/toast-context';

const iconMap = {
  LayoutDashboard,
  CalendarRange,
  ListTodo,
  UserCircle2,
};

export function AppShell({ children, onCreateEvent }: { children: React.ReactNode; onCreateEvent: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLang();
  const location = useLocation();

  const activeSection = useMemo(() => {
    const match = [...NAV_ITEMS]
      .filter((item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0];
    if (!match) return 'Dashboard';
    return lang === 'ja' ? match.labelJa : match.label;
  }, [location.pathname, lang]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f4f7fb_100%)] dark:bg-slate-900 text-slate-950 dark:text-slate-50 transition-colors duration-200 flex flex-col">

      {/* ── Full-width header ── */}
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between">

          {/* LEFT — mobile menu + breadcrumb title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden text-xs text-slate-400 dark:text-slate-500 lg:block">Calendar Pro</span>
              <span className="hidden text-slate-300 dark:text-slate-600 lg:block">/</span>
              <h1 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{activeSection}</h1>
            </div>
          </div>

          {/* RIGHT — icon group + CTA + avatar */}
          <div className="flex items-center gap-1.5">
            {/* Icon controls group */}
            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-0.5">
              <button
                type="button"
                onClick={() => setLang(lang === 'vi' ? 'ja' : 'vi')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 hover:shadow-sm transition"
                title={t('language')}
              >
                {lang === 'vi' ? 'JP' : 'VI'}
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 hover:shadow-sm transition"
                title={theme === 'dark' ? t('lightMode') : t('darkMode')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <div className="flex h-8 w-8 items-center justify-center">
                <NotificationBell />
              </div>
            </div>

            {/* Separator */}
            <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Add event CTA */}
            <button
              type="button"
              onClick={onCreateEvent}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 dark:hover:bg-brand-500 hover:-translate-y-px transition"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('addEvent')}
            </button>

            {/* Separator */}
            <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />

            {/* User avatar */}
            <Link
              to="/app/profile"
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition group"
              title={user?.full_name || 'Profile'}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 dark:from-brand-500 dark:to-brand-700 text-xs font-bold text-white shadow-sm group-hover:shadow-md transition">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[90px] leading-tight">{user?.full_name || 'User'}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[90px] leading-tight">{user?.email || '—'}</p>
              </div>
            </Link>
          </div>

        </div>
      </header>

      {/* ── Sidebar + Content row ── */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-0 lg:gap-6 xl:gap-8">
        {/* Sticky sidebar */}
        <aside className="hidden w-72 shrink-0 lg:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto p-6">
          <Sidebar onCreateEvent={onCreateEvent} onSignOut={signOut} userName={user?.full_name || 'Người dùng'} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 transition-opacity duration-300">
            {children}
          </main>

          <footer className="border-t border-slate-200/80 dark:border-slate-700/80 px-4 py-4 text-center text-xs text-slate-500 dark:text-slate-400 sm:px-6 lg:px-8">
            Designed for fast planning, clean structure, and smooth demo presentation.
          </footer>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
          <div className="absolute left-0 top-0 h-full w-[86vw] max-w-sm p-4">
            <Sidebar onCreateEvent={onCreateEvent} onSignOut={signOut} userName={user?.full_name || 'Người dùng'} mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<EventItem[]>([]);
  const [notifyMinutes, setNotifyMinutes] = useState(() => {
    return Number(localStorage.getItem('calendar_pro_notify_minutes') || '30');
  });
  const [showSettings, setShowSettings] = useState(false);
  const { t, lang } = useLang();
  const { pushToast } = useToast();

  const getNotificationPhase = (event: EventItem) => {
    const start = new Date(`${event.event_date}T${event.start_time.slice(0, 5)}:00`);
    const end = new Date(`${event.event_date}T${event.end_time.slice(0, 5)}:00`);
    const now = new Date();

    return start <= now && end >= now ? 'ongoing' : 'upcoming';
  };

  useEffect(() => {
    let mounted = true;
    const storageKey = 'calendar_pro_notified_ids';

    const notify = async () => {
      try {
        const data = await getUpcomingNotifications(notifyMinutes);
        if (!mounted) return;
        setItems(data);

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const seen = new Set<string>(JSON.parse(localStorage.getItem(storageKey) || '[]'));
          const nextSeen = new Set(seen);

          data.forEach((event) => {
            const phase = getNotificationPhase(event);
            const id = `${getEventId(event)}:${phase}`;
            if (nextSeen.has(id)) return;

            if (phase === 'ongoing') {
              const timeLabel = format(new Date(event.event_date), 'dd/MM/yyyy') + ' - ' + formatTimeRange(event.start_time, event.end_time);
              new Notification(lang === 'ja' ? 'イベントが進行中です' : 'Sự kiện đang diễn ra', {
                body: `${event.title} - ${timeLabel}`,
              });
              nextSeen.add(id);
              return;
            }

            const timeLabel = format(new Date(event.event_date), 'dd/MM/yyyy') + ' • ' + formatTimeRange(event.start_time, event.end_time);
            new Notification('Sự kiện sắp diễn ra', {
              body: `${event.title} — ${timeLabel}`,
            });
            nextSeen.add(id);
          });

          localStorage.setItem(storageKey, JSON.stringify(Array.from(nextSeen).slice(-200)));
        }
      } catch (error) {
        pushToast({
          title: lang === 'ja' ? '通知を読み込めません' : 'Không thể tải thông báo',
          description: error instanceof Error ? error.message : (lang === 'ja' ? 'もう一度お試しください' : 'Vui lòng thử lại'),
          variant: 'error',
        });
      }
    };

    void notify();
    const timer = window.setInterval(() => void notify(), 60_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [lang, notifyMinutes, pushToast]);

  const requestPermission = async () => {
    setOpen((current) => !current);

    if (typeof window === 'undefined' || !('Notification' in window)) {
      pushToast({
        title: lang === 'ja' ? 'ブラウザ通知は未対応です' : 'Trình duyệt không hỗ trợ thông báo',
        variant: 'warning',
      });
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        pushToast({
          title: lang === 'ja' ? '通知を有効にしました' : 'Đã bật thông báo',
          description: lang === 'ja' ? '予定が近づくと通知します。' : 'Bạn sẽ được nhắc khi sự kiện sắp diễn ra.',
          variant: 'success',
        });
      }
    }

    if (Notification.permission === 'denied') {
      pushToast({
        title: lang === 'ja' ? '通知がブロックされています' : 'Thông báo đang bị chặn',
        description: lang === 'ja' ? 'ブラウザ設定でこのサイトの通知を許可してください。' : 'Hãy bật quyền thông báo cho trang này trong cài đặt trình duyệt.',
        variant: 'warning',
      });
    }
  };

  const handleSetMinutes = (mins: number) => {
    setNotifyMinutes(mins);
    localStorage.setItem('calendar_pro_notify_minutes', String(mins));
    setShowSettings(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={requestPermission}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:border-brand-200 hover:text-brand-600"
        aria-label="Thông báo"
      >
        <Bell className="h-5 w-5" />
        {items.length > 0 ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-800" /> : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-40 w-96 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{t('notifications')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('notifyWindow')}: {notifyMinutes} {t('minutes')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSettings((s) => !s)}
                className="rounded-xl border border-slate-200 dark:border-slate-600 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                ⚙️ {lang === 'ja' ? '設定' : 'Cài đặt'}
              </button>
              <Badge tone="brand">{items.length}</Badge>
            </div>
          </div>

          {showSettings && (
            <div className="border-b border-slate-100 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-900">
              <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{t('notifyWindow')}:</p>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 30, 60, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleSetMinutes(mins)}
                    className={cn(
                      'rounded-xl px-3 py-1.5 text-xs font-medium transition',
                      notifyMinutes === mins
                        ? 'bg-slate-950 dark:bg-brand-600 text-white'
                        : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-brand-300'
                    )}
                  >
                    {mins} {t('minutes')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto p-3">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {lang === 'ja'
                  ? `${notifyMinutes}分以内のイベントはありません。`
                  : `Không có sự kiện nào trong ${notifyMinutes} phút tới.`}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((event) => (
                  <div key={getEventId(event)} className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-slate-950 dark:bg-brand-600 p-2 text-white">
                        <Clock3 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{event.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{format(new Date(event.event_date), 'dd/MM/yyyy')} • {formatTimeRange(event.start_time, event.end_time)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Sidebar({
  onCreateEvent,
  onSignOut,
  userName,
  mobile = false,
  onClose,
}: {
  onCreateEvent: () => void;
  onSignOut: () => Promise<void> | void;
  userName: string;
  mobile?: boolean;
  onClose?: () => void;
}) {
  const { t, lang } = useLang();
  return (
    <Card className={cn('flex h-full flex-col overflow-hidden dark:bg-slate-800 dark:border-slate-700', mobile && 'shadow-2xl')}>
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">{t('calendarPro')}</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{t('plannerWorkspace')}</h2>
        </div>
        {mobile ? (
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900" aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="space-y-2 px-4 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/app'}
              className={({ isActive }) => cn(
                'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                isActive ? 'bg-slate-950 dark:bg-brand-600 text-white shadow-glow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
              )}
              onClick={onClose}
            >
              <Icon className="h-4 w-4" />
              <span>{lang === 'ja' ? item.labelJa : item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="mt-auto border-t border-slate-100 dark:border-slate-700 p-4">
        <div className="rounded-3xl bg-slate-950 dark:bg-slate-950 p-5 text-white">
          <p className="text-sm text-slate-300">{t('greetUser')}</p>
          <h3 className="mt-1 text-lg font-semibold">{userName}</h3>
          <p className="mt-2 text-sm text-slate-400">{t('manageDesc')}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1 border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={onCreateEvent}>
              <Plus className="h-4 w-4" />
              {t('newEvent')}
            </Button>
            <Button variant="ghost" className="border border-white/10 text-white hover:bg-white/10" onClick={onSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
