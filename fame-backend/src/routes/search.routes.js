const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/search.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// All search routes require authentication
router.use(protect);

// Semantic search (Teacher/Admin only - uses Gemini RAG)
router.post('/semantic', 
    authorize('admin', 'teacher','student'), 
    SearchController.semanticSearch
);

// Basic search (all roles)
router.post('/basic', SearchController.basicSearch);

// Search history (all roles)
router.get('/history', SearchController.getSearchHistory);
router.delete('/history', SearchController.clearSearchHistory);

// Popular searches (Admin/Teacher only)
router.get('/popular', 
    authorize('admin', 'teacher'), 
    SearchController.getPopularSearches
);

module.exports = router;