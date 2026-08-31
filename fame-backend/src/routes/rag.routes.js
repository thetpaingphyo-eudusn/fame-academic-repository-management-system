const express = require('express');
const router = express.Router();
const RagController = require('../controllers/rag.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/chat', RagController.chat);
router.get('/status', RagController.getStatus);
router.get('/chat/sessions', RagController.getMyChatSessions);
router.delete('/chat/sessions', RagController.deleteAllMyChatSessions);
router.get('/chat/sessions/:id', RagController.getMyChatSessionById);
router.delete('/chat/sessions/:id', RagController.deleteMyChatSession);

module.exports = router;
