const express = require('express');
const router = express.Router();
const { generateMicroAppCode } = require('../services/codeGenerator');
const aiAgent = require('../ai-agent/core');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/apps/generate
 * @desc    Generate a complete micro application
 * @access  Public
 */
router.post('/generate', asyncHandler(async (req, res) => {
    const { analysis, configuration } = req.body;

    if (!analysis) {
        return res.status(400).json({
            success: false,
            error: 'Analysis data is required'
        });
    }

    try {
        const microApp = await aiAgent.generateMicroApp(analysis, configuration || {});

        res.status(201).json({
            success: true,
            data: microApp,
            message: 'Micro application generated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: `Failed to generate micro application: ${error.message}`
        });
    }
}));

/**
 * @route   GET /api/apps/examples
 * @desc    Get example micro applications
 * @access  Public
 */
router.get('/examples', asyncHandler(async (req, res) => {
    const examples = [
        {
            id: 'contact-form-app',
            name: 'Contact Form App',
            description: 'Simple contact form with email notifications',
            category: 'forms',
            features: ['Real-time validation', 'Email notifications', 'Spam protection', 'Mobile responsive'],
            complexity: 'low',
            estimatedTime: '2-3 hours'
        },
        {
            id: 'expense-tracker',
            name: 'Expense Tracker',
            description: 'Employee expense reporting with approval workflow',
            category: 'finance',
            features: ['Receipt upload', 'Approval workflow', 'PDF reports', 'Email notifications'],
            complexity: 'medium',
            estimatedTime: '6-8 hours'
        },
        {
            id: 'inventory-manager',
            name: 'Inventory Manager',
            description: 'Product inventory tracking and management',
            category: 'operations',
            features: ['Barcode scanning', 'Stock alerts', 'Reports', 'Multi-location support'],
            complexity: 'high',
            estimatedTime: '10-12 hours'
        }
    ];

    res.json({
        success: true,
        data: examples,
        message: 'Example applications retrieved successfully'
    });
}));

module.exports = router;