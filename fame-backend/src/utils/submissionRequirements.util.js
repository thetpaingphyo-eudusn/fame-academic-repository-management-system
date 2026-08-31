const FILE_SPECS = {
    code: { field: 'codeZip', label: 'Source Code (ZIP)' },
    srs: { field: 'srsPdf', label: 'SRS Document (PDF)' },
    design: { field: 'designPdf', label: 'Design Document (PDF)' },
    manual: { field: 'manualPdf', label: 'User Manual (PDF)' },
    presentation: { field: 'presentationPdf', label: 'Presentation (PDF/PPT)' },
    video: { field: 'videoFile', label: 'Video Demo' }
};

const DEFAULT_REQUIRED_FILES = ['code', 'srs', 'design'];

const normalizeRequiredFiles = (requiredFiles) => {
    if (!Array.isArray(requiredFiles) || requiredFiles.length === 0) {
        return [...DEFAULT_REQUIRED_FILES];
    }
    return requiredFiles.filter((key) => FILE_SPECS[key]);
};

const getMissingSubmissionFiles = (requiredFiles, uploadedFiles = {}) => {
    const required = normalizeRequiredFiles(requiredFiles);
    const missing = [];

    required.forEach((key) => {
        const spec = FILE_SPECS[key];
        if (!spec) return;
        if (!uploadedFiles[spec.field] || !uploadedFiles[spec.field][0]) {
            missing.push(spec.label);
        }
    });

    return missing;
};

const getRequiredFileLabel = (key) => {
    if (key === 'srs') return 'SRS Document';
    if (key === 'code') return 'Source Code';
    return FILE_SPECS[key]?.label?.replace(/\s*\([^)]*\)/, '') || key;
};

module.exports = {
    FILE_SPECS,
    DEFAULT_REQUIRED_FILES,
    normalizeRequiredFiles,
    getMissingSubmissionFiles,
    getRequiredFileLabel
};
