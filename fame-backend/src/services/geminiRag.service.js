const ProjectRepository = require('../repositories/project.repository');
const UserRepository = require('../repositories/user.repository');
const CourseRepository = require('../repositories/course.repository');
const DocumentEmbeddingRepository = require('../repositories/documentEmbedding.repository');
const RagContextService = require('./ragContext.service');
const RagAccessService = require('./ragAccess.service');
const RagChartService = require('./ragChart.service');
const { pickSuggestedLinks } = require('../utils/ragNavigation.util');
const { sanitizeRagAnswerLinks, sanitizeEntityLinks } = require('../utils/ragLinkSanitize.util');
const AiConfigService = require('./aiConfig.service');
const LlmClientService = require('./llmClient.service');
const { detectConversationLanguage, buildLanguageInstruction } = require('../utils/detectUserLanguage.util');
const {
    isAdvisoryQuery,
    assessRetrieval,
    buildHybridAnswerPolicy,
} = require('../utils/ragQueryIntent.util');

const { FAME, toDisplayText } = require('../utils/fameBrand.util');

class GeminiRagService {
    constructor() {
        this.geminiLastTest = null;
        this.geminiLastTestAt = 0;
        console.log('✅ FAME RAG service ready — AI config from Admin Settings or .env fallback');
    }

    resetState() {
        this.geminiLastTest = null;
        this.geminiLastTestAt = 0;
    }

    async _getAiConfig() {
        return AiConfigService.getResolvedConfig();
    }

    _isGeminiChatEnabled() {
        return true;
    }

    async _isAiConfigured() {
        const cfg = await this._getAiConfig();
        return cfg.hasApiKey && cfg.chatEnabled !== false;
    }

    async _geminiUnavailableMessage() {
        const cfg = await this._getAiConfig();
        if (!cfg.hasApiKey) {
            return toDisplayText(`${FAME} is not configured. Open **Admin → Settings → AI Configuration** and add your API key.`);
        }
        if (cfg.chatEnabled === false) {
            return toDisplayText(`${FAME} chat is disabled in admin settings.`);
        }
        if (LlmClientService.isChatBlocked()) {
            return toDisplayText(`${FAME} is temporarily paused (quota or rate limit). Try again later.`);
        }
        const msg = String(LlmClientService.getLastError()?.message || '');
        if (/quota|429|RESOURCE_EXHAUSTED/i.test(msg)) {
            return toDisplayText(`**${FAME} quota exceeded.** Try another provider/model in admin settings.`);
        }
        if (/location is not supported/i.test(msg)) {
            return toDisplayText(`**${FAME} is not available in your region** for this provider. Try OpenRouter in admin settings.`);
        }
        return toDisplayText(msg.slice(0, 300) || `${FAME} could not generate a response. Please try again.`);
    }

    _isGeminiBlocked(kind = 'chat') {
        return kind === 'embedding' ? LlmClientService.isEmbeddingBlocked() : LlmClientService.isChatBlocked();
    }

    _markGeminiBlocked() {}

    _shouldUseGeminiChat() {
        return true;
    }

    async generateEmbedding(text) {
        return LlmClientService.embed(text);
    }

    async generateResponse(prompt, options = {}) {
        const advisory = !!options.advisory;
        return LlmClientService.chat(prompt, {
            maxTokens: options.maxTokens || 900,
            temperature: advisory ? 0.4 : options.temperature ?? 0.15,
            system:
                options.system ||
                'You are FAME. Use DATABASE CONTEXT for factual records (names, grades, counts). Use general knowledge for advice, explanations, and teaching tips when the database does not answer the question. Never invent student names, grades, or project records. Reply concisely in the user language.',
        });
    }

    _sanitizeModelAnswer(value) {
        const text = String(value || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        if (!text) return null;
        if (
            /\b(the user is asking|i need to|let me check|the instructions say)\b/i.test(text) ||
            /[\u1000-\u109F]+\d{3,}/.test(text) ||
            /\bPawn:/i.test(text)
        ) {
            return null;
        }

        // Ignore markdown destinations when checking repetition. A valid list can
        // contain many `/projects?id=...` links without being a broken response.
        const repetitionText = text.replace(/\]\([^)]+\)/g, ']');
        const words = repetitionText
            .toLowerCase()
            .split(/[\s၊။,.;:!?()[\]{}"'`]+/)
            .filter((word) => word.length >= 3);
        if (words.length >= 30) {
            const counts = new Map();
            words.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
            if (Math.max(...counts.values()) >= 12 || counts.size / words.length < 0.12) return null;
        }
        return text;
    }

    // 🚀 TRAIN ALL SITE DATA (projects + students + summary)
    async trainAllSiteData() {
        const cfg = await this._getAiConfig();
        if (!cfg.hasApiKey) {
            return {
                success: false,
                message: toDisplayText(`${FAME} is not configured. Add an API key in Admin → Settings → AI Configuration.`),
                trainedCount: 0,
                failedCount: 0,
                totalProjects: 0,
            };
        }
        if (!cfg.embeddingEnabled) {
            return {
                success: false,
                message: 'Embeddings are disabled. Enable them in Admin → Settings → AI Configuration.',
                trainedCount: 0,
                failedCount: 0,
                totalProjects: 0,
            };
        }

        try {
            await DocumentEmbeddingRepository.deleteMany({
                documentType: { $in: ['project_full', 'student_profile', 'site_summary', 'course_summary'] },
            });

            const [projects, students, courses] = await Promise.all([
                ProjectRepository.findAll(
                    { isActive: true },
                    { populate: ['studentId', 'courseId'] }
                ),
                UserRepository.findAll({ role: 'student', isActive: true }, { select: '-password' }),
                CourseRepository.findAll({}, { populate: 'teacherId' }),
            ]);

            let trainedCount = 0;
            let failedCount = 0;

            for (let i = 0; i < projects.length; i += 1) {
                if (this._isGeminiBlocked('embedding')) {
                    failedCount += projects.length - i;
                    break;
                }
                const project = projects[i];
                const ok = await this.embedAndSave(
                    project._id,
                    'project_full',
                    this.buildTrainingText(project)
                );
                if (ok) trainedCount += 1;
                else failedCount += 1;
            }

            const projectsByStudent = new Map();
            projects.forEach((project) => {
                const key = String(project.studentId?._id || project.studentId || '');
                if (!key) return;
                if (!projectsByStudent.has(key)) projectsByStudent.set(key, []);
                projectsByStudent.get(key).push(project);
            });

            for (const student of students) {
                if (this._isGeminiBlocked('embedding')) break;
                const studentProjects = projectsByStudent.get(String(student._id)) || [];
                const ok = await this.embedAndSave(
                    null,
                    'student_profile',
                    this.buildStudentTrainingText(student, studentProjects)
                );
                if (ok) trainedCount += 1;
                else failedCount += 1;
            }

            const siteSummary = `
FAME Academic Repository Summary
Total Projects: ${projects.length}
Total Students: ${students.length}
Total Courses: ${courses.length}
Departments: CS, IT, CT, EC
Status breakdown: pending, approved, rejected, revision, graded
            `.trim();

            const siteOk = !this._isGeminiBlocked('embedding')
                ? await this.embedAndSave(null, 'site_summary', siteSummary)
                : false;
            if (siteOk) trainedCount += 1;
            else failedCount += 1;

            const geminiBlocked = this._isGeminiBlocked('embedding');
            const blockHint = geminiBlocked
                ? ' AI embeddings quota/region limit reached — chat may still work via local DB.'
                : '';

            return {
                success: trainedCount > 0,
                message:
                    trainedCount > 0
                        ? `Training completed: ${trainedCount} records embedded, ${failedCount} failed.${blockHint}`
                        : toDisplayText(`Training failed: ${FAME} embeddings unavailable (quota or region).${blockHint}`),
                trainedCount,
                failedCount,
                totalProjects: projects.length,
                totalStudents: students.length,
            };
        } catch (error) {
            console.error('Site training error:', error);
            return {
                success: false,
                message: error.message,
                trainedCount: 0,
                failedCount: 0,
                totalProjects: 0,
            };
        }
    }

    buildTrainingText(project) {
        const p = project.toObject ? project.toObject() : project;
        const course = p.courseId;
        return `
Project Title: ${p.title}
Description: ${p.description || 'No description provided'}
Student Name: ${p.studentName || p.studentId?.name || 'Unknown'}
Department: ${p.department || 'N/A'}
Year: ${p.year || 'N/A'}
Section: ${p.section || 'N/A'}
Status: ${p.status || 'N/A'}
Grade: ${p.grade ?? 'N/A'}
Course: ${course?.courseCode || 'N/A'} — ${course?.courseName || 'N/A'}
        `.trim();
    }

    buildStudentTrainingText(student, projects = []) {
        const projectLines = projects
            .slice(0, 10)
            .map((p) => `- ${p.title} (${p.status}, grade: ${p.grade ?? 'N/A'})`)
            .join('\n');
        return `
Student Name: ${student.name}
Student ID: ${student.studentId || 'N/A'}
Email: ${student.email || 'N/A'}
Department: ${student.department || 'N/A'}
Year: ${student.year || 'N/A'}
Section: ${student.section || 'N/A'}
Projects:
${projectLines || 'No projects'}
        `.trim();
    }

    async embedAndSave(projectId, documentType, text) {
        const embedding = await this.generateEmbedding(text);
        if (!embedding) return false;

        await DocumentEmbeddingRepository.saveEmbedding(
            projectId,
            null,
            documentType,
            0,
            1,
            text,
            embedding,
            text.length,
            'en'
        );
        return true;
    }

    filterSemanticResults(results, context) {
        const allowedProjectIds = new Set(context.projects.map((p) => String(p._id)));
        return results.filter((r) => allowedProjectIds.has(String(r._id || r.projectId)));
    }

    async chat(message, user, history = [], options = {}) {
        const trimmed = message?.trim();
        const chartMode = !!options.chartMode;
        if (!trimmed) {
            return { success: false, message: 'Message is required', answer: null };
        }

        const context = await RagContextService.buildRoleContext(user);

        const accessCheck = RagAccessService.validateQuery(trimmed, user.role, context);
        if (!accessCheck.allowed) {
            return {
                success: true,
                answer: accessCheck.message,
                source: 'access-denied',
                role: user.role,
                stats: context.stats,
                links: [],
            };
        }

        const isQuick = RagContextService.isQuickQuery(trimmed) || RagContextService.isGreeting(trimmed);

        const cfg = await this._getAiConfig();
        let ragSnippets = [];

        if (cfg.embeddingEnabled && !this._isGeminiBlocked('embedding')) {
            const semantic = await this.semanticSearch(trimmed, 5);
            if (semantic.success && semantic.results?.length) {
                const filtered = this.filterSemanticResults(semantic.results, context);
                ragSnippets = filtered.map(
                    (r) =>
                        `Project: ${r.title} | Student: ${r.studentName || 'Unknown'} | Grade: ${r.grade ?? 'N/A'} | Status: ${r.status}`
                );
            }
        }

        const historyText = (history || [])
            .slice(-6)
            .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
            .join('\n');

        const aiReady = await this._isAiConfigured();
        const useChat = cfg.chatEnabled !== false && aiReady && !LlmClientService.isChatBlocked();
        let answer = null;
        let source = 'gemini-rag';

        if (!aiReady) {
            answer = await this._geminiUnavailableMessage();
            source = 'error';
        } else if (cfg.chatEnabled === false) {
            answer = await this._geminiUnavailableMessage();
            source = 'error';
        } else if (LlmClientService.isChatBlocked()) {
            answer = await this._geminiUnavailableMessage();
            source = 'error';
        } else if (useChat) {
            const accessPolicy = RagAccessService.buildAccessPolicyText(user.role);
            const userLang = detectConversationLanguage(trimmed, history);
            const langBlock = buildLanguageInstruction(userLang);
            const retrieval = assessRetrieval(trimmed, context, ragSnippets);
            const hybridPolicy = buildHybridAnswerPolicy(retrieval, userLang);
            const advisory = isAdvisoryQuery(trimmed) || retrieval === 'advisory';
            const wantsProjectLinks =
                /\bprojects?\b/i.test(trimmed) && /\blink|links|open|url|ချိတ်ဆက်/i.test(trimmed);
            const taskGuidance = wantsProjectLinks
                ? `CURRENT TASK — PROJECT LINKS
- List the accessible project records themselves, one project per bullet.
- Copy each project's exact markdown [Open: title](path) link from NAVIGATION CATALOG.
- Include the student name when available.
- Do not substitute generic page links such as /projects, /users, or /analytics.`
                : '';
            const quickStyle = isQuick && !chartMode
                ? `RESPONSE STYLE — BRIEF QUESTION
- The user asked briefly. Reply in 1-3 short lines only.
- No long preamble. Skip "**From database:**" / "**General info:**" headers unless essential.
- Use bullets only if listing multiple items; keep each line short.\n\n`
                : '';
            const chartBlock = RagChartService.chartPromptBlock(trimmed, chartMode);
            const prompt = `You are FAME DEV — the AI assistant for the FAME Academic Repository.
The signed-in user role is: ${user.role}.
User name: ${user.name || 'User'}.

${accessPolicy}

${langBlock}

${hybridPolicy}

${chartBlock}${quickStyle}${taskGuidance ? `${taskGuidance}\n\n` : ''}STRICT RULES
- For FACTUAL questions: use DATABASE CONTEXT and SEMANTIC SEARCH MATCHES. Never invent names, grades, or project records.
- For ADVISORY/GENERAL questions (how to improve, tips, teaching methods): answer from general knowledge. Optionally cite DATABASE CONTEXT stats if useful.
- Do NOT reply with only access-scope disclaimers — always answer the user's actual question.
- If the user asks for data outside their role scope (other teachers' private data, all students in the system), politely refuse that part only.
- Never reveal other users' private data outside the user's permitted scope.
- Answer directly in the language used by the user.
- For follow-up questions, resolve "it/that/ဘာကောင်းကျိုး" from the most recent conversation subject.
- Never expose internal reasoning and never repeat a word or phrase abnormally.

${taskGuidance}

KNOWLEDGE
1. DATABASE CONTEXT = retrieved facts about this user's students, projects, courses, assignments.
2. If retrieval found relevant records, use them for factual parts under **ဒေတာဘေ့စ်မှ:** (Myanmar) or **From database:** (English).
3. If the question needs advice/explanation beyond the database, add **အထွေထွေအသိပညာ:** or **General knowledge:** with helpful LLM knowledge.
4. STUDENTS section includes studentId, email, section — copy exact values when asked.
5. Do not invent database records. Missing factual fields → say not stored; you may still give general advice.

LINKS — CRITICAL
- Use ONLY relative in-app paths from NAVIGATION CATALOG (must start with /).
- NEVER use example.com, localhost, 127.0.0.1, or full https:// URLs.
- Copy the exact markdown link from NAVIGATION CATALOG, e.g. [Open: Title](/projects?id=...).

NAVIGATION CATALOG:
${context.navigationCatalog || ''}

DATABASE CONTEXT:
${context.contextText}

${ragSnippets.length ? `SEMANTIC SEARCH MATCHES:\n${ragSnippets.join('\n')}\n` : ''}${historyText ? `RECENT CONVERSATION:\n${historyText}\n\n` : ''}USER: ${trimmed}

FAME DEV:`;

            let geminiAnswer = await this.generateResponse(prompt, { advisory });
            if (!geminiAnswer) {
                // Clear transient provider/config state and retry once before showing an error.
                AiConfigService.invalidateCache();
                LlmClientService.resetState();
                geminiAnswer = await this.generateResponse(prompt, { advisory });
            }
            if (geminiAnswer) {
                const cleanAnswer = this._sanitizeModelAnswer(geminiAnswer);
                if (cleanAnswer) {
                    answer = sanitizeRagAnswerLinks(cleanAnswer, context.entityLinks || []);
                    source = advisory && retrieval !== 'matched' ? 'gemini-rag+general' : 'gemini-rag';
                } else {
                    const retryAnswer = await this.generateResponse(
                        `${prompt}\n\nYour previous response was invalid or repetitive. Try once more with a short, direct final answer only.`,
                        { advisory }
                    );
                    const cleanRetry = this._sanitizeModelAnswer(retryAnswer);
                    if (cleanRetry) {
                        answer = sanitizeRagAnswerLinks(cleanRetry, context.entityLinks || []);
                        source = 'gemini-rag';
                    }
                }
            }
        }

        const suggestedLinks =
            context.entityLinks?.length > 0
                ? sanitizeEntityLinks(
                      pickSuggestedLinks(`${trimmed}\n${answer || ''}`, context.entityLinks, 6),
                      context.entityLinks
                  )
                : [];

        if (!answer) {
            answer = await this._geminiUnavailableMessage();
            source = 'error';
        }

        const charts = RagChartService.buildCharts(trimmed, context, history, chartMode);

        return {
            success: true,
            answer,
            source,
            role: user.role,
            stats: context.stats,
            links: suggestedLinks,
            charts,
            chartMode: chartMode || charts.length > 0,
        };
    }

    // Alias for admin training endpoint
    async trainAllProjects(progressCallback = null) {
        return this.trainAllSiteData(progressCallback);
    }

    // Search using trained embeddings
    async semanticSearch(query, limit = 10) {
        const cfg = await this._getAiConfig();
        if (!cfg.hasApiKey || !cfg.embeddingEnabled) {
            return { success: false, message: 'AI embeddings not configured or disabled', results: [] };
        }

        try {
            const queryEmbedding = await this.generateEmbedding(query);
            if (!queryEmbedding) {
                return { success: false, message: 'Failed to generate query embedding', results: [] };
            }

            const allEmbeddings = await DocumentEmbeddingRepository.getAllEmbeddingVectors('project_full');
            
            if (!allEmbeddings || allEmbeddings.length === 0) {
                return { 
                    success: false, 
                    message: 'No trained data found. Admin needs to run training first.',
                    results: [] 
                };
            }

            const similarities = [];
            for (const doc of allEmbeddings) {
                const similarity = this.cosineSimilarity(queryEmbedding, doc.vector);
                if (similarity > 0.3) {
                    similarities.push({
                        projectId: doc.projectId,
                        similarity: similarity,
                        text: doc.text.substring(0, 200)
                    });
                }
            }

            similarities.sort((a, b) => b.similarity - a.similarity);
            const topResults = similarities.slice(0, limit);
            const projectIds = topResults.map((r) => r.projectId).filter(Boolean);

            const projects = await ProjectRepository.findAll(
                { _id: { $in: projectIds } },
                { populate: ['studentId', 'courseId'] }
            );

            const resultsWithScores = projects.map(project => ({
                ...project.toObject(),
                similarity: Math.round((topResults.find(r => r.projectId.toString() === project._id.toString())?.similarity || 0) * 100)
            }));

            return {
                success: true,
                query,
                results: resultsWithScores.sort((a, b) => b.similarity - a.similarity),
                total: resultsWithScores.length
            };

        } catch (error) {
            console.error('Search error:', error);
            return { success: false, message: error.message, results: [] };
        }
    }

    // Cosine similarity
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async testConnection() {
        const cachedMs = 5 * 60 * 1000;

        if (this.geminiLastTest && Date.now() - this.geminiLastTestAt < cachedMs) {
            return this.geminiLastTest;
        }

        const cfg = await this._getAiConfig();
        const result = await LlmClientService.testConnection();
        const enriched = {
            ...result,
            chatMode: result.success ? 'gemini-rag' : 'error',
            localFallback: cfg.localFallbackEnabled !== false,
        };
        this.geminiLastTest = enriched;
        this.geminiLastTestAt = Date.now();
        return enriched;
    }

    async getTrainingStatus() {
        const count = await DocumentEmbeddingRepository.count({
            documentType: { $in: ['project_full', 'student_profile', 'site_summary'] },
        });
        const projectCount = await DocumentEmbeddingRepository.count({ documentType: 'project_full' });
        return {
            isTrained: count > 0,
            trainedProjectsCount: projectCount,
            trainedRecordsCount: count,
            message:
                count > 0
                    ? `RAG trained with ${projectCount} projects and ${count} total records`
                    : 'No trained data found. Run training first.',
        };
    }
}

module.exports = new GeminiRagService();