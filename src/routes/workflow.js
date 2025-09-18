const express = require('express');
const router = express.Router();
const { createWorkflow } = require('../services/workflowBuilder');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/workflow/create
 * @desc    Create a new workflow based on analysis
 * @access  Public
 */
router.post('/create', asyncHandler(async (req, res) => {
    const { analysis, configuration } = req.body;

    if (!analysis) {
        return res.status(400).json({
            success: false,
            error: 'Analysis data is required'
        });
    }

    try {
        const workflow = await createWorkflow(analysis, configuration || {});

        res.status(201).json({
            success: true,
            data: workflow,
            message: 'Workflow created successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: `Failed to create workflow: ${error.message}`
        });
    }
}));

/**
 * @route   GET /api/workflow/templates
 * @desc    Get available workflow templates
 * @access  Public
 */
router.get('/templates', asyncHandler(async (req, res) => {
    const templates = [
        {
            id: 'basic',
            name: 'Basic Form Submission',
            description: 'Simple form submission with validation and storage',
            useCase: 'Contact forms, feedback forms, simple data collection',
            steps: ['Form Submission', 'Data Validation', 'Data Storage', 'Confirmation Email'],
            estimatedTime: '2-4 hours'
        },
        {
            id: 'approval',
            name: 'Approval Workflow',
            description: 'Multi-step approval process with notifications',
            useCase: 'Expense reports, leave requests, purchase orders',
            steps: ['Form Submission', 'Initial Validation', 'Manager Review', 'Senior Approval', 'Final Processing', 'Completion Notification'],
            estimatedTime: '4-8 hours'
        },
        {
            id: 'document',
            name: 'Document Processing',
            description: 'Document upload, processing, and storage workflow',
            useCase: 'Document management, file processing, content archival',
            steps: ['Document Upload', 'Virus Scan', 'Document Analysis', 'Cloud Storage', 'Index Creation', 'Notification'],
            estimatedTime: '3-6 hours'
        },
        {
            id: 'invoice',
            name: 'Invoice Generation',
            description: 'Invoice creation and approval workflow',
            useCase: 'Billing, invoicing, payment processing',
            steps: ['Invoice Data Entry', 'Data Validation', 'PDF Generation', 'Finance Review', 'Digital Signature', 'Email Delivery', 'Payment Tracking'],
            estimatedTime: '6-10 hours'
        }
    ];

    res.json({
        success: true,
        data: templates,
        message: 'Workflow templates retrieved successfully'
    });
}));

module.exports = router;