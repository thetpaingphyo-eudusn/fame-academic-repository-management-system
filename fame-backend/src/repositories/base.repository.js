/**
 * Base Repository - Abstract class for common database operations
 * All other repositories will extend this class
 */

class BaseRepository {
    constructor(model) {
        this.model = model;
    }

    // Create new document
    async create(data) {
        try {
            const document = await this.model.create(data);
            return document;
        } catch (error) {
            throw error;
        }
    }

    // Find by ID (supports select string or { select, populate } options)
    async findById(id, options = null) {
        try {
            let query = this.model.findById(id);
            if (typeof options === 'string') {
                query = query.select(options);
            } else if (options && typeof options === 'object') {
                if (options.select) {
                    query = query.select(options.select);
                }
                if (options.populate) {
                    query = query.populate(options.populate);
                }
            }
            return await query;
        } catch (error) {
            throw error;
        }
    }

    // Find one by filter
    async findOne(filter, select = null) {
        try {
            let query = this.model.findOne(filter);
            if (select) {
                query = query.select(select);
            }
            return await query;
        } catch (error) {
            throw error;
        }
    }

    // Find all with filters
    async findAll(filter = {}, options = {}) {
        try {
            let query = this.model.find(filter);
            
            if (options.select) {
                query = query.select(options.select);
            }
            if (options.sort) {
                query = query.sort(options.sort);
            }
            if (options.limit) {
                query = query.limit(options.limit);
            }
            if (options.skip) {
                query = query.skip(options.skip);
            }
            if (options.populate) {
                query = query.populate(options.populate);
            }
            
            return await query;
        } catch (error) {
            throw error;
        }
    }

    // Update by ID
    async updateById(id, data, options = { new: true }) {
        try {
            return await this.model.findByIdAndUpdate(id, data, options);
        } catch (error) {
            throw error;
        }
    }

    // Update one by filter
    async updateOne(filter, data, options = { new: true }) {
        try {
            return await this.model.findOneAndUpdate(filter, data, options);
        } catch (error) {
            throw error;
        }
    }

    // Update many
    async updateMany(filter, data) {
        try {
            return await this.model.updateMany(filter, data);
        } catch (error) {
            throw error;
        }
    }

    // Delete by ID
    async deleteById(id) {
        try {
            return await this.model.findByIdAndDelete(id);
        } catch (error) {
            throw error;
        }
    }

    // Delete one by filter
    async deleteOne(filter) {
        try {
            return await this.model.findOneAndDelete(filter);
        } catch (error) {
            throw error;
        }
    }

    // Count documents
    async count(filter = {}) {
        try {
            return await this.model.countDocuments(filter);
        } catch (error) {
            throw error;
        }
    }

    // Check if exists
    async exists(filter) {
        try {
            return await this.model.exists(filter);
        } catch (error) {
            throw error;
        }
    }

    // Aggregate
    async aggregate(pipeline) {
        try {
            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = BaseRepository;