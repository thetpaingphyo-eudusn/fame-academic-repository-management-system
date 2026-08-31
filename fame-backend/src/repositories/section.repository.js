const BaseRepository = require('./base.repository');
const Section = require('../models/Section.model');

class SectionRepository extends BaseRepository {
    constructor() {
        super(Section);
    }

    // Get sections by department
    async getSectionsByDepartment(departmentId) {
        return await this.findAll(
            { departmentId, isActive: true },
            { sort: { sectionName: 1 } }
        );
    }

    // Get sections by academic year
    async getSectionsByYear(academicYear, departmentId = null) {
        const query = { academicYear, isActive: true };
        if (departmentId) query.departmentId = departmentId;
        
        return await this.findAll(query, { sort: { sectionName: 1 } });
    }

    // Get section by name
    async getSectionByName(sectionName, departmentId, academicYear) {
        return await this.findOne({
            sectionName,
            departmentId,
            academicYear,
            isActive: true
        });
    }

    // Get section with students
    async getSectionWithStudents(sectionId) {
        return await this.findById(sectionId).populate('students');
    }

    // Get section with courses
    async getSectionWithCourses(sectionId) {
        return await this.findById(sectionId).populate('courses');
    }

    // Get all active sections
    async getAllActiveSections() {
        return await this.findAll(
            { isActive: true },
            { sort: { departmentId: 1, sectionName: 1 } }
        );
    }

    // Get sections by department with counts
    async getSectionsWithCounts(departmentId) {
        const sections = await this.getSectionsByDepartment(departmentId);
        
        for (const section of sections) {
            const studentCount = await this.model.db.collection('users').countDocuments({
                sectionId: section._id,
                role: 'student',
                isActive: true
            });
            
            const courseCount = await this.model.db.collection('courses').countDocuments({
                sectionId: section._id,
                isActive: true
            });
            
            section._doc = {
                ...section._doc,
                studentCount,
                courseCount
            };
        }
        
        return sections;
    }

    // Get available sections (not full)
    async getAvailableSections(departmentId, year, maxStudents = 50) {
        const sections = await this.getSectionsByDepartment(departmentId);
        const available = [];
        
        for (const section of sections) {
            const studentCount = await this.model.db.collection('users').countDocuments({
                sectionId: section._id,
                year,
                role: 'student',
                isActive: true
            });
            
            if (studentCount < maxStudents) {
                available.push({
                    ...section._doc,
                    currentStudents: studentCount,
                    availableSlots: maxStudents - studentCount
                });
            }
        }
        
        return available;
    }

    // Update section capacity
    async updateCapacity(sectionId, maxStudents) {
        return await this.updateById(sectionId, { maxStudents });
    }

    // Get section statistics
    async getSectionStats(sectionId) {
        const stats = await this.aggregate([
            { $match: { _id: sectionId } },
            {
                $lookup: {
                    from: 'users',
                    let: { sectionId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$sectionId', '$$sectionId'] },
                                        { $eq: ['$role', 'student'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'students'
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: '_id',
                    foreignField: 'sectionId',
                    as: 'courses'
                }
            },
            {
                $project: {
                    sectionName: 1,
                    departmentId: 1,
                    academicYear: 1,
                    studentCount: { $size: '$students' },
                    courseCount: { $size: '$courses' },
                    maxStudents: 1
                }
            }
        ]);
        
        return stats[0] || null;
    }

    // Get all departments with section summary
    async getAllDepartmentsSectionsSummary() {
        const summary = await this.aggregate([
            {
                $lookup: {
                    from: 'departments',
                    localField: 'departmentId',
                    foreignField: '_id',
                    as: 'department'
                }
            },
            { $unwind: '$department' },
            {
                $group: {
                    _id: '$departmentId',
                    departmentName: { $first: '$department.name' },
                    sections: {
                        $push: {
                            id: '$_id',
                            name: '$sectionName',
                            academicYear: '$academicYear'
                        }
                    },
                    totalSections: { $sum: 1 }
                }
            }
        ]);
        
        return summary;
    }

    // Bulk create sections
    async bulkCreateSections(sectionsData) {
        return await this.model.insertMany(sectionsData);
    }

    // Get sections by year level
    async getSectionsByYearLevel(departmentId, yearLevel) {
        // This would require a relationship between sections and years
        // Assuming sections have a yearLevel field
        return await this.findAll(
            { departmentId, yearLevel, isActive: true },
            { sort: { sectionName: 1 } }
        );
    }

    // Archive inactive sections
    async archiveInactiveSections() {
        return await this.updateMany(
            { isActive: false },
            { archivedAt: new Date() }
        );
    }

    // Check if section exists
    async sectionExists(sectionName, departmentId, academicYear) {
        const section = await this.findOne({
            sectionName,
            departmentId,
            academicYear
        });
        return !!section;
    }

    // Get next available section name
    async getNextSectionName(departmentId, academicYear) {
        const sections = await this.getSectionsByYear(academicYear, departmentId);
        const existingNames = sections.map(s => s.sectionName);
        
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        for (const letter of letters) {
            if (!existingNames.includes(letter)) {
                return letter;
            }
        }
        
        return null; // No available section letters
    }
}

module.exports = new SectionRepository();