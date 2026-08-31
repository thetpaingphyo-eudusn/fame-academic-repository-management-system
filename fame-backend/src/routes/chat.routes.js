const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/contacts', ChatController.getContacts);
router.get('/unread-summary', ChatController.getUnreadSummary);
router.get('/conversations', ChatController.getConversations);
router.post('/conversations', ChatController.createConversation);
router.delete('/conversations/:id', ChatController.deleteConversation);
router.patch('/conversations/:id/mute', ChatController.muteConversation);
router.get('/conversations/:id/messages', ChatController.getMessages);
router.post('/conversations/:id/messages', ChatController.sendMessage);
router.post('/upload', ChatController.uploadAttachment);
router.patch('/messages/:id', ChatController.editMessage);
router.delete('/messages/:id', ChatController.deleteMessage);
router.patch('/messages/:id/pin', ChatController.pinMessage);
router.post('/messages/:id/forward', ChatController.forwardMessage);

module.exports = router;
