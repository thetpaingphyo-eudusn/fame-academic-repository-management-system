const BaseRepository = require('./base.repository');
const DocumentEmbedding = require('../models/DocumentEmbedding.model');

class DocumentEmbeddingRepository extends BaseRepository {
    constructor() {
        super(DocumentEmbedding);
    }

    // Save embedding for a document chunk
    async saveEmbedding(projectId, versionId, documentType, chunkIndex, totalChunks, originalText, embeddingVector, textLength, language = 'en') {
        return await this.create({
            projectId,
            versionId,
            documentType,
            chunkIndex,
            totalChunks,
            originalText,
            embeddingVector,
            textLength,
            language,
            isProcessed: true,
            processedAt: new Date()
        });
    }

    // Get embeddings by project
    async getEmbeddingsByProject(projectId) {
        return await this.findAll(
            { projectId },
            { sort: { documentType: 1, chunkIndex: 1 } }
        );
    }

    // Get embeddings by version
    async getEmbeddingsByVersion(versionId) {
        return await this.findAll(
            { versionId },
            { sort: { documentType: 1, chunkIndex: 1 } }
        );
    }

    // Get embeddings by document type
    async getEmbeddingsByType(projectId, documentType) {
        return await this.findAll(
            { projectId, documentType },
            { sort: { chunkIndex: 1 } }
        );
    }

    // Get all embedding vectors for semantic search
    async getAllEmbeddingVectors(documentType = null) {
        const filter = { isProcessed: true };
        if (documentType) filter.documentType = documentType;
        
        const embeddings = await this.findAll(filter);
        
        return embeddings.map(emb => ({
            id: emb._id,
            projectId: emb.projectId,
            documentType: emb.documentType,
            text: emb.originalText,
            vector: emb.embeddingVector,
            metadata: {
                versionId: emb.versionId,
                chunkIndex: emb.chunkIndex
            }
        }));
    }

    // Find similar documents by vector similarity
    async findSimilarVectors(targetVector, limit = 10, similarityThreshold = 0.7) {
        // Note: For production, use MongoDB Atlas Vector Search
        // This is a simplified version for local development
        const allVectors = await this.getEmbeddingVectors();
        
        const similarities = [];
        for (const item of allVectors) {
            const similarity = this.cosineSimilarity(targetVector, item.vector);
            if (similarity >= similarityThreshold) {
                similarities.push({
                    ...item,
                    similarity
                });
            }
        }
        
        similarities.sort((a, b) => b.similarity - a.similarity);
        return similarities.slice(0, limit);
    }

    // Cosine similarity calculation
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

    // Delete embeddings by project
    async deleteEmbeddingsByProject(projectId) {
        return await this.deleteMany({ projectId });
    }

    // Delete embeddings by version
    async deleteEmbeddingsByVersion(versionId) {
        return await this.deleteMany({ versionId });
    }

    // Get unprocessed documents (needing embedding generation)
    async getUnprocessedDocuments() {
        return await this.findAll(
            { isProcessed: false },
            { limit: 100 }
        );
    }

    // Mark as processed
    async markAsProcessed(embeddingId) {
        return await this.updateById(embeddingId, {
            isProcessed: true,
            processedAt: new Date()
        });
    }

    // Get embedding statistics by project
    async getEmbeddingStats(projectId) {
        const result = await this.aggregate([
            { $match: { projectId: projectId } },
            {
                $group: {
                    _id: '$documentType',
                    chunks: { $sum: 1 },
                    totalTextLength: { $sum: '$textLength' }
                }
            }
        ]);
        return result;
    }

    // Get total embeddings count
    async getTotalEmbeddingsCount() {
        return await this.count({ isProcessed: true });
    }

    // Search by text (simple keyword search - fallback)
    async searchByKeyword(keyword, documentType = null) {
        const filter = {
            originalText: { $regex: keyword, $options: 'i' },
            isProcessed: true
        };
        if (documentType) filter.documentType = documentType;
        
        return await this.findAll(filter, {
            limit: 50,
            sort: { processedAt: -1 }
        });
    }

    // Add this method to DocumentEmbeddingRepository class
async deleteMany(filter) {
    try {
        return await this.model.deleteMany(filter);
    } catch (error) {
        console.error('DeleteMany error:', error);
        throw error;
    }
}
}

module.exports = new DocumentEmbeddingRepository();