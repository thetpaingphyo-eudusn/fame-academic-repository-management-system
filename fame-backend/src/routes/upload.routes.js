const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        cb(null, true); // Accept all files
    }
}).single('file');

router.use(protect);

router.post('/file', upload, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Determine resource type based on file
        const isPdf = req.file.mimetype === 'application/pdf';
        const isImage = req.file.mimetype.startsWith('image/');
        const resourceType = (isPdf || isImage) ? 'auto' : 'raw';
        
        console.log('Uploading:', {
            name: req.file.originalname,
            type: req.file.mimetype,
            size: req.file.size,
            resourceType
        });

        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'fame/uploads',
                    resource_type: resourceType,
                    use_filename: true,
                    unique_filename: true
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url: result.secure_url,
                publicId: result.public_id,
                size: result.bytes,
                resourceType: resourceType
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/file/:publicId', async (req, res) => {
    try {
        await cloudinary.uploader.destroy(req.params.publicId);
        res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;