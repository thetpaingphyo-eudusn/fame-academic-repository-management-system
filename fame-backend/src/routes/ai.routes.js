const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const GeminiDependencyService = require('../services/geminiDependency.service');
const CodingAssistantService = require('../services/codingAssistant.service');
const CodingAssistantSessionRepository = require('../repositories/codingAssistantSession.repository');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const designUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const aiFailureStatus = (result) => {
  const msg = String(result?.message || '').toLowerCase();
  if (/required|provide|invalid|parse|no code/.test(msg)) return 400;
  return 503;
};

const persistCodingSession = async (req, result, { prompt = '', mode = 'generate', language = 'html' }) => {
  if (!result?.success || !result?.data) return null;
  const data = result.data;
  const session = await CodingAssistantSessionRepository.create({
    userId: req.user._id,
    userRole: req.user.role,
    title: (prompt || `${mode} session`).slice(0, 80),
    mode: mode || 'generate',
    prompt: prompt || '',
    language: data.language || language,
    files: data.files || [],
    previewHtml: data.previewDocument || '',
    previewMeta: { html: data.html || '', css: data.css || '', javascript: data.javascript || '' },
    explanation: data.explanation || '',
    issues: data.issues || [],
    source: result.source || 'gemini',
  });
  return session?._id;
};

router.use(protect);

// @route   POST /api/ai/analyze-dependencies
// @desc    Analyze dependencies with Gemini AI
router.post('/analyze-dependencies', authorize('admin', 'teacher','student'), async (req, res) => {
  try {
    const { dependencies, fileContent, fileName } = req.body;
    
    // If file content is provided, analyze directly
    if (fileContent && fileName) {
      const fileResult = await GeminiDependencyService.analyzeFromFile(fileContent, fileName);
      result = GeminiDependencyService.formatAnalysisResponse({
        summary: fileResult.summary,
        dependencies: fileResult.dependencies,
        overallRecommendations: fileResult.overallRecommendations,
        _fallbackReason: fileResult.fallbackReason,
      });
      return res.json({ success: true, data: result });
    }
    // If dependencies array is provided, analyze them
    else if (dependencies && dependencies.length > 0) {
      const normalized = GeminiDependencyService.normalizeDependencies(dependencies);
      const rawAnalysis = await GeminiDependencyService.analyzeWithAi(normalized);
      result = GeminiDependencyService.formatAnalysisResponse(rawAnalysis);
      return res.json({ success: true, data: result });
    }
    else {
      return res.status(400).json({
        success: false,
        message: 'No dependencies or dependency file provided'
      });
    }
    
  } catch (error) {
    console.error('AI analysis error:', error);
    const isAiError =
      error.code?.startsWith('AI_') ||
      error.code?.startsWith('GEMINI') ||
      /fetch failed|UNAVAILABLE|503/i.test(error.message || '');

    if (isAiError) {
      try {
        let fallbackDeps = [];
        if (Array.isArray(req.body.dependencies) && req.body.dependencies.length > 0) {
          fallbackDeps = GeminiDependencyService.normalizeDependencies(req.body.dependencies);
        } else if (req.body.fileContent && req.body.fileName) {
          fallbackDeps =
            GeminiDependencyService.parseDependencyFile(req.body.fileContent, req.body.fileName) || [];
        }

        const fallback = GeminiDependencyService.getEnhancedFallbackAnalysis(fallbackDeps || []);
        fallback._fallbackReason = `${require('../utils/fameBrand.util').FAME} temporary issue: ${error.message || 'service unavailable'}`;
        const formatted = GeminiDependencyService.formatAnalysisResponse(fallback);

        return res.status(200).json({
          success: true,
          data: formatted,
          warning: `${require('../utils/fameBrand.util').FAME} is busy right now. Showing local fallback analysis.`
        });
      } catch (fallbackError) {
        console.error('Fallback analysis error:', fallbackError);
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || 'AI analysis failed'
    });
  }
});

// @route   POST /api/ai/upload-dependency-file
// @desc    Upload and analyze dependency file
router.post('/upload-dependency-file', authorize('admin', 'teacher'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const fileContent = req.file.buffer.toString('utf-8');
    const fileName = req.file.originalname;
    
    const result = await GeminiDependencyService.analyzeFromFile(fileContent, fileName);
    const formatted = GeminiDependencyService.formatAnalysisResponse({
      summary: result.summary,
      dependencies: result.dependencies,
      overallRecommendations: result.overallRecommendations,
      _fallbackReason: result.fallbackReason,
    });
    
    res.json({ success: true, data: formatted });
    
  } catch (error) {
    console.error('File upload analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/ai/analyze-code
// @desc    Analyze code quality (AI + local fallback)
router.post('/analyze-code', authorize('admin', 'teacher', 'student'), async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;
    const data = await GeminiDependencyService.analyzeCodeQuality(code, language);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Code analysis error:', error);
    res.status(503).json({
      success: false,
      message: error.message || 'Code analysis failed',
      data: GeminiDependencyService._localCodeAnalysis(String(req.body?.code || ''), req.body?.language),
    });
  }
});

// @route   GET /api/ai/coding-sessions
router.get('/coding-sessions', authorize('admin', 'teacher', 'student'), async (req, res) => {
  try {
    const items = await CodingAssistantSessionRepository.listByUser(req.user._id, { limit: 40 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/ai/coding-sessions/:id
router.get('/coding-sessions/:id', authorize('admin', 'teacher', 'student'), async (req, res) => {
  try {
    const session = await CodingAssistantSessionRepository.findByIdForUser(req.params.id, req.user._id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/ai/coding-sessions/:id
router.delete('/coding-sessions/:id', authorize('admin', 'teacher', 'student'), async (req, res) => {
  try {
    await CodingAssistantSessionRepository.delete(req.params.id, req.user._id);
    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/ai/coding-languages
router.get('/coding-languages', authorize('admin', 'teacher', 'student'), (_req, res) => {
  res.json({ success: true, data: CodingAssistantService.getLanguages() });
});

// @route   POST /api/ai/prompt-to-code
router.post('/prompt-to-code', authorize('admin', 'teacher', 'student'), async (req, res) => {
  try {
    const { prompt = '', language = 'html', mode = 'generate', existingFiles = [] } = req.body;
    const files = Array.isArray(existingFiles) ? existingFiles : [];
    const result = await CodingAssistantService.generateFromPrompt({ prompt, language, mode, existingFiles: files });
    if (!result.success) return res.status(aiFailureStatus(result)).json(result);
    const sessionId = await persistCodingSession(req, result, { prompt, mode, language });
    res.json({
      success: true,
      data: result.data,
      source: result.source,
      warning: result.warning || undefined,
      sessionId,
    });
  } catch (error) {
    console.error('Prompt-to-code route error:', error);
    res.status(500).json({ success: false, message: error.message || 'Prompt-to-code failed' });
  }
});

// @route   POST /api/ai/design-to-code
// @desc    Generate HTML/CSS/JS from uploaded UI design image
router.post(
  '/design-to-code',
  authorize('admin', 'teacher', 'student'),
  designUpload.single('designImage'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Design image is required' });
      }

      const { prompt = '', language = 'html', framework = 'html', mode = 'generate', existingFiles = '[]' } = req.body;
      let parsedFiles = [];
      try {
        parsedFiles = typeof existingFiles === 'string' ? JSON.parse(existingFiles) : existingFiles;
      } catch {
        parsedFiles = [];
      }
      const result = await CodingAssistantService.generateFromDesign({
        imageBuffer: req.file.buffer,
        mimeType: req.file.mimetype,
        prompt,
        language: language || framework,
        mode,
        existingFiles: parsedFiles,
      });

      if (!result.success) {
        return res.status(aiFailureStatus(result)).json(result);
      }

      const sessionId = await persistCodingSession(req, result, { prompt, mode, language: language || framework });
      res.json({
        success: true,
        data: result.data,
        source: result.source,
        warning: result.warning || undefined,
        sessionId,
      });
    } catch (error) {
      console.error('Design-to-code route error:', error);
      res.status(500).json({ success: false, message: error.message || 'Design-to-code failed' });
    }
  }
);

// @route   POST /api/ai/refine-design-code
// @desc    Refine generated code using instruction (+ optional design image)
router.post(
  '/refine-design-code',
  authorize('admin', 'teacher', 'student'),
  designUpload.single('designImage'),
  async (req, res) => {
    try {
      const { files = '[]', html = '', css = '', javascript = '', instruction = '', language = 'html' } = req.body;
      let parsedFiles = [];
      try {
        parsedFiles = typeof files === 'string' ? JSON.parse(files) : files;
      } catch {
        parsedFiles = [];
      }

      const result = await CodingAssistantService.refineCode({
        files: parsedFiles,
        html,
        css,
        javascript,
        instruction,
        language,
        imageBuffer: req.file?.buffer,
        mimeType: req.file?.mimetype,
      });

      if (!result.success) {
        return res.status(aiFailureStatus(result)).json(result);
      }

      res.json({
        success: true,
        data: result.data,
        source: result.source,
        warning: result.warning || undefined,
      });
    } catch (error) {
      console.error('Refine design code route error:', error);
      res.status(500).json({ success: false, message: error.message || 'Code refinement failed' });
    }
  }
);

module.exports = router;