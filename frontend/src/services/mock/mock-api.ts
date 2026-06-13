/**
 * MOCK MODE — bật/tắt bằng env var VITE_MOCK_MODE=true
 * Khi bật: toàn bộ API call được thay bằng dữ liệu giả, không cần backend.
 */
import type { EventItem, EventPayload, MonthParams } from '@/types/event';
import {
  getMockEvents,
  getMockTodayEvents,
  getMockDeadlines,
  getMockMonthEvents,
  getMockWeekEvents,
  getMockEventById,
  createMockEvent,
  updateMockEvent,
  deleteMockEvent,
  toggleMockEventCompletion,
  getMockNotifications,
} from './mock-data';

const delay = (ms = 30) => new Promise((r) => setTimeout(r, ms));

export const mockApi = {
  getAllEvents: async (): Promise<EventItem[]> => {
    await delay();
    return getMockEvents();
  },
  getTodayEvents: async (): Promise<EventItem[]> => {
    await delay();
    return getMockTodayEvents();
  },
  getUpcomingDeadlines: async (): Promise<EventItem[]> => {
    await delay();
    return getMockDeadlines();
  },
  getMonthEvents: async ({ year, month }: MonthParams): Promise<EventItem[]> => {
    await delay();
    return getMockMonthEvents(year, month);
  },
  getWeekEvents: async (weekStart: string, weekEnd: string): Promise<EventItem[]> => {
    await delay();
    return getMockWeekEvents(weekStart, weekEnd);
  },
  getEventById: async (id: string): Promise<EventItem> => {
    await delay();
    const ev = getMockEventById(id);
    if (!ev) throw new Error('Không tìm thấy sự kiện');
    return ev;
  },
  createEvent: async (payload: EventPayload): Promise<EventItem> => {
    await delay(300);
    return createMockEvent(payload);
  },
  updateEvent: async (id: string, payload: EventPayload): Promise<EventItem> => {
    await delay(300);
    return updateMockEvent(id, payload);
  },
  deleteEvent: async (id: string): Promise<void> => {
    await delay(200);
    deleteMockEvent(id);
  },
  toggleEventCompletion: async (id: string): Promise<EventItem> => {
    await delay(200);
    return toggleMockEventCompletion(id);
  },
  getUpcomingNotifications: async (minutes: number): Promise<EventItem[]> => {
    await delay(100);
    return getMockNotifications(minutes);
  },
};
