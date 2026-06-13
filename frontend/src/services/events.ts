import { request } from './api/client';
import type { EventItem, EventPayload, EventPriority, MonthParams } from '@/types/event';
import type { ApiResponse } from '@/types/api';
import { mockApi } from './mock/mock-api';
import { IS_MOCK } from './mock/mock-data';

export async function getAllEvents() {
  if (IS_MOCK) return mockApi.getAllEvents();
  const response = await request<EventItem[]>({ url: '/event', method: 'GET' });
  return response.data;
}

export async function getTodayEvents() {
  if (IS_MOCK) return mockApi.getTodayEvents();
  const response = await request<EventItem[]>({ url: '/event/today', method: 'GET' });
  return response.data;
}

export async function getUpcomingDeadlines() {
  if (IS_MOCK) return mockApi.getUpcomingDeadlines();
  const response = await request<EventItem[]>({ url: '/event/deadlines', method: 'GET' });
  return response.data;
}

export async function getUpcomingNotifications(minutes = 30) {
  if (IS_MOCK) return mockApi.getUpcomingNotifications(minutes);
  const response = await request<EventItem[]>({ url: '/event', method: 'GET' });
  const now = new Date();
  const horizon = new Date(now.getTime() + minutes * 60 * 1000);

  const parseLocalDateTime = (date: string, time: string) => {
    const normalizedTime = (time || '00:00').slice(0, 5);
    return new Date(`${date}T${normalizedTime}:00`);
  };

  return response.data
    .filter((event) => !event.is_completed && event.type !== 'holiday')
    .filter((event) => {
      const reference =
        event.type === 'deadline'
          ? parseLocalDateTime(event.event_date, event.end_time)
          : parseLocalDateTime(event.event_date, event.start_time);

      return reference >= now && reference <= horizon;
    })
    .sort((a, b) => {
      const aRef = parseLocalDateTime(a.event_date, a.type === 'deadline' ? a.end_time : a.start_time);
      const bRef = parseLocalDateTime(b.event_date, b.type === 'deadline' ? b.end_time : b.start_time);
      return aRef.getTime() - bRef.getTime();
    });
}

export async function getMonthEvents({ year, month }: MonthParams) {
  if (IS_MOCK) return mockApi.getMonthEvents({ year, month });
  const response = await request<EventItem[]>({
    url: '/event/month',
    method: 'GET',
    params: { year, month },
  });
  return response.data;
}

export async function getWeekEvents(week_start: string, week_end: string) {
  if (IS_MOCK) return mockApi.getWeekEvents(week_start, week_end);
  const response = await request<EventItem[]>({
    url: '/event/week',
    method: 'GET',
    params: { week_start, week_end },
  });
  return response.data;
}

export async function getEventById(id: string) {
  if (IS_MOCK) return mockApi.getEventById(id);
  const response = await request<EventItem>({ url: `/event/${id}`, method: 'GET' });
  return response.data;
}

export async function createEvent(payload: EventPayload) {
  if (IS_MOCK) return mockApi.createEvent(payload);
  const response = await request<EventItem>({ url: '/event', method: 'POST', data: payload });
  return response.data;
}

export async function updateEvent(id: string, payload: EventPayload) {
  if (IS_MOCK) return mockApi.updateEvent(id, payload);
  const response = await request<EventItem>({ url: `/event/${id}`, method: 'PUT', data: payload });
  return response.data;
}

export async function deleteEvent(id: string) {
  if (IS_MOCK) return mockApi.deleteEvent(id);
  await request<null>({ url: `/event/${id}`, method: 'DELETE' });
}

export async function completeDeadline(id: string) {
  const response = await request<EventItem>({ url: `/event/${id}/complete`, method: 'PATCH' });
  return response.data;
}

export async function toggleEventCompletion(id: string) {
  if (IS_MOCK) return mockApi.toggleEventCompletion(id);
  const response = await request<EventItem>({ url: `/event/${id}/complete`, method: 'PATCH' });
  return response.data;
}

export async function updateDeadlinePriority(id: string, priority: EventPriority) {
  const response = await request<EventItem>({
    url: `/event/${id}/priority`,
    method: 'PATCH',
    data: { priority },
  });
  return response.data;
}
