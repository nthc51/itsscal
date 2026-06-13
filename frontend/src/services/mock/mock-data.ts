import type { EventItem } from '@/types/event';
import { format, addDays, subDays } from 'date-fns';

export const IS_MOCK = import.meta.env.VITE_MOCK_MODE === 'true';

const today = format(new Date(), 'yyyy-MM-dd');
const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
const in2days = format(addDays(new Date(), 2), 'yyyy-MM-dd');
const in3days = format(addDays(new Date(), 3), 'yyyy-MM-dd');
const in5days = format(addDays(new Date(), 5), 'yyyy-MM-dd');
const in7days = format(addDays(new Date(), 7), 'yyyy-MM-dd');
const in10days = format(addDays(new Date(), 10), 'yyyy-MM-dd');
const sub3days = format(subDays(new Date(), 3), 'yyyy-MM-dd');
const sub5days = format(subDays(new Date(), 5), 'yyyy-MM-dd');

export const MOCK_USER = {
  user_id: 'mock-user-001',
  full_name: 'Nguyễn Văn Demo',
  email: 'demo@itss2.vn',
};

export const MOCK_TOKEN = 'mock-jwt-token-for-demo-mode';

function isAllDayEvent(event: Pick<EventItem, 'type' | 'start_time' | 'end_time'>): boolean {
  return event.type === 'holiday' || (event.start_time.slice(0, 5) === '00:00' && event.end_time.slice(0, 5) === '23:59');
}

function findTimeConflict(payload: import('@/types/event').EventPayload, excludeId?: string): EventItem | undefined {
  const candidate = {
    type: payload.type,
    start_time: payload.start_time,
    end_time: payload.end_time,
  };

  if (isAllDayEvent(candidate)) return undefined;

  const payloadStart = payload.start_time.slice(0, 5);
  const payloadEnd = payload.end_time.slice(0, 5);

  return mockEvents.find((event) => {
    const eventId = String(event._id || event.id);
    if (excludeId && eventId === excludeId) return false;
    if (event.event_date !== payload.event_date) return false;
    if (isAllDayEvent(event)) return false;

    return event.start_time.slice(0, 5) < payloadEnd && event.end_time.slice(0, 5) > payloadStart;
  });
}

let mockEvents: EventItem[] = [
  {
    _id: 'evt-001',
    user_id: 'mock-user-001',
    title: 'Giải tích - Chương 5: Tích phân',
    description: 'Học tích phân xác định, ứng dụng tính diện tích',
    type: 'hoc',
    tag_label: 'Giải tích',
    event_date: today,
    start_time: '07:30:00',
    end_time: '09:30:00',
    location: 'P.302 - Nhà B',
    is_completed: false,
    deadline: null,
    recurrence_frequency: 'weekly',
    recurrence_interval: 1,
    created_at: sub5days + 'T08:00:00Z',
  },
  {
    _id: 'evt-002',
    user_id: 'mock-user-001',
    title: 'Lập trình Web - React & TypeScript',
    description: 'Học React hooks, state management, TypeScript types',
    type: 'hoc',
    tag_label: 'ITSS2',
    event_date: today,
    start_time: '13:00:00',
    end_time: '15:00:00',
    location: 'Phòng Lab 201',
    is_completed: false,
    deadline: null,
    recurrence_frequency: 'weekly',
    recurrence_interval: 1,
    created_at: sub5days + 'T09:00:00Z',
  },
  {
    _id: 'evt-003',
    user_id: 'mock-user-001',
    title: 'Nộp báo cáo ITSS - Sprint 3',
    description: 'Deadline nộp báo cáo cuối Sprint 3 lên Moodle, bao gồm demo video và slide thuyết trình',
    type: 'deadline',
    tag_label: 'ITSS2',
    event_date: tomorrow,
    start_time: '23:00:00',
    end_time: '23:59:00',
    location: 'Online - Moodle',
    is_completed: false,
    deadline: {
      due_datetime: tomorrow + 'T23:59:00',
      priority: 'high',
      is_completed: false,
      completed_at: null,
    },
    created_at: sub3days + 'T10:00:00Z',
  },
  {
    _id: 'evt-004',
    user_id: 'mock-user-001',
    title: 'Làm thêm - Quán cafe The Coffee House',
    description: 'Ca chiều, phục vụ bàn và pha chế',
    type: 'lam_them',
    tag_label: 'Part-time',
    event_date: today,
    start_time: '17:00:00',
    end_time: '21:00:00',
    location: 'The Coffee House - Nguyễn Trãi',
    is_completed: false,
    deadline: null,
    recurrence_frequency: 'weekly',
    recurrence_interval: 1,
    created_at: sub5days + 'T11:00:00Z',
  },
  {
    _id: 'evt-005',
    user_id: 'mock-user-001',
    title: 'Thi cuối kỳ - Giải tích',
    description: 'Thi hết môn Giải tích 1, ôn tập chương 1-7',
    type: 'deadline',
    tag_label: 'Thi cử',
    event_date: in5days,
    start_time: '07:00:00',
    end_time: '09:00:00',
    location: 'Hội trường A - Tầng 1',
    is_completed: false,
    deadline: {
      due_datetime: in5days + 'T09:00:00',
      priority: 'high',
      is_completed: false,
      completed_at: null,
    },
    created_at: sub5days + 'T12:00:00Z',
  },
  {
    _id: 'evt-006',
    user_id: 'mock-user-001',
    title: 'Vật lý - Điện từ trường',
    description: 'Lý thuyết Maxwell, sóng điện từ',
    type: 'hoc',
    tag_label: 'Vật lý',
    event_date: tomorrow,
    start_time: '09:00:00',
    end_time: '11:00:00',
    location: 'P.205 - Nhà C',
    is_completed: false,
    deadline: null,
    recurrence_frequency: 'weekly',
    recurrence_interval: 1,
    created_at: sub5days + 'T13:00:00Z',
  },
  {
    _id: 'evt-007',
    user_id: 'mock-user-001',
    title: 'Họp nhóm ITSS - Review code',
    description: 'Review pull request, phân công task tuần sau, cập nhật tiến độ dự án',
    type: 'hoc',
    tag_label: 'ITSS2',
    event_date: in2days,
    start_time: '14:00:00',
    end_time: '16:00:00',
    location: 'Online - Google Meet',
    is_completed: false,
    deadline: null,
    created_at: sub3days + 'T14:00:00Z',
  },
  {
    _id: 'evt-008',
    user_id: 'mock-user-001',
    title: 'Bài tập lớn Vật lý',
    description: 'Nộp bài tập lớn về điện từ - 10 bài toán',
    type: 'deadline',
    tag_label: 'Vật lý',
    event_date: in3days,
    start_time: '23:00:00',
    end_time: '23:59:00',
    location: 'Email giảng viên',
    is_completed: false,
    deadline: {
      due_datetime: in3days + 'T23:59:00',
      priority: 'medium',
      is_completed: false,
      completed_at: null,
    },
    created_at: sub3days + 'T15:00:00Z',
  },
  {
    _id: 'evt-009',
    user_id: 'mock-user-001',
    title: 'Ôn tập Giải tích - Nhóm học',
    description: 'Ôn tập cùng nhóm, giải đề cương, làm bài tập mẫu',
    type: 'hoc',
    tag_label: 'Giải tích',
    event_date: in3days,
    start_time: '19:00:00',
    end_time: '21:30:00',
    location: 'Thư viện - Tầng 3',
    is_completed: false,
    deadline: null,
    created_at: sub3days + 'T16:00:00Z',
  },
  {
    _id: 'evt-010',
    user_id: 'mock-user-001',
    title: 'Làm thêm - Gia sư Toán',
    description: 'Dạy Toán lớp 11 cho học sinh THPT Chu Văn An',
    type: 'lam_them',
    tag_label: 'Gia sư',
    event_date: in2days,
    start_time: '08:00:00',
    end_time: '10:00:00',
    location: 'Nhà học sinh - 45 Hoàng Diệu',
    is_completed: false,
    deadline: null,
    recurrence_frequency: 'weekly',
    recurrence_interval: 1,
    created_at: sub3days + 'T17:00:00Z',
  },
  {
    _id: 'evt-011',
    user_id: 'mock-user-001',
    title: 'Kiểm tra giữa kỳ - Lập trình Web',
    description: 'Kiểm tra 1 tiết, nội dung từ tuần 1-7',
    type: 'deadline',
    tag_label: 'ITSS2',
    event_date: in7days,
    start_time: '13:00:00',
    end_time: '14:30:00',
    location: 'P.302 - Nhà B',
    is_completed: false,
    deadline: {
      due_datetime: in7days + 'T14:30:00',
      priority: 'high',
      is_completed: false,
      completed_at: null,
    },
    created_at: sub5days + 'T18:00:00Z',
  },
  {
    _id: 'evt-012',
    user_id: 'mock-user-001',
    title: 'Tiếng Anh - Speaking Practice',
    description: 'Luyện nói với giáo viên nước ngoài, chủ đề: Technology',
    type: 'hoc',
    tag_label: 'Tiếng Anh',
    event_date: yesterday,
    start_time: '15:00:00',
    end_time: '16:00:00',
    location: 'Trung tâm Ngoại ngữ - Tầng 2',
    is_completed: true,
    completed_at: yesterday + 'T16:05:00Z',
    deadline: null,
    created_at: sub5days + 'T19:00:00Z',
  },
  {
    _id: 'evt-013',
    user_id: 'mock-user-001',
    title: 'Làm thêm - Quán cafe The Coffee House',
    description: 'Ca sáng cuối tuần',
    type: 'lam_them',
    tag_label: 'Part-time',
    event_date: in5days,
    start_time: '07:00:00',
    end_time: '11:00:00',
    location: 'The Coffee House - Nguyễn Trãi',
    is_completed: false,
    deadline: null,
    recurrence_frequency: 'weekly',
    recurrence_interval: 1,
    created_at: sub5days + 'T20:00:00Z',
  },
  {
    _id: 'evt-014',
    user_id: 'mock-user-001',
    title: 'Giải tích - Chương 6: Phương trình vi phân',
    description: 'Bài giảng lý thuyết và bài tập',
    type: 'hoc',
    tag_label: 'Giải tích',
    event_date: in7days,
    start_time: '07:30:00',
    end_time: '09:30:00',
    location: 'P.302 - Nhà B',
    is_completed: false,
    deadline: null,
    recurrence_frequency: 'weekly',
    recurrence_interval: 1,
    created_at: sub5days + 'T21:00:00Z',
  },
  {
    _id: 'evt-015',
    user_id: 'mock-user-001',
    title: 'Nộp project cuối khoá - ITSS2',
    description: 'Deadline cuối cùng nộp toàn bộ source code, báo cáo và video demo lên Github và Moodle',
    type: 'deadline',
    tag_label: 'ITSS2',
    event_date: in10days,
    start_time: '23:00:00',
    end_time: '23:59:00',
    location: 'Online - GitHub + Moodle',
    is_completed: false,
    deadline: {
      due_datetime: in10days + 'T23:59:00',
      priority: 'high',
      is_completed: false,
      completed_at: null,
    },
    created_at: sub5days + 'T22:00:00Z',
  },
];

// ---------- CRUD helpers ----------

export function getMockEvents(): EventItem[] {
  return [...mockEvents].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );
}

export function getMockTodayEvents(): EventItem[] {
  return mockEvents.filter((e) => e.event_date === today);
}

export function getMockDeadlines(): EventItem[] {
  return mockEvents
    .filter((e) => e.type === 'deadline' && !e.deadline?.is_completed)
    .sort((a, b) => {
      const da = a.deadline?.due_datetime ?? '';
      const db = b.deadline?.due_datetime ?? '';
      return da.localeCompare(db);
    });
}

export function getMockMonthEvents(year: number, month: number): EventItem[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return mockEvents.filter((e) => e.event_date.startsWith(prefix));
}

export function getMockWeekEvents(weekStart: string, weekEnd: string): EventItem[] {
  return mockEvents.filter((e) => e.event_date >= weekStart && e.event_date <= weekEnd);
}

export function getMockEventById(id: string): EventItem | undefined {
  return mockEvents.find((e) => e._id === id || String(e.id) === id);
}

export function createMockEvent(payload: import('@/types/event').EventPayload): EventItem {
  const newId = `evt-${Date.now()}`;
  const newEvent: EventItem = {
    _id: newId,
    user_id: 'mock-user-001',
    title: payload.title,
    description: payload.description,
    type: payload.type,
    tag_label: payload.tag_label,
    event_date: payload.event_date,
    start_time: payload.start_time + ':00',
    end_time: payload.end_time + ':00',
    location: payload.location,
    is_completed: false,
    deadline: payload.type === 'deadline'
      ? {
          due_datetime: payload.event_date + 'T' + payload.end_time + ':00',
          priority: payload.priority ?? 'medium',
          is_completed: false,
          completed_at: null,
        }
      : null,
    recurrence_frequency: payload.recurrence_frequency ?? 'none',
    recurrence_interval: payload.recurrence_interval ?? 1,
    recurrence_until_date: payload.recurrence_until_date ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const conflict = findTimeConflict(payload, newId);
  if (conflict) {
    throw new Error(`Trùng lịch với: ${conflict.title} (${conflict.start_time.slice(0,5)}-${conflict.end_time.slice(0,5)})`);
  }
  mockEvents = [newEvent, ...mockEvents];
  return newEvent;
}

export function updateMockEvent(id: string, payload: import('@/types/event').EventPayload): EventItem {
  const idx = mockEvents.findIndex((e) => e._id === id || String(e.id) === id);
  if (idx === -1) throw new Error('Không tìm thấy sự kiện');
  const conflict = findTimeConflict(payload, id);
  if (conflict) {
    throw new Error(`Trùng lịch với: ${conflict.title} (${conflict.start_time.slice(0,5)}-${conflict.end_time.slice(0,5)})`);
  }
  const updated: EventItem = {
    ...mockEvents[idx],
    title: payload.title,
    description: payload.description,
    type: payload.type,
    tag_label: payload.tag_label,
    event_date: payload.event_date,
    start_time: payload.start_time + ':00',
    end_time: payload.end_time + ':00',
    location: payload.location,
    deadline: payload.type === 'deadline'
      ? {
          due_datetime: payload.event_date + 'T' + payload.end_time + ':00',
          priority: payload.priority ?? 'medium',
          is_completed: mockEvents[idx].deadline?.is_completed ?? false,
          completed_at: mockEvents[idx].deadline?.completed_at ?? null,
        }
      : null,
    recurrence_frequency: payload.recurrence_frequency ?? 'none',
    recurrence_interval: payload.recurrence_interval ?? 1,
    recurrence_until_date: payload.recurrence_until_date ?? null,
    updated_at: new Date().toISOString(),
  };
  mockEvents = mockEvents.map((e, i) => (i === idx ? updated : e));
  return updated;
}

export function deleteMockEvent(id: string): void {
  mockEvents = mockEvents.filter((e) => e._id !== id && String(e.id) !== id);
}

export function toggleMockEventCompletion(id: string): EventItem {
  const idx = mockEvents.findIndex((e) => e._id === id || String(e.id) === id);
  if (idx === -1) throw new Error('Không tìm thấy sự kiện');
  const current = mockEvents[idx];
  const updated = {
    ...current,
    is_completed: !current.is_completed,
    completed_at: !current.is_completed ? new Date().toISOString() : null,
    deadline: current.deadline
      ? { ...current.deadline, is_completed: !current.is_completed }
      : null,
  };
  mockEvents = mockEvents.map((e, i) => (i === idx ? updated : e));
  return updated;
}

export function getMockNotifications(minutes: number): EventItem[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + minutes * 60 * 1000);
  return mockEvents.filter((e) => {
    const eventStart = new Date(e.event_date + 'T' + e.start_time);
    return eventStart >= now && eventStart <= cutoff && !e.is_completed;
  });
}
