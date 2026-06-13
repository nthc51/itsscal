const express  = require('express');
const router   = express.Router();
const { authenticate } = require('../middleware/auth');

// Public
router.use('/auth',  require('./auth'));

// Protected
router.use('/event', authenticate, require('./event'));

module.exports = router;
