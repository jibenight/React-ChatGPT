const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const isAuthenticated = require('../middlewares/isAuthenticated');

router.post('/message', isAuthenticated, chatController.sendMessage);

module.exports = router;
