const express = require('express');
const router = express.Router();
const { analyzeSpreadsheet } = require('../services/spreadsheetAnalyzer');
const { asyncHandler } = require('../middleware/errorHandler');
const { endpointRateLimitMiddleware } = require('../middleware/rateLimiter');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = /\\.(xlsx|xls|csv)$/i;
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
            'application/csv'
        ];

        const extname = allowedExtensions.test(path.extname(file.originalname));
        const mimetype = allowedMimeTypes.includes(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
        }
    }
});

/**
 * @route   POST /api/sheets/upload
 * @desc    Upload and analyze spreadsheet file
 * @access  Public
 */
router.post('/upload', 
    endpointRateLimitMiddleware('/api/sheets/import'),
    upload.single('spreadsheet'),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        try {
            const analysis = await analyzeSpreadsheet(req.file);
            
            res.json({
                success: true,
                data: {
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    mimeType: req.file.mimetype,
                    analysis: analysis
                },
                message: 'Spreadsheet analyzed successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: `Failed to analyze spreadsheet: ${error.message}`
            });
        }
    })
);

/**
 * @route   POST /api/sheets/analyze-url
 * @desc    Analyze spreadsheet from Google Sheets URL
 * @access  Public
 */
router.post('/analyze-url',
    endpointRateLimitMiddleware('/api/sheets/import'),
    asyncHandler(async (req, res) => {
        const { url, accessToken } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'Google Sheets URL is required'
            });
        }

        try {
            // Extract spreadsheet ID from URL
            const spreadsheetId = extractSpreadsheetId(url);
            
            if (!spreadsheetId) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid Google Sheets URL'
                });
            }

            // Fetch spreadsheet data using Google Sheets API
            const spreadsheetData = await fetchGoogleSheet(spreadsheetId, accessToken);
            
            // Analyze the data
            const analysis = await analyzeSpreadsheet(spreadsheetData);

            res.json({
                success: true,
                data: {
                    spreadsheetId,
                    url,
                    analysis: analysis
                },
                message: 'Google Sheets analyzed successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: `Failed to analyze Google Sheets: ${error.message}`
            });
        }
    })
);

/**
 * @route   POST /api/sheets/convert-csv
 * @desc    Convert CSV text to analysis
 * @access  Public
 */
router.post('/convert-csv',
    endpointRateLimitMiddleware('/api/sheets/import'),
    asyncHandler(async (req, res) => {
        const { csvData, fileName } = req.body;

        if (!csvData) {
            return res.status(400).json({
                success: false,
                error: 'CSV data is required'
            });
        }

        try {
            const analysis = await analyzeSpreadsheet(csvData);

            res.json({
                success: true,
                data: {
                    fileName: fileName || 'uploaded.csv',
                    analysis: analysis
                },
                message: 'CSV data analyzed successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: `Failed to analyze CSV data: ${error.message}`
            });
        }
    })
);

/**
 * @route   GET /api/sheets/templates
 * @desc    Get available spreadsheet templates
 * @access  Public
 */
router.get('/templates', asyncHandler(async (req, res) => {
    const templates = [
        {
            id: 'contact-form',
            name: 'Contact Form',
            description: 'Basic contact information collection',
            fields: ['name', 'email', 'phone', 'message'],
            category: 'forms'
        },
        {
            id: 'employee-onboarding',
            name: 'Employee Onboarding',
            description: 'New employee information and documentation',
            fields: ['first_name', 'last_name', 'email', 'department', 'start_date', 'manager'],
            category: 'hr'
        },
        {
            id: 'expense-report',
            name: 'Expense Report',
            description: 'Business expense tracking and approval',
            fields: ['date', 'category', 'amount', 'description', 'receipt'],
            category: 'finance'
        },
        {
            id: 'inventory-management',
            name: 'Inventory Management',
            description: 'Product inventory tracking',
            fields: ['item_name', 'sku', 'quantity', 'price', 'supplier', 'category'],
            category: 'operations'
        },
        {
            id: 'customer-feedback',
            name: 'Customer Feedback',
            description: 'Customer satisfaction survey',
            fields: ['customer_name', 'rating', 'feedback', 'product', 'date'],
            category: 'customer-service'
        }
    ];

    res.json({
        success: true,
        data: templates,
        message: 'Templates retrieved successfully'
    });
}));

/**
 * @route   POST /api/sheets/generate-template
 * @desc    Generate spreadsheet template based on requirements
 * @access  Public
 */
router.post('/generate-template', asyncHandler(async (req, res) => {
    const { templateId, customFields, requirements } = req.body;

    if (!templateId && !customFields) {
        return res.status(400).json({
            success: false,
            error: 'Template ID or custom fields are required'
        });
    }

    try {
        const template = await generateSpreadsheetTemplate(templateId, customFields, requirements);

        res.json({
            success: true,
            data: template,
            message: 'Template generated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: `Failed to generate template: ${error.message}`
        });
    }
}));

/**
 * Extract spreadsheet ID from Google Sheets URL
 */
function extractSpreadsheetId(url) {
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

/**
 * Fetch Google Sheets data using API
 */
async function fetchGoogleSheet(spreadsheetId, accessToken) {
    const { google } = require('googleapis');
    
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'A:Z', // Get all data
        });
        
        return response.data.values;
    } catch (error) {
        throw new Error(`Failed to fetch Google Sheets data: ${error.message}`);
    }
}

/**
 * Generate spreadsheet template
 */
async function generateSpreadsheetTemplate(templateId, customFields, requirements) {
    const templates = {
        'contact-form': {
            name: 'Contact Form Template',
            headers: ['Name', 'Email', 'Phone', 'Company', 'Message', 'Date Submitted'],
            sampleData: [
                ['John Doe', 'john@example.com', '+1-555-0123', 'Acme Corp', 'Interested in your services', '2024-01-15'],
                ['Jane Smith', 'jane@example.com', '+1-555-0124', 'Beta LLC', 'Need more information', '2024-01-16']
            ]
        },
        'employee-onboarding': {
            name: 'Employee Onboarding Template',
            headers: ['First Name', 'Last Name', 'Email', 'Department', 'Position', 'Start Date', 'Manager', 'Employee ID'],
            sampleData: [
                ['Alice', 'Johnson', 'alice@company.com', 'Engineering', 'Software Developer', '2024-02-01', 'Bob Smith', 'EMP001'],
                ['Charlie', 'Brown', 'charlie@company.com', 'Marketing', 'Marketing Manager', '2024-02-15', 'Diana Prince', 'EMP002']
            ]
        },
        'expense-report': {
            name: 'Expense Report Template',
            headers: ['Date', 'Category', 'Description', 'Amount', 'Currency', 'Receipt Attached', 'Status'],
            sampleData: [
                ['2024-01-10', 'Travel', 'Flight to New York', '450.00', 'USD', 'Yes', 'Pending'],
                ['2024-01-11', 'Meals', 'Client dinner', '85.50', 'USD', 'Yes', 'Approved']
            ]
        }
    };

    if (templateId && templates[templateId]) {
        return templates[templateId];
    }

    // Generate custom template
    if (customFields) {
        return {
            name: 'Custom Template',
            headers: customFields.map(field => field.label || field.name),
            sampleData: [],
            customFields: customFields
        };
    }

    throw new Error('Invalid template ID or custom fields');
}

module.exports = router;