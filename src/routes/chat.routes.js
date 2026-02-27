const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

router.post('/init', chatController.initializeChat);
router.post('/send', chatController.sendMessage);

module.exports = router;
