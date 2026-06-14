const { Op } = require('sequelize');
const { addDays, addMonths, addWeeks, format } = require('date-fns');
const Event = require('../models/Event');
const RecurrenceSeries = require('../models/RecurrenceSeries');

// Helper: is all-day event (no time conflict needed)
const isAllDayEvent = (type, start_time, end_time) =>
  type === 'holiday' || (String(start_time).slice(0, 5) === '00:00' && String(end_time).slice(0, 5) === '23:59');

// Helper: check time conflicts (excludes all-day events from both sides)
const checkConflict = async (user_id, event_date, start_time, end_time, exclude_id = null) => {
  const where = {
    user_id,
    event_date,
    start_time: { [Op.lt]: end_time },
    end_time:   { [Op.gt]: start_time },
    [Op.and]: [
      { type: { [Op.ne]: 'holiday' } },
      {
        [Op.not]: {
          start_time: { [Op.in]: ['00:00', '00:00:00'] },
          end_time: { [Op.in]: ['23:59', '23:59:00'] },
        },
      },
    ],
  };
  if (exclude_id) where.id = { [Op.ne]: exclude_id };

  return await Event.findAll({ where, attributes: ['id', 'title', 'start_time', 'end_time'] });
};

const normalizeEvent = (event) => {
  if (!event) return event;

  const plain = typeof event.get === 'function' ? event.get({ plain: true }) : { ...event };

  return {
    ...plain,
    deadline: plain.type === 'deadline'
      ? {
          due_datetime: plain.deadline_due_datetime,
          priority: plain.deadline_priority,
          is_completed: Boolean(plain.deadline_is_completed),
          completed_at: plain.deadline_completed_at,
        }
      : null,
  };
};

const normalizeEvents = (events) => events.map(normalizeEvent);

const parseVietnamDateTime = (date, time) => {
  const [year, month, day] = String(date).slice(0, 10).split('-').map(Number);
  const [hour = 0, minute = 0, second = 0] = String(time || '00:00:00').split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second));
};

const throwIfConflict = (conflicts) => {
  if (conflicts.length > 0) {
    const names = conflicts
      .map((e) => `"${e.title}" (${e.start_time} - ${e.end_time})`)
      .join(', ');
    throw new Error(`Trùng lịch với: ${names}`);
  }
};

// Create
const createEvent = async (data) => {
  const {
    user_id,
    title,
    description,
    type,
    tag_label,
    event_date,
    start_time,
    end_time,
    location,
    priority,
    recurrence_frequency = 'none',
    recurrence_interval = 1,
    recurrence_until_date = null,
  } = data;

  const recurrenceFrequency = ['daily', 'weekly', 'monthly'].includes(recurrence_frequency) ? recurrence_frequency : 'none';
  const recurrenceInterval = Number.isFinite(Number(recurrence_interval)) ? Math.max(1, Number(recurrence_interval)) : 1;
  const groupKey = recurrenceFrequency === 'none' ? null : `${user_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let seriesRecord = null;
  if (recurrenceFrequency !== 'none') {
    seriesRecord = await RecurrenceSeries.create({
      user_id,
      title,
      description,
      type,
      tag_label,
      start_date: event_date,
      start_time,
      end_time,
      location,
      recurrence_frequency: recurrenceFrequency,
      recurrence_interval: recurrenceInterval,
      recurrence_until_date,
    });
  }

  const buildPayload = (date) => ({
    user_id,
    title,
    description,
    type,
    tag_label,
    event_date: date,
    start_time,
    end_time,
    location,
    recurrence_series_id: seriesRecord?.id || null,
    recurrence_frequency: recurrenceFrequency,
    recurrence_interval: recurrenceInterval,
    recurrence_until_date,
    recurrence_group_key: groupKey,
    ...(type === 'deadline'
      ? {
          deadline_due_datetime: new Date(`${date}T${end_time}`),
          deadline_priority: priority || 'medium',
          deadline_is_completed: false,
          deadline_completed_at: null,
        }
      : {}),
  });

  const dates = [event_date];
  if (recurrenceFrequency !== 'none' && recurrence_until_date) {
    let cursor = new Date(`${event_date}T00:00:00`);
    const until = new Date(`${recurrence_until_date}T23:59:59`);
    while (true) {
      if (recurrenceFrequency === 'daily') cursor = addDays(cursor, recurrenceInterval);
      else if (recurrenceFrequency === 'weekly') cursor = addWeeks(cursor, recurrenceInterval);
      else cursor = addMonths(cursor, recurrenceInterval);

      if (cursor > until) break;
      dates.push(format(cursor, 'yyyy-MM-dd'));
    }
  }

  for (const date of dates) {
    // Skip conflict check for all-day events (holiday or 00:00-23:59)
    if (!isAllDayEvent(type, start_time, end_time)) {
      throwIfConflict(await checkConflict(user_id, date, start_time, end_time));
    }
  }

  const created = [];
  for (const date of dates) {
    const newEvent = await Event.create(buildPayload(date));
    created.push(newEvent);
  }
  return normalizeEvent(created[0]);
};

// Read
const getEventById = async (event_id, user_id) => {
  const found = await Event.findOne({ where: { id: event_id, user_id } });
  if (!found) throw new Error('Sự kiện không tồn tại');
  return normalizeEvent(found);
};

const getAllEvents = async (user_id) => {
  const events = await Event.findAll({ where: { user_id }, order: [['event_date', 'ASC'], ['start_time', 'ASC']] });
  return normalizeEvents(events);
};

const getEventsByMonth = async (user_id, year, month) => {
  const p = (n) => String(n).padStart(2, '0');
  const start = `${year}-${p(month)}-01`;
  const end = `${year}-${p(month)}-31`;

  const events = await Event.findAll({
    where: { user_id, event_date: { [Op.gte]: start, [Op.lte]: end } },
    order: [['event_date', 'ASC'], ['start_time', 'ASC']],
  });
  return normalizeEvents(events);
};

const getEventsByWeek = async (user_id, week_start, week_end) => {
  const events = await Event.findAll({
    where: { user_id, event_date: { [Op.gte]: week_start, [Op.lte]: week_end } },
    order: [['event_date', 'ASC'], ['start_time', 'ASC']],
  });
  return normalizeEvents(events);
};

const getEventsToday = async (user_id) => {
  const today = new Date().toISOString().split('T')[0];
  const events = await Event.findAll({ where: { user_id, event_date: today }, order: [['start_time', 'ASC']] });
  return normalizeEvents(events);
};

const getUpcomingDeadlines = async (user_id) => {
  const events = await Event.findAll({
    where: { user_id, type: 'deadline', deadline_is_completed: false },
    order: [['deadline_due_datetime', 'ASC']],
  });
  return normalizeEvents(events);
};

const getUpcomingNotifications = async (user_id, minutes = 30) => {
  const now = new Date();
  const horizon = new Date(now.getTime() + Number(minutes) * 60 * 1000);

  const allEvents = await Event.findAll({
    where: { user_id, is_completed: false, type: { [Op.ne]: 'holiday' } },
    order: [['event_date', 'ASC'], ['start_time', 'ASC']],
  });

  return normalizeEvents(allEvents.filter((event) => {
    const start = parseVietnamDateTime(event.event_date, event.start_time);
    const end = parseVietnamDateTime(event.event_date, event.end_time);
    const reference = event.type === 'deadline' ? end : start;
    const isOngoing = start <= now && end >= now;

    return isOngoing || (start > now && reference >= now && reference <= horizon);
  }));
};

// Update
const updateEvent = async (event_id, user_id, data) => {
  const { title, description, type, tag_label, event_date, start_time, end_time, location, priority } = data;

  const found = await Event.findOne({ where: { id: event_id, user_id } });
  if (!found) throw new Error('Sự kiện không tồn tại');

  // Skip conflict check for all-day events
  if (!isAllDayEvent(type, start_time, end_time)) {
    throwIfConflict(await checkConflict(user_id, event_date, start_time, end_time, event_id));
  }

  const updatePayload = { title, description, type, tag_label, event_date, start_time, end_time, location };

  if (type === 'deadline') {
    if (found.deadline_due_datetime) {
      updatePayload.deadline_due_datetime = new Date(`${event_date}T${end_time}`);
      if (priority) updatePayload.deadline_priority = priority;
    } else {
      updatePayload.deadline_due_datetime = new Date(`${event_date}T${end_time}`);
      updatePayload.deadline_priority = priority || 'medium';
      updatePayload.deadline_is_completed = false;
      updatePayload.deadline_completed_at = null;
    }
  } else {
    updatePayload.deadline_due_datetime = null;
    updatePayload.deadline_priority = null;
    updatePayload.deadline_is_completed = null;
    updatePayload.deadline_completed_at = null;
  }

  await found.update(updatePayload);
  return normalizeEvent(found);
};

// Delete
const deleteEvent = async (event_id, user_id) => {
  const deleted = await Event.destroy({ where: { id: event_id, user_id } });
  if (!deleted) throw new Error('Sự kiện không tồn tại');
};

// Deadline actions
const markDeadlineCompleted = async (event_id, user_id) => {
  const found = await Event.findOne({ where: { id: event_id, user_id, type: 'deadline' } });
  if (!found) throw new Error('Deadline không tồn tại');

  await found.update({ deadline_is_completed: true, deadline_completed_at: new Date(), is_completed: true, completed_at: new Date() });
  return normalizeEvent(found);
};

const toggleEventCompletion = async (event_id, user_id) => {
  const found = await Event.findOne({ where: { id: event_id, user_id } });
  if (!found) throw new Error('Sự kiện không tồn tại');

  const nextCompleted = !found.is_completed;
  const updatePayload = {
    is_completed: nextCompleted,
    completed_at: nextCompleted ? new Date() : null,
  };

  if (found.type === 'deadline') {
    updatePayload.deadline_is_completed = nextCompleted;
    updatePayload.deadline_completed_at = nextCompleted ? new Date() : null;
  }

  await found.update(updatePayload);
  return normalizeEvent(found);
};

const updateDeadlinePriority = async (event_id, user_id, priority) => {
  const found = await Event.findOne({ where: { id: event_id, user_id, type: 'deadline' } });
  if (!found) throw new Error('Deadline không tồn tại');

  await found.update({ deadline_priority: priority });
  return normalizeEvent(found);
};

module.exports = {
  createEvent,
  getEventById,
  getAllEvents,
  getEventsByMonth,
  getEventsByWeek,
  getEventsToday,
  getUpcomingDeadlines,
  getUpcomingNotifications,
  updateEvent,
  deleteEvent,
  markDeadlineCompleted,
  toggleEventCompletion,
  updateDeadlinePriority,
};
