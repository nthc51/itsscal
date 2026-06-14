import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'vi' | 'ja';

const translations = {
  vi: {
    dashboard: 'Dashboard',
    calendar: 'Lịch tháng',
    events: 'Sự kiện',
    profile: 'Hồ sơ',
    addEvent: 'Thêm sự kiện',
    search: 'Tìm kiếm theo tiêu đề, tag, mô tả...',
    all: 'Tất cả',
    today: 'Hôm nay',
    thisWeek: 'Tuần này',
    thisMonth: 'Tháng này',
    completed: 'Hoàn thành',
    study: 'Học tập',
    deadline: 'Deadline',
    partTime: 'Làm thêm',
    deadlineExpired: 'Quá hạn',
    deadlineToday: 'Hôm nay',
    deadlineUpcoming: 'Sắp đến',
    createEvent: 'Tạo sự kiện mới',
    editEvent: 'Chỉnh sửa sự kiện',
    save: 'Lưu thay đổi',
    cancel: 'Huỷ',
    delete: 'Xoá',
    edit: 'Sửa',
    complete: 'Hoàn thành',
    title: 'Tiêu đề',
    description: 'Mô tả',
    type: 'Loại',
    date: 'Ngày',
    startTime: 'Giờ bắt đầu',
    endTime: 'Giờ kết thúc',
    location: 'Địa điểm',
    priority: 'Độ ưu tiên',
    tag: 'Tag',
    recurrence: 'Lặp lại',
    noEvents: 'Chưa có sự kiện nào',
    todayFocus: 'Mục tiêu hôm nay',
    ongoing: 'Đang diễn ra',
    passed: 'Đã qua',
    upcoming: 'Sắp bắt đầu',
    notifications: 'Thông báo',
    language: 'Ngôn ngữ',
    high: 'Cao',
    medium: 'Trung bình',
    low: 'Thấp',
    notRepeat: 'Không lặp',
    daily: 'Hằng ngày',
    weekly: 'Hằng tuần',
    monthly: 'Hằng tháng',
    page: 'Trang',
    of: 'của',
    prev: 'Trước',
    next: 'Sau',
    signOut: 'Đăng xuất',
    greetUser: 'Xin chào',
    noDescription: 'Không có mô tả',
    conflictWarning: 'Trùng lịch với sự kiện hiện có',
    viewCalendar: 'Xem lịch',
    viewList: 'Xem danh sách',
    exportExcel: 'Xuất Excel',
    newEvent: 'Mới',
    plannerWorkspace: 'Planner Workspace',
    calendarPro: 'Calendar Pro',
    manageDesc: 'Quản lý lịch học, deadline và công việc cá nhân trong cùng một nơi.',
    noDeadlinePending: 'Không có deadline pending',
    allDeadlinesHandled: 'Mọi deadline hiện tại đều đã được xử lý.',
    noTodayGoal: 'Chưa có mục tiêu hôm nay',
    createScheduleSuggestion: 'Hãy tạo lịch để hệ thống đề xuất ưu tiên.',
    freeTimeSlots: 'Khoảng trống trong ngày',
    freeSuggestion: 'Gợi ý thời gian rảnh',
    noFreeTime: 'Không có khoảng trống đủ lớn',
    busyDay: 'Lịch hôm nay khá kín hoặc chỉ còn các khoảng rất ngắn.',
    minBefore: 'phút trước',
    notifyWindow: 'Thông báo trước',
    minutes: 'phút',
  },
  ja: {
    dashboard: 'ダッシュボード',
    calendar: '月間カレンダー',
    events: 'イベント',
    profile: 'プロフィール',
    addEvent: 'イベント追加',
    search: 'タイトル、タグ、説明で検索...',
    all: 'すべて',
    today: '今日',
    thisWeek: '今週',
    thisMonth: '今月',
    completed: '完了済み',
    study: '学習',
    deadline: '締め切り',
    partTime: 'アルバイト',
    deadlineExpired: '期限切れ',
    deadlineToday: '本日締め切り',
    deadlineUpcoming: '近日締め切り',
    createEvent: '新しいイベントを作成',
    editEvent: 'イベントを編集',
    save: '変更を保存',
    cancel: 'キャンセル',
    delete: '削除',
    edit: '編集',
    complete: '完了にする',
    title: 'タイトル',
    description: '説明',
    type: '種類',
    date: '日付',
    startTime: '開始時間',
    endTime: '終了時間',
    location: '場所',
    priority: '優先度',
    tag: 'タグ',
    recurrence: '繰り返し',
    noEvents: 'イベントがありません',
    todayFocus: '今日の目標',
    ongoing: '進行中',
    passed: '終了',
    upcoming: 'もうすぐ開始',
    notifications: '通知',
    language: '言語',
    high: '高',
    medium: '中',
    low: '低',
    notRepeat: '繰り返しなし',
    daily: '毎日',
    weekly: '毎週',
    monthly: '毎月',
    page: 'ページ',
    of: '/',
    prev: '前へ',
    next: '次へ',
    signOut: 'サインアウト',
    greetUser: 'こんにちは',
    noDescription: '説明なし',
    conflictWarning: '既存のイベントと時間が重複しています',
    viewCalendar: 'カレンダーを見る',
    viewList: 'リストを見る',
    exportExcel: 'Excelで出力',
    newEvent: '新規',
    plannerWorkspace: 'プランナー',
    calendarPro: 'Calendar Pro',
    manageDesc: '学習スケジュール、締め切り、個人の仕事をまとめて管理。',
    noDeadlinePending: '未処理の締め切りなし',
    allDeadlinesHandled: 'すべての締め切りが処理されました。',
    noTodayGoal: '今日の目標なし',
    createScheduleSuggestion: 'スケジュールを作成してシステムから提案を受け取りましょう。',
    freeTimeSlots: '今日の空き時間',
    freeSuggestion: '空き時間の提案',
    noFreeTime: '十分な空き時間がありません',
    busyDay: '今日のスケジュールはかなり詰まっているか、短い隙間しかありません。',
    minBefore: '分前',
    notifyWindow: '事前通知',
    minutes: '分',
  },
} as const;

export type TranslationKey = keyof typeof translations.vi;

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextValue | undefined>(undefined);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('calendar_pro_lang') as Lang) || 'vi';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('calendar_pro_lang', l);
  };

  const t = (key: TranslationKey): string => translations[lang][key] as string;

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
