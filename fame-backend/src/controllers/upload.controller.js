const CloudinaryService = require('../services/cloudinary.service');
const ApiResponse = require('../utils/apiResponse.util');

class UploadController {
    async uploadProjectFiles(req, res, next) {
        try {
            const { projectId } = req.params;
            const version = req.body.version || '1';

            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No files uploaded'
                });
            }

            const results = await CloudinaryService.uploadProjectFiles(req.files, projectId, version);

            const codeSize = req.files.codeZip ? req.files.codeZip[0].size : 0;
            let pdfSize = 0;
            ['srsPdf', 'designPdf', 'manualPdf'].forEach(field => {
                if (req.files[field]) pdfSize += req.files[field][0].size;
            });

            return res.status(200).json({
                success: true,
                message: "Project uploaded successfully",
                data: {
                    files: Object.keys(results).reduce((acc, key) => {
                        acc[key] = results[key].secure_url;
                        return acc;
                    }, {}),
                    codeSize,
                    pdfSize,
                    totalSize: codeSize + pdfSize
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    async deleteFile(req, res, next) {
        try {
            const result = await CloudinaryService.deleteFile(req.params.publicId, true);
            ApiResponse.success(res, result, 'File removed successfully');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UploadController();