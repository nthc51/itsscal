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
  const response = await request<EventItem[]>({
    url: '/event/notifications',
    method: 'GET',
    params: { minutes },
  });
  return response.data;
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