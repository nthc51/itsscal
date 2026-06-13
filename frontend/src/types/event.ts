export type EventType = 'hoc' | 'deadline' | 'lam_them' | 'holiday';
export type EventPriority = 'low' | 'medium' | 'high';
export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly';

export interface DeadlineInfo {
  due_datetime: string;
  priority: EventPriority;
  is_completed: boolean;
  completed_at: string | null;
}

export interface EventItem {
  id?: string | number;
  _id: string;
  user_id: string;
  title: string;
  description: string;
  type: EventType;
  tag_label: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  is_completed?: boolean;
  completed_at?: string | null;
  deadline: DeadlineInfo | null;
  recurrence_frequency?: RecurrenceFrequency;
  recurrence_interval?: number;
  recurrence_until_date?: string | null;
  recurrence_group_key?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventPayload {
  title: string;
  description: string;
  type: EventType;
  tag_label: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  priority?: EventPriority;
  recurrence_frequency?: RecurrenceFrequency;
  recurrence_interval?: number;
  recurrence_until_date?: string | null;
}

export interface MonthParams {
  year: number;
  month: number;
}

export interface WeekParams {
  week_start: string;
  week_end: string;
}