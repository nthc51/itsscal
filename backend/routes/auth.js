const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register',      controller.register);
router.post('/login',         controller.login);
router.post('/logout',        controller.logout);
router.post('/refresh-token', controller.refresh);

router.get('/me', authenticate, controller.me);
router.put('/profile', authenticate, controller.updateProfile);
router.put('/password', authenticate, controller.changePassword);

module.exports = router;
