const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/eventController');

// GET routes dat truoc /:id de tranh conflict
router.get('/today',              controller.getEventsToday);
router.get('/deadlines',          controller.getUpcomingDeadlines);
router.get('/notifications',      controller.getUpcomingNotifications);
router.get('/month',              controller.getEventsByMonth);     // ?year=2025&month=6
router.get('/week',               controller.getEventsByWeek);      // ?week_start=2025-06-02&week_end=2025-06-08

router.post('/',                  controller.createEvent);
router.get('/',                   controller.getAllEvents);
router.get('/:id',                controller.getEventById);
router.put('/:id',                controller.updateEvent);
router.delete('/:id',             controller.deleteEvent);

// Event actions
router.patch('/:id/complete',     controller.toggleCompletion);
router.patch('/:id/priority',     controller.updateDeadlinePriority);

module.exports = router;
