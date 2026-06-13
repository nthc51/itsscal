import type { EventItem } from '@/types/event';

export function getEventId(event: Pick<EventItem, 'id' | '_id'>) {
  return String(event.id ?? event._id);
}
