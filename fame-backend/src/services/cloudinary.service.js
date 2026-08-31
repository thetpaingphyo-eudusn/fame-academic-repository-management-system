const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

class CloudinaryService {
    // 1. Added isRaw parameter to dynamically switch resource types
    async uploadFile(buffer, folder, fileName = null, isRaw = false) {
        try {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: `fame/${folder}`,
                        public_id: fileName || Date.now().toString(),
                        // Explicitly set 'raw' for ZIPs, 'auto' for PDFs/Images
                        resource_type: isRaw ? 'raw' : 'auto' 
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                streamifier.createReadStream(buffer).pipe(uploadStream);
            });
        } catch (error) {
            throw new Error(`Cloudinary upload failed: ${error.message}`);
        }
    }

    // Upload code ZIP file - Passes true for isRaw
    async uploadCodeZip(buffer, projectId, version) {
        return await this.uploadFile(buffer, `projects/${projectId}/code`, `v${version}_code`, true);
    }

    // Upload PDF file - Passes false for isRaw (auto works perfectly for PDFs)
    async uploadPDF(buffer, projectId, type, version) {
        return await this.uploadFile(buffer, `projects/${projectId}/pdfs`, `${type}_v${version}`, false);
    }

    // Upload project files (multiple)
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
            const extension = originalName.includes('.') ? originalName.split('.').pop() : 'pdf';
            uploadedFiles.presentationPdf = await this.uploadFile(
                files.presentationPdf[0].buffer,
                `projects/${projectId}/presentations`,
                `presentation_v${version}.${extension}`,
                false
            );
        }
        if (files.videoFile) {
            uploadedFiles.videoFile = await this.uploadFile(files.videoFile[0].buffer, `projects/${projectId}/videos`, `v${version}_video`, true);
        }
        
        return uploadedFiles;
    }

    // Delete file from Cloudinary
    async deleteFile(publicId, isRaw = false) {
        try {
            // Note: Cloudinary also requires resource_type when deleting raw files!
            const options = isRaw ? { resource_type: 'raw' } : {};
            const result = await cloudinary.uploader.destroy(publicId, options);
            return result;
        } catch (error) {
            throw new Error(`Cloudinary delete failed: ${error.message}`);
        }
    }

    // Delete folder
    async deleteFolder(folderPath) {
        try {
            const result = await cloudinary.api.delete_folder(folderPath);
            return result;
        } catch (error) {
            throw new Error(`Cloudinary delete folder failed: ${error.message}`);
        }
    }

    // Get file URL
    getFileUrl(publicId, options = {}) {
        return cloudinary.url(publicId, options);
    }

    // Get optimized PDF URL
    getPdfUrl(publicId) {
        return cloudinary.url(publicId, {
            secure: true,
            resource_type: 'raw'
        });
    }

    // Get thumbnail URL for preview
    getThumbnailUrl(publicId) {
        return cloudinary.url(publicId, {
            width: 200,
            height: 200,
            crop: 'thumb',
            secure: true
        });
    }
}

module.exports = new CloudinaryService();