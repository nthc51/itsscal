export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const STORAGE_KEYS = {
  token: 'calendar_pro_token',
  user: 'calendar_pro_user',
} as const;

export const NAV_ITEMS = [
  { label: 'Dashboard',   labelJa: 'ダッシュボード', href: '/app',          icon: 'LayoutDashboard' },
  { label: 'Lịch tháng', labelJa: '月間カレンダー', href: '/app/calendar',  icon: 'CalendarRange'   },
  { label: 'Sự kiện',    labelJa: 'イベント',       href: '/app/events',    icon: 'ListTodo'        },
  { label: 'Hồ sơ',      labelJa: 'プロフィール',   href: '/app/profile',   icon: 'UserCircle2'     },
] as const;