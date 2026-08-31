const AiConfigService = require('./aiConfig.service');
const LlmClientService = require('./llmClient.service');
const { FAME, toDisplayText } = require('../utils/fameBrand.util');

class GeminiDependencyService {
    constructor() {
        console.log('✅ Dependency & code health service ready — AI from Admin Settings or local fallback');
    }

    async _allowsLocalFallback() {
        const cfg = await AiConfigService.getResolvedConfig();
        return (
            cfg.localFallbackEnabled !== false ||
            process.env.GEMINI_FALLBACK_ON_ERROR === 'true' ||
            process.env.RAG_CHAT_LOCAL_FALLBACK === 'true'
        );
    }

    normalizeDependencies(dependencies = []) {
        return (dependencies || [])
            .map((dep) => ({
                name: dep?.name,
                currentVersion: String(
                    dep?.currentVersion || dep?.version || dep?.latestVersion || 'latest'
                ).replace(/^[\^~]/, ''),
                type: dep?.type || 'npm',
            }))
            .filter((dep) => dep.name);
    }

    parseDependencyFile(fileContent, fileName) {
        const lowerFileName = fileName.toLowerCase();

        try {
            if (lowerFileName === 'package.json' || lowerFileName.endsWith('package.json')) {
                const packageJson = JSON.parse(fileContent);
                const allDeps = {
                    ...(packageJson.dependencies || {}),
                    ...(packageJson.devDependencies || {}),
                };

                return Object.entries(allDeps).map(([name, version]) => ({
                    name,
                    currentVersion: version.toString().replace(/[\^~]/, ''),
                    type: 'npm',
                }));
            }

            if (lowerFileName === 'requirements.txt' || lowerFileName.endsWith('requirements.txt')) {
                const lines = fileContent.split('\n');
                const dependencies = [];

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        const match = trimmed.match(/^([a-zA-Z0-9_-]+)([=<>!~]+)([0-9.]+)?/);
                        if (match) {
                            dependencies.push({
                                name: match[1],
                                currentVersion: match[3] || 'latest',
                                type: 'pip',
                            });
                        } else if (trimmed.includes('==')) {
                            const [name, version] = trimmed.split('==');
                            dependencies.push({
                                name: name.trim(),
                                currentVersion: version.trim(),
                                type: 'pip',
                            });
                        } else if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
                            dependencies.push({
                                name: trimmed,
                                currentVersion: 'latest',
                                type: 'pip',
                            });
                        }
                    }
                }
                return dependencies;
            }

            console.log('⚠️ Unknown dependency file type:', fileName);
            return null;
        } catch (error) {
            console.error('Parse error:', error.message);
            return null;
        }
    }

    _parseJsonFromText(text) {
        if (!text) return null;
        let cleaned = String(text).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        try {
            return JSON.parse(jsonMatch[0]);
        } catch {
            return null;
        }
    }

    async _callAiAnalysis(dependencies) {
        const prompt = `You are a security and dependency expert. Analyze these dependencies and return ONLY valid JSON.

DEPENDENCIES:
${JSON.stringify(dependencies, null, 2)}

For EACH dependency, check:
1. Is this version deprecated, outdated, or has security vulnerabilities (CVE)?
2. What is the latest stable version?
3. What is the exact command to fix?
4. Priority: "critical", "high", "medium", "low", or "up_to_date"

Return JSON in this EXACT format (no markdown, no extra text):
{
    "summary": {
        "total": number,
        "critical": number,
        "high": number,
        "medium": number,
        "low": number,
        "upToDate": number,
        "healthScore": number
    },
    "dependencies": [
        {
            "name": "package-name",
            "currentVersion": "x.x.x",
            "latestVersion": "x.x.x",
            "status": "critical|high|medium|low|up_to_date",
            "issue": "description of the problem",
            "fixCommand": "npm install xxx@latest or pip install --upgrade xxx",
            "recommendation": "short actionable message"
        }
    ],
    "overallRecommendations": ["recommendation 1", "recommendation 2"]
}`;

        const text = await LlmClientService.chat(prompt);
        if (!text) {
            const err = LlmClientService.getLastError() || new Error(`${FAME} returned no response`);
            err.code = 'AI_EMPTY_RESPONSE';
            throw err;
        }

        const analysis = this._parseJsonFromText(text);
        if (!analysis?.summary || !Array.isArray(analysis.dependencies)) {
            const err = new Error(toDisplayText(`${FAME} returned an invalid analysis response`));
            err.code = 'AI_INVALID_RESPONSE';
            throw err;
        }

        return analysis;
    }

    async analyzeWithGemini(dependencies) {
        return this.analyzeWithAi(dependencies);
    }

    async analyzeWithAi(dependencies) {
        const normalized = this.normalizeDependencies(dependencies);

        if (!normalized.length) {
            return {
                summary: { total: 0, healthScore: 100, critical: 0, high: 0, medium: 0, low: 0, upToDate: 0 },
                dependencies: [],
                overallRecommendations: ['No dependencies provided'],
            };
        }

        const cfg = await AiConfigService.getResolvedConfig();
        const canUseAi = cfg.hasApiKey && cfg.chatEnabled !== false;

        if (canUseAi) {
            try {
                console.log(`🤖 Running AI dependency analysis (${cfg.provider})...`);
                const analysis = await this._callAiAnalysis(normalized);
                console.log(`📊 Health Score: ${analysis.summary?.healthScore}`);
                return analysis;
            } catch (error) {
                console.error('AI dependency analysis error:', error.message);
                if (await this._allowsLocalFallback()) {
                    const fallback = this.getEnhancedFallbackAnalysis(normalized);
                    fallback._fallbackReason = toDisplayText(
                        `${FAME} unavailable (${error.message}). Showing local dependency analysis.`
                    );
                    return fallback;
                }
                throw error;
            }
        }

        if (await this._allowsLocalFallback()) {
            const fallback = this.getEnhancedFallbackAnalysis(normalized);
            fallback._fallbackReason = toDisplayText(
                `${FAME} is not configured. Open Admin → Settings → AI Configuration. Showing local analysis.`
            );
            return fallback;
        }

        const err = new Error(
            toDisplayText(`${FAME} is not configured. Add an API key in Admin → Settings → AI Configuration.`)
        );
        err.code = 'AI_NOT_CONFIGURED';
        throw err;
    }

    async analyzeFromFile(fileContent, fileName) {
        console.log(`🔍 Analyzing dependency file: ${fileName}`);

        const dependencies = this.parseDependencyFile(fileContent, fileName);

        if (!dependencies || dependencies.length === 0) {
            return {
                success: true,
                message: 'No dependencies found in file',
                hasDependencies: false,
                summary: { total: 0, healthScore: 100 },
                dependencies: [],
                overallRecommendations: ['No dependencies to analyze'],
            };
        }

        console.log(`📦 Found ${dependencies.length} dependencies`);

        const analysis = await this.analyzeWithAi(dependencies);

        return {
            success: true,
            message: 'Dependency check completed',
            hasDependencies: true,
            fileType: fileName.toLowerCase().includes('json') ? 'package.json' : 'requirements.txt',
            summary: analysis.summary,
            dependencies: analysis.dependencies,
            overallRecommendations: analysis.overallRecommendations || [],
            source: analysis._fallbackReason ? 'local-fallback' : 'ai',
            fallbackReason: analysis._fallbackReason || null,
        };
    }

    formatAnalysisResponse(analysis) {
        const isFallback = Boolean(analysis._fallbackReason);
        const recommendations = (analysis.overallRecommendations || [])
            .map((rec) => ({
                type: 'info',
                message: rec,
                action: '',
            }))
            .concat(
                (analysis.dependencies || [])
                    .filter((d) => d.status && d.status !== 'up_to_date')
                    .map((d) => ({
                        type: d.status,
                        message: `${d.name}@${d.currentVersion} - ${d.issue}`,
                        action: d.fixCommand || '',
                    }))
            );

        if (isFallback && analysis._fallbackReason) {
            recommendations.unshift({
                type: 'warning',
                message: analysis._fallbackReason,
                action: '',
            });
        }

        return {
            source: isFallback ? 'local-fallback' : 'ai',
            fallbackReason: analysis._fallbackReason || null,
            healthScore: analysis.summary?.healthScore ?? null,
            summary: analysis.summary || null,
            dependencies: analysis.dependencies || [],
            recommendations,
            analyzedAt: new Date(),
        };
    }

    getEnhancedFallbackAnalysis(dependencies) {
        const vulnerabilityDatabase = {
            lodash: {
                status: 'high',
                latest: '4.17.21',
                issue: 'Prototype pollution vulnerability (CVE-2019-10744)',
                fix: 'npm install lodash@4.17.21',
            },
            moment: {
                status: 'high',
                latest: '2.29.4',
                issue: 'Deprecated - not recommended for new projects',
                fix: 'npm install date-fns or dayjs',
            },
            express: {
                status: 'medium',
                latest: '4.21.0',
                issue: 'Several security patches available',
                fix: 'npm install express@latest',
            },
            axios: {
                status: 'medium',
                latest: '1.7.9',
                issue: 'SSRF vulnerability in older versions',
                fix: 'npm install axios@latest',
            },
            mongoose: {
                status: 'low',
                latest: '8.9.0',
                issue: 'Performance improvements available',
                fix: 'npm install mongoose@latest',
            },
            react: {
                status: 'low',
                latest: '18.3.1',
                issue: 'New features and performance improvements',
                fix: 'npm install react@18.3.1 react-dom@18.3.1',
            },
            'react-dom': {
                status: 'low',
                latest: '18.3.1',
                issue: 'New features and performance improvements',
                fix: 'npm install react-dom@18.3.1',
            },
            django: {
                status: 'medium',
                latest: '5.1.4',
                issue: 'Security patches available',
                fix: 'pip install django==5.1.4',
            },
            flask: {
                status: 'low',
                latest: '3.1.0',
                issue: 'New features available',
                fix: 'pip install flask==3.1.0',
            },
            requests: {
                status: 'medium',
                latest: '2.32.3',
                issue: 'Security vulnerability in older versions',
                fix: 'pip install requests==2.32.3',
            },
        };

        const analyzedDeps = dependencies.map((dep) => {
            const known = vulnerabilityDatabase[dep.name.toLowerCase()];

            if (known) {
                return {
                    name: dep.name,
                    currentVersion: dep.currentVersion,
                    latestVersion: known.latest,
                    status: known.status,
                    issue: known.issue,
                    fixCommand: known.fix,
                    recommendation: `Update to ${known.latest}`,
                };
            }

            let status = 'up_to_date';
            let issue = 'No known vulnerabilities in local database';
            let latestVersion = dep.currentVersion;
            const fixCommand =
                dep.type === 'npm' ? `npm update ${dep.name}` : `pip install --upgrade ${dep.name}`;
            let recommendation = 'Up to date (local check)';

            const versionMatch = dep.currentVersion.match(/^(\d+)\./);
            if (versionMatch && parseInt(versionMatch[1], 10) < 2 && dep.name !== 'react') {
                status = 'medium';
                issue = 'Major version may be behind — verify latest release';
                latestVersion = `${parseInt(versionMatch[1], 10) + 1}.0.0`;
                recommendation = `Consider upgrading ${dep.name}`;
            }

            return {
                name: dep.name,
                currentVersion: dep.currentVersion,
                latestVersion,
                status,
                issue,
                fixCommand,
                recommendation,
            };
        });

        const summary = {
            total: dependencies.length,
            critical: analyzedDeps.filter((d) => d.status === 'critical').length,
            high: analyzedDeps.filter((d) => d.status === 'high').length,
            medium: analyzedDeps.filter((d) => d.status === 'medium').length,
            low: analyzedDeps.filter((d) => d.status === 'low').length,
            upToDate: analyzedDeps.filter((d) => d.status === 'up_to_date').length,
            healthScore: 100,
        };

        summary.healthScore -= summary.critical * 15;
        summary.healthScore -= summary.high * 10;
        summary.healthScore -= summary.medium * 5;
        summary.healthScore -= summary.low * 2;
        summary.healthScore = Math.max(0, Math.min(100, summary.healthScore));

        const overallRecommendations = [];
        if (summary.critical > 0) {
            overallRecommendations.push(
                `🔴 CRITICAL: ${summary.critical} dependency(s) have critical security vulnerabilities — update immediately.`
            );
        }
        if (summary.high > 0) {
            overallRecommendations.push(
                `🟠 HIGH: ${summary.high} dependency(s) have high-priority issues — update soon.`
            );
        }
        if (summary.medium > 0) {
            overallRecommendations.push(
                `🟡 MEDIUM: ${summary.medium} dependency(s) have medium-priority updates available.`
            );
        }
        if (summary.low > 0) {
            overallRecommendations.push(
                `🟢 LOW: ${summary.low} dependency(s) have optional updates available.`
            );
        }
        if (summary.upToDate === summary.total && summary.total > 0) {
            overallRecommendations.push(`✅ All ${summary.total} dependencies passed local checks.`);
        }
        if (summary.total === 0) {
            overallRecommendations.push('📦 No dependencies found to analyze.');
        }

        const criticalDeps = analyzedDeps.filter((d) => d.status === 'critical' || d.status === 'high');
        if (criticalDeps.length > 0) {
            overallRecommendations.push('📝 Suggested fixes:');
            criticalDeps.forEach((dep) => {
                overallRecommendations.push(`   • ${dep.fixCommand}`);
            });
        }

        return {
            summary,
            dependencies: analyzedDeps,
            overallRecommendations,
        };
    }

    async analyzeDependencies(dependencies) {
        return this.analyzeWithAi(dependencies);
    }

    _localCodeAnalysis(code, language = 'javascript') {
        const lines = code.split('\n');
        const hasComments = /\/\/|\/\*|#/.test(code);
        const hasErrorHandling = /\btry\b|\bcatch\b|\.catch\(/.test(code);
        const hasConsoleLog = /console\.log/.test(code);
        const longFunctions = lines.length > 200;

        let score = 75;
        const issues = [];
        const suggestions = [];

        if (!hasComments) {
            issues.push('Missing comments');
            suggestions.push('Add comments to explain complex logic');
            score -= 10;
        }
        if (!hasErrorHandling) {
            issues.push('Limited error handling');
            suggestions.push('Add try-catch or .catch() for async errors');
            score -= 12;
        }
        if (hasConsoleLog) {
            issues.push('Debug console.log statements found');
            suggestions.push('Remove console.log before production');
            score -= 5;
        }
        if (longFunctions) {
            suggestions.push('Consider splitting large files into smaller modules');
            score -= 5;
        }

        return {
            score: Math.max(0, Math.min(100, score)),
            issues,
            suggestions,
            metrics: { lines: lines.length, hasComments, hasErrorHandling, language },
            source: 'local-fallback',
        };
    }

    async analyzeCodeQuality(code, language = 'javascript') {
        const trimmed = String(code || '').trim();
        if (!trimmed) {
            return {
                score: 100,
                issues: [],
                suggestions: ['No code to analyze'],
                metrics: { lines: 0 },
                source: 'local-fallback',
            };
        }

        const cfg = await AiConfigService.getResolvedConfig();
        const canUseAi = cfg.hasApiKey && cfg.chatEnabled !== false;

        if (canUseAi) {
            try {
                const prompt = `You are a senior code reviewer. Analyze this ${language} code and return ONLY valid JSON:
{
  "score": number (0-100),
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "metrics": { "lines": number, "hasComments": boolean, "hasErrorHandling": boolean }
}

CODE:
${trimmed.slice(0, 12000)}`;

                const text = await LlmClientService.chat(prompt);
                const parsed = this._parseJsonFromText(text);
                if (parsed && typeof parsed.score === 'number') {
                    return {
                        score: Math.max(0, Math.min(100, Math.round(parsed.score))),
                        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
                        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
                        metrics: parsed.metrics || { lines: trimmed.split('\n').length },
                        source: 'ai',
                    };
                }
            } catch (error) {
                console.error('AI code analysis error:', error.message);
                if (!(await this._allowsLocalFallback())) {
                    throw error;
                }
            }
        }

        const local = this._localCodeAnalysis(trimmed, language);
        if (!canUseAi) {
            local.fallbackReason = toDisplayText(
                `${FAME} not configured — showing local code health check. Configure Admin → Settings → AI Configuration for deeper review.`
            );
        }
        return local;
    }
}

module.exports = new GeminiDependencyService();
