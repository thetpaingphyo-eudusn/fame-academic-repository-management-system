const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const fileName = file.originalname.toLowerCase();
    const isZip = fileName.endsWith('.zip');
    const isPdf = fileName.endsWith('.pdf');
    const isPresentation = fileName.endsWith('.ppt') || fileName.endsWith('.pptx');
    const isVideo = fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.webm');
    const isDepFile = fileName === 'package.json' || fileName === 'requirements.txt' || fileName.endsWith('.json');
    
    if (isZip || isPdf || isPresentation || isVideo || isDepFile) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file: ${fileName}. Only ZIP, PDF, PPT, video, and dependency files allowed.`), false);
    }
};

const uploadProjectFiles = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
}).fields([
    { name: 'codeZip', maxCount: 1 },
    { name: 'srsPdf', maxCount: 1 },
    { name: 'designPdf', maxCount: 1 },
    { name: 'manualPdf', maxCount: 1 },
    { name: 'presentationPdf', maxCount: 1 },
    { name: 'videoFile', maxCount: 1 },
    { name: 'dependencyFile', maxCount: 1 }
]);

module.exports = { uploadProjectFiles };