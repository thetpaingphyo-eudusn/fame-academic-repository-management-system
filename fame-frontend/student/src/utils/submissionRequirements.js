export const FILE_SPECS = {
  code: {
    key: 'code',
    field: 'codeZip',
    label: 'Source Code (ZIP)',
    shortLabel: 'Source Code',
    accept: '.zip',
    kind: 'zip',
    icon: 'code',
  },
  srs: {
    key: 'srs',
    field: 'srsPdf',
    label: 'SRS Document (PDF)',
    shortLabel: 'SRS Document',
    accept: '.pdf',
    kind: 'pdf',
    icon: 'file',
  },
  design: {
    key: 'design',
    field: 'designPdf',
    label: 'Design Document (PDF)',
    shortLabel: 'Design Document',
    accept: '.pdf',
    kind: 'pdf',
    icon: 'file',
  },
  manual: {
    key: 'manual',
    field: 'manualPdf',
    label: 'User Manual (PDF)',
    shortLabel: 'User Manual',
    accept: '.pdf',
    kind: 'pdf',
    icon: 'file',
  },
  presentation: {
    key: 'presentation',
    field: 'presentationPdf',
    label: 'Presentation (PDF/PPT)',
    shortLabel: 'Presentation',
    accept: '.pdf,.ppt,.pptx',
    kind: 'presentation',
    icon: 'file',
  },
  video: {
    key: 'video',
    field: 'videoFile',
    label: 'Video Demo',
    shortLabel: 'Video Demo',
    accept: '.mp4,.mov,.webm',
    kind: 'video',
    icon: 'file',
  },
};

export const DEFAULT_REQUIRED_FILES = ['code', 'srs', 'design'];

export const normalizeRequiredFiles = (requiredFiles) => {
  if (!Array.isArray(requiredFiles) || requiredFiles.length === 0) {
    return [...DEFAULT_REQUIRED_FILES];
  }
  return requiredFiles.filter((key) => FILE_SPECS[key]);
};

export const getRequiredFileSpecs = (requiredFiles) =>
  normalizeRequiredFiles(requiredFiles).map((key) => FILE_SPECS[key]);

export const getRequiredFileLabel = (key) =>
  FILE_SPECS[key]?.shortLabel || key;

export const createEmptySubmissionFiles = () => ({
  codeZip: null,
  srsPdf: null,
  designPdf: null,
  manualPdf: null,
  presentationPdf: null,
  videoFile: null,
  dependencyFile: null,
});

export const validateSubmissionFiles = (requiredFiles, files = {}) => {
  const missing = [];
  getRequiredFileSpecs(requiredFiles).forEach((spec) => {
    if (!files[spec.field]) {
      missing.push(spec.label);
    }
  });
  return missing;
};

export const appendSubmissionFiles = (formData, files = {}) => {
  getRequiredFileSpecs(Object.keys(FILE_SPECS)).forEach((spec) => {
    if (files[spec.field]) {
      formData.append(spec.field, files[spec.field]);
    }
  });
  if (files.dependencyFile) {
    formData.append('dependencyFile', files.dependencyFile);
  }
};
