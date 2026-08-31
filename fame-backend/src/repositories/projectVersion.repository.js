const BaseRepository = require('./base.repository');
const ProjectVersion = require('../models/ProjectVersion.model');

class ProjectVersionRepository extends BaseRepository {
    constructor() {
        super(ProjectVersion);
    }

    // Get versions by project ID
    async getVersionsByProject(projectId) {
        return await this.findAll(
            { projectId },
            { sort: { versionNumber: -1 } }
        );
    }

    // Get latest version of project
    async getLatestVersion(projectId) {
        return await this.findOne(
            { projectId, isLatest: true }
        );
    }

    // Get specific version
    async getVersion(projectId, versionNumber) {
        return await this.findOne({ projectId, versionNumber });
    }

    // Create new version
    async createVersion(projectId, versionNumber, filesData, submittedBy) {
        // First, unset isLatest flag on previous versions
        await this.updateMany(
            { projectId, isLatest: true },
            { isLatest: false }
        );

        // Create new version
        return await this.create({
            projectId,
            versionNumber,
            ...filesData,
            submittedBy,
            isLatest: true
        });
    }

    // Get version count for project
    async getVersionCount(projectId) {
        return await this.count({ projectId });
    }

    // Compare two versions
    async compareVersions(projectId, versionA, versionB) {
        const vA = await this.getVersion(projectId, versionA);
        const vB = await this.getVersion(projectId, versionB);
        
        if (!vA || !vB) {
            throw new Error('Version not found');
        }

        return {
            versionA: vA,
            versionB: vB,
            differences: {
                codeChanged: vA.codeZipUrl !== vB.codeZipUrl,
                srsChanged: vA.srsPdfUrl !== vB.srsPdfUrl,
                designChanged: vA.designPdfUrl !== vB.designPdfUrl,
                manualChanged: vA.manualPdfUrl !== vB.manualPdfUrl
            }
        };
    }

    // Update version dependencies after scan
    async updateDependencies(versionId, dependencies, healthScore, warnings) {
        return await this.updateById(versionId, {
            dependencies,
            codeHealthScore: healthScore,
            healthWarnings: warnings
        });
    }

    // Delete all versions of a project
    async deleteAllVersions(projectId) {
        return await this.deleteMany({ projectId });
    }

    // Get versions by date range
    async getVersionsByDateRange(startDate, endDate) {
        return await this.findAll(
            { submittedAt: { $gte: startDate, $lte: endDate } },
            { sort: { submittedAt: -1 }, populate: 'projectId' }
        );
    }

    // Get versions needing health check
    async getVersionsWithoutHealthCheck() {
        return await this.findAll({
            codeHealthScore: { $eq: null },
            isLatest: true
        });
    }

    async saveAiAnalysis(versionId, analysisData) {
        const recommendationList = analysisData.recommendations || [];
        const warningMessages = recommendationList.map((item) =>
            typeof item === 'string' ? item : item.message
        );

        return await this.updateById(versionId, {
            dependencies: analysisData.dependencies || [],
            codeHealthScore: analysisData.healthScore ?? null,
            healthWarnings: warningMessages,
            dependencyAnalysis: {
                source: analysisData.source || 'gemini',
                summary: analysisData.summary || null,
                dependencies: analysisData.dependencies || [],
                recommendations: recommendationList,
                analyzedAt: analysisData.analyzedAt || new Date()
            }
        });
    }
}

module.exports = new ProjectVersionRepository();