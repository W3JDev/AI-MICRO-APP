const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const submissionController = require('../controllers/submissionController');
const { asyncHandler } = require('../middleware/errorHandler');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/submissions/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt|csv|xlsx|xls/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Allowed types: images, PDF, documents, spreadsheets'));
        }
    }
});

/**
 * @route   POST /api/submissions
 * @desc    Create a new submission
 * @access  Public
 */
router.post('/', upload.array('files', 5), asyncHandler(submissionController.create));

/**
 * @route   GET /api/submissions/:id
 * @desc    Get submission by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(submissionController.getById));

/**
 * @route   GET /api/submissions
 * @desc    Get all submissions with pagination and filtering
 * @access  Public
 */
router.get('/', asyncHandler(submissionController.getAll));

/**
 * @route   PUT /api/submissions/:id/status
 * @desc    Update submission status
 * @access  Public
 */
router.put('/:id/status', asyncHandler(submissionController.updateStatus));

/**
 * @route   DELETE /api/submissions/:id
 * @desc    Delete submission
 * @access  Public
 */
router.delete('/:id', asyncHandler(submissionController.delete));

/**
 * @route   POST /api/submissions/pdf
 * @desc    Generate PDF for submission data
 * @access  Public
 */
router.post('/pdf', asyncHandler(submissionController.generatePDF));

/**
 * @route   POST /api/submissions/email
 * @desc    Send email copy of submission
 * @access  Public
 */
router.post('/email', asyncHandler(submissionController.sendEmailCopy));

/**
 * @route   GET /api/submissions/stats/overview
 * @desc    Get submission statistics
 * @access  Public
 */
router.get('/stats/overview', asyncHandler(submissionController.getStats));

module.exports = router;