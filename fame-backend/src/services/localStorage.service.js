const fs = require('fs');
const path = require('path');

class LocalStorageService {
    constructor() {
        // Base folder where files will be stored locally
        this.baseUploadDir = process.env.LOCAL_UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
    }

    ensureDirSync(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Save a single file buffer to local disk.
     * Returns an object that mimics the important parts
     * of Cloudinary's response (secure_url, original_filename, bytes).
     */
    async saveFile(buffer, relativeFolder, fileName) {
        const folderPath = path.join(this.baseUploadDir, relativeFolder);
        this.ensureDirSync(folderPath);

        const filePath = path.join(folderPath, fileName);

        await fs.promises.writeFile(filePath, buffer);

        // Build a URL-like path that the API layer can return.
        // You can expose this folder via express.static in your server.
        const publicPath = `/uploads/${relativeFolder}/${fileName}`.replace(/\\/g, '/');

        return {
            secure_url: publicPath,
            original_filename: fileName,
            bytes: buffer.length
        };
    }

    async uploadCodeZip(buffer, projectId, version) {
        const relativeFolder = path.join('projects', String(projectId), 'code');
        const fileName = `v${version}_code.zip`;
        return this.saveFile(buffer, relativeFolder, fileName);
    }

    async uploadPDF(buffer, projectId, type, version) {
        const relativeFolder = path.join('projects', String(projectId), 'pdfs');
        const fileName = `${type}_v${version}.pdf`;
        return this.saveFile(buffer, relativeFolder, fileName);
    }

    async uploadMedia(buffer, projectId, type, version, extension = 'bin') {
        const relativeFolder = path.join('projects', String(projectId), type);
        const fileName = `${type}_v${version}.${extension}`;
        return this.saveFile(buffer, relativeFolder, fileName);
    }

    /**
     * Upload all project files locally.
     * Signature and returned structure mirror CloudinaryService.uploadProjectFiles
     * so the controller code can stay almost identical.
     */
    async uploadProjectFiles(files, projectId, version) {
        const uploadedFiles = {};

        if (files.codeZip) {
            uploadedFiles.codeZip = await this.uploadCodeZip(files.codeZip[0].buffer, projectId, version);
        }
        if (files.srsPdf) {
            uploadedFiles.srsPdf = await this.uploadPDF(files.srsPdf[0].buffer, projectId, 'srs', version);
        }
        if (files.designPdf) {
            uploadedFiles.designPdf = await this.uploadPDF(files.designPdf[0].buffer, projectId, 'design', version);
        }
        if (files.manualPdf) {
            uploadedFiles.manualPdf = await this.uploadPDF(files.manualPdf[0].buffer, projectId, 'manual', version);
        }
        if (files.presentationPdf) {
            const originalName = files.presentationPdf[0].originalname || 'presentation.pdf';
            const extension = path.extname(originalName).replace('.', '') || 'pdf';
            uploadedFiles.presentationPdf = await this.uploadMedia(
                files.presentationPdf[0].buffer,
                projectId,
                'presentations',
                version,
                extension
            );
        }
        if (files.videoFile) {
            const originalName = files.videoFile[0].originalname || 'video.mp4';
            const extension = path.extname(originalName).replace('.', '') || 'mp4';
            uploadedFiles.videoFile = await this.uploadMedia(files.videoFile[0].buffer, projectId, 'videos', version, extension);
        }

        return uploadedFiles;
    }
}

module.exports = new LocalStorageService();

