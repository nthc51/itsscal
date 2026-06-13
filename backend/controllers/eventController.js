const eventService = require('../services/eventService');
const { sendRes }  = require('../utils/responseHelper');

const createEvent = async (req, res) => {
  try {
    const data = await eventService.createEvent({ ...req.body, user_id: req.user.user_id });
    sendRes(res, 201, 'Tạo sự kiện thành công', data);
  } catch (err) {
    const status = err.message.startsWith('Trùng lịch') ? 409 : 400;
    sendRes(res, status, 'Tạo sự kiện thất bại', null, err.message);
  }
};

const getEventById = async (req, res) => {
  try {
    const data = await eventService.getEventById(req.params.id, req.user.user_id);
    sendRes(res, 200, 'Lấy sự kiện thành công', data);
  } catch (err) {
    sendRes(res, 404, 'Không tìm thấy sự kiện', null, err.message);
  }
};

const getAllEvents = async (req, res) => {
  try {
    const data = await eventService.getAllEvents(req.user.user_id);
    sendRes(res, 200, 'Lấy danh sách thành công', data);
  } catch (err) {
    sendRes(res, 400, 'Lấy danh sách thất bại', null, err.message);
  }
};

const getEventsByMonth = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return sendRes(res, 400, 'Thiếu year hoặc month');
    const data = await eventService.getEventsByMonth(req.user.user_id, year, month);
    sendRes(res, 200, 'Lấy lịch tháng thành công', data);
  } catch (err) {
    sendRes(res, 400, 'Lấy lịch tháng thất bại', null, err.message);
  }
};

const getEventsByWeek = async (req, res) => {
  try {
    const { week_start, week_end } = req.query;
    if (!week_start || !week_end) return sendRes(res, 400, 'Thiếu week_start hoặc week_end');
    const data = await eventService.getEventsByWeek(req.user.user_id, week_start, week_end);
    sendRes(res, 200, 'Lấy lịch tuần thành công', data);
  } catch (err) {
    sendRes(res, 400, 'Lấy lịch tuần thất bại', null, err.message);
  }
};

const getEventsToday = async (req, res) => {
  try {
    const data = await eventService.getEventsToday(req.user.user_id);
    sendRes(res, 200, 'Lấy lịch hôm nay thành công', data);
  } catch (err) {
    sendRes(res, 400, 'Lấy lịch hôm nay thất bại', null, err.message);
  }
};

const getUpcomingDeadlines = async (req, res) => {
  try {
    const data = await eventService.getUpcomingDeadlines(req.user.user_id);
    sendRes(res, 200, 'Lấy deadline sắp đến thành công', data);
  } catch (err) {
    sendRes(res, 400, 'Lấy deadline thất bại', null, err.message);
  }
};

const getUpcomingNotifications = async (req, res) => {
  try {
    const minutes = req.query.minutes ? Number(req.query.minutes) : 30;
    const data = await eventService.getUpcomingNotifications(req.user.user_id, minutes);
    sendRes(res, 200, 'Lấy thông báo sắp tới thành công', data);
  } catch (err) {
    sendRes(res, 400, 'Lấy thông báo thất bại', null, err.message);
  }
};

const updateEvent = async (req, res) => {
  try {
    const data = await eventService.updateEvent(req.params.id, req.user.user_id, req.body);
    sendRes(res, 200, 'Cập nhật sự kiện thành công', data);
  } catch (err) {
    const status = err.message.startsWith('Trùng lịch') ? 409 : 400;
    sendRes(res, status, 'Cập nhật sự kiện thất bại', null, err.message);
  }
};

const deleteEvent = async (req, res) => {
  try {
    await eventService.deleteEvent(req.params.id, req.user.user_id);
    sendRes(res, 200, 'Xóa sự kiện thành công');
  } catch (err) {
    sendRes(res, 400, 'Xóa sự kiện thất bại', null, err.message);
  }
};

const markDeadlineCompleted = async (req, res) => {
  try {
    const data = await eventService.markDeadlineCompleted(req.params.id, req.user.user_id);
    sendRes(res, 200, 'Đánh dấu hoàn thành thành công', data);
  } catch (err) {
    sendRes(res, 400, 'Cập nhật thất bại', null, err.message);
  }
};

const toggleCompletion = async (req, res) => {
  try {
    const data = await eventService.toggleEventCompletion(req.params.id, req.user.user_id);
    sendRes(res, 200, 'Cập nhật trạng thái thành công', data);
  } catch (err) {
    sendRes(res, 400, 'Cập nhật thất bại', null, err.message);
  }
};

const updateDeadlinePriority = async (req, res) => {
  try {
    const { priority } = req.body;
    if (!['low', 'medium', 'high'].includes(priority))
      return sendRes(res, 400, 'Priority không hợp lệ. Dùng: low / medium / high');
    const data = await eventService.updateDeadlinePriority(req.params.id, req.user.user_id, priority);
    sendRes(res, 200, 'Cập nhật priority thành công', data);
  } catch (err) {
    sendRes(res, 400, 'Cập nhật thất bại', null, err.message);
  }
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
  toggleCompletion,
  updateDeadlinePriority,
};
