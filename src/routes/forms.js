const express = require('express');
const router = express.Router();
const { analyzeForm } = require('../services/formAnalyzer');
const { asyncHandler } = require('../middleware/errorHandler');
const { endpointRateLimitMiddleware } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/forms/analyze
 * @desc    Analyze form data (Google Forms, Microsoft Forms, or custom)
 * @access  Public
 */
router.post('/analyze',
    endpointRateLimitMiddleware('/api/forms/analyze'),
    asyncHandler(async (req, res) => {
        const { formData, source, formUrl } = req.body;

        if (!formData && !formUrl) {
            return res.status(400).json({
                success: false,
                error: 'Form data or form URL is required'
            });
        }

        try {
            let analysis;
            
            if (formUrl) {
                // Fetch form data from URL
                const fetchedData = await fetchFormFromUrl(formUrl, source);
                analysis = await analyzeForm(fetchedData);
            } else {
                // Analyze provided form data
                analysis = await analyzeForm(formData);
            }

            res.json({
                success: true,
                data: {
                    source: analysis.source,
                    analysis: analysis
                },
                message: 'Form analyzed successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: `Failed to analyze form: ${error.message}`
            });
        }
    })
);

/**
 * @route   POST /api/forms/google/import
 * @desc    Import Google Form using Forms API
 * @access  Public
 */
router.post('/google/import',
    endpointRateLimitMiddleware('/api/forms/analyze'),
    asyncHandler(async (req, res) => {
        const { formId, accessToken } = req.body;

        if (!formId) {
            return res.status(400).json({
                success: false,
                error: 'Google Form ID is required'
            });
        }

        try {
            const formData = await fetchGoogleForm(formId, accessToken);
            const analysis = await analyzeForm(formData);

            res.json({
                success: true,
                data: {
                    formId,
                    source: 'google-forms',
                    analysis: analysis
                },
                message: 'Google Form imported and analyzed successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: `Failed to import Google Form: ${error.message}`
            });
        }
    })
);

/**
 * @route   POST /api/forms/microsoft/import
 * @desc    Import Microsoft Form using Graph API
 * @access  Public
 */
router.post('/microsoft/import',
    endpointRateLimitMiddleware('/api/forms/analyze'),
    asyncHandler(async (req, res) => {
        const { formId, accessToken } = req.body;

        if (!formId) {
            return res.status(400).json({
                success: false,
                error: 'Microsoft Form ID is required'
            });
        }

        try {
            const formData = await fetchMicrosoftForm(formId, accessToken);
            const analysis = await analyzeForm(formData);

            res.json({
                success: true,
                data: {
                    formId,
                    source: 'microsoft-forms',
                    analysis: analysis
                },
                message: 'Microsoft Form imported and analyzed successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: `Failed to import Microsoft Form: ${error.message}`
            });
        }
    })
);

/**
 * @route   GET /api/forms/templates
 * @desc    Get available form templates
 * @access  Public
 */
router.get('/templates', asyncHandler(async (req, res) => {
    const templates = [
        {
            id: 'contact-form',
            name: 'Contact Form',
            description: 'Basic contact information form',
            category: 'general',
            fields: [
                { name: 'name', type: 'text', label: 'Full Name', required: true },
                { name: 'email', type: 'email', label: 'Email Address', required: true },
                { name: 'phone', type: 'phone', label: 'Phone Number', required: false },
                { name: 'message', type: 'textarea', label: 'Message', required: true }
            ]
        },
        {
            id: 'job-application',
            name: 'Job Application',
            description: 'Employment application form',
            category: 'hr',
            fields: [
                { name: 'first_name', type: 'text', label: 'First Name', required: true },
                { name: 'last_name', type: 'text', label: 'Last Name', required: true },
                { name: 'email', type: 'email', label: 'Email', required: true },
                { name: 'phone', type: 'phone', label: 'Phone', required: true },
                { name: 'position', type: 'select', label: 'Position Applied For', required: true,
                  options: ['Software Developer', 'Product Manager', 'Designer', 'Sales Representative'] },
                { name: 'experience', type: 'number', label: 'Years of Experience', required: true },
                { name: 'resume', type: 'file', label: 'Resume', required: true },
                { name: 'cover_letter', type: 'textarea', label: 'Cover Letter', required: false }
            ]
        },
        {
            id: 'survey-feedback',
            name: 'Customer Survey',
            description: 'Customer satisfaction survey',
            category: 'feedback',
            fields: [
                { name: 'customer_name', type: 'text', label: 'Name', required: false },
                { name: 'email', type: 'email', label: 'Email', required: false },
                { name: 'satisfaction', type: 'radio', label: 'Overall Satisfaction', required: true,
                  options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'] },
                { name: 'recommend', type: 'radio', label: 'Would you recommend us?', required: true,
                  options: ['Definitely', 'Probably', 'Not Sure', 'Probably Not', 'Definitely Not'] },
                { name: 'feedback', type: 'textarea', label: 'Additional Feedback', required: false }
            ]
        },
        {
            id: 'event-registration',
            name: 'Event Registration',
            description: 'Event registration and ticketing form',
            category: 'events',
            fields: [
                { name: 'attendee_name', type: 'text', label: 'Attendee Name', required: true },
                { name: 'email', type: 'email', label: 'Email Address', required: true },
                { name: 'phone', type: 'phone', label: 'Phone Number', required: false },
                { name: 'company', type: 'text', label: 'Company/Organization', required: false },
                { name: 'ticket_type', type: 'select', label: 'Ticket Type', required: true,
                  options: ['General Admission', 'VIP', 'Student', 'Speaker'] },
                { name: 'dietary_restrictions', type: 'checkbox', label: 'Dietary Restrictions',
                  options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Nut Allergy', 'None'] },
                { name: 'special_requirements', type: 'textarea', label: 'Special Requirements', required: false }
            ]
        },
        {
            id: 'order-form',
            name: 'Order Form',
            description: 'Product or service order form',
            category: 'ecommerce',
            fields: [
                { name: 'customer_name', type: 'text', label: 'Customer Name', required: true },
                { name: 'email', type: 'email', label: 'Email', required: true },
                { name: 'phone', type: 'phone', label: 'Phone', required: true },
                { name: 'product', type: 'select', label: 'Product/Service', required: true,
                  options: ['Product A', 'Product B', 'Service X', 'Service Y'] },
                { name: 'quantity', type: 'number', label: 'Quantity', required: true },
                { name: 'delivery_address', type: 'textarea', label: 'Delivery Address', required: true },
                { name: 'special_instructions', type: 'textarea', label: 'Special Instructions', required: false }
            ]
        }
    ];

    const { category } = req.query;
    
    let filteredTemplates = templates;
    if (category) {
        filteredTemplates = templates.filter(template => template.category === category);
    }

    res.json({
        success: true,
        data: filteredTemplates,
        categories: [...new Set(templates.map(t => t.category))],
        message: 'Form templates retrieved successfully'
    });
}));

/**
 * @route   POST /api/forms/generate
 * @desc    Generate form based on template or custom requirements
 * @access  Public
 */
router.post('/generate', asyncHandler(async (req, res) => {
    const { templateId, customFields, requirements } = req.body;

    if (!templateId && !customFields) {
        return res.status(400).json({
            success: false,
            error: 'Template ID or custom fields are required'
        });
    }

    try {
        const formStructure = await generateFormStructure(templateId, customFields, requirements);

        res.json({
            success: true,
            data: formStructure,
            message: 'Form structure generated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: `Failed to generate form: ${error.message}`
        });
    }
}));

/**
 * @route   POST /api/forms/validate
 * @desc    Validate form structure and data
 * @access  Public
 */
router.post('/validate', asyncHandler(async (req, res) => {
    const { formStructure, formData } = req.body;

    if (!formStructure) {
        return res.status(400).json({
            success: false,
            error: 'Form structure is required'
        });
    }

    try {
        const validation = await validateFormData(formStructure, formData);

        res.json({
            success: true,
            data: validation,
            message: 'Form validation completed'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: `Form validation failed: ${error.message}`
        });
    }
}));

/**
 * Fetch form data from URL
 */
async function fetchFormFromUrl(url, source) {
    // Extract form ID from URL based on source
    let formId;
    
    if (source === 'google-forms' || url.includes('forms.gle') || url.includes('docs.google.com/forms')) {
        formId = extractGoogleFormId(url);
        return await fetchGoogleFormPublic(formId);
    } else if (source === 'microsoft-forms' || url.includes('forms.office.com')) {
        formId = extractMicrosoftFormId(url);
        return await fetchMicrosoftFormPublic(formId);
    } else {
        throw new Error('Unsupported form URL or source');
    }
}

/**
 * Fetch Google Form using Forms API
 */
async function fetchGoogleForm(formId, accessToken) {
    const { google } = require('googleapis');
    
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const forms = google.forms({ version: 'v1', auth });
    
    try {
        const response = await forms.forms.get({
            formId: formId
        });
        
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch Google Form: ${error.message}`);
    }
}

/**
 * Fetch Microsoft Form using Graph API
 */
async function fetchMicrosoftForm(formId, accessToken) {
    const axios = require('axios');
    
    try {
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/me/drive/items/${formId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch Microsoft Form: ${error.message}`);
    }
}

/**
 * Extract Google Form ID from URL
 */
function extractGoogleFormId(url) {
    const regex = /\/forms\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

/**
 * Extract Microsoft Form ID from URL
 */
function extractMicrosoftFormId(url) {
    const regex = /\/Pages\/ResponsePage\.aspx\?id=([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

/**
 * Fetch public Google Form data (without API access)
 */
async function fetchGoogleFormPublic(formId) {
    // This would require web scraping or public API access
    // For now, return a placeholder
    throw new Error('Public Google Form fetching not implemented. Please use API access.');
}

/**
 * Fetch public Microsoft Form data (without API access)
 */
async function fetchMicrosoftFormPublic(formId) {
    // This would require web scraping or public API access
    // For now, return a placeholder
    throw new Error('Public Microsoft Form fetching not implemented. Please use API access.');
}

/**
 * Generate form structure from template or custom fields
 */
async function generateFormStructure(templateId, customFields, requirements) {
    // Get template data if templateId provided
    if (templateId) {
        const templates = await getFormTemplates();
        const template = templates.find(t => t.id === templateId);
        
        if (!template) {
            throw new Error('Template not found');
        }
        
        return {
            id: `form_${Date.now()}`,
            name: template.name,
            description: template.description,
            fields: template.fields,
            settings: {
                multiStep: template.fields.length > 6,
                progressBar: true,
                validation: true,
                autoSave: true
            }
        };
    }
    
    // Generate from custom fields
    if (customFields) {
        return {
            id: `form_${Date.now()}`,
            name: requirements?.name || 'Custom Form',
            description: requirements?.description || 'Generated custom form',
            fields: customFields,
            settings: {
                multiStep: customFields.length > 6,
                progressBar: true,
                validation: true,
                autoSave: true
            }
        };
    }
    
    throw new Error('Unable to generate form structure');
}

/**
 * Validate form data against structure
 */
async function validateFormData(formStructure, formData) {
    const errors = [];
    const warnings = [];
    
    // Validate required fields
    formStructure.fields.forEach(field => {
        if (field.required && (!formData || !formData[field.name])) {
            errors.push({
                field: field.name,
                message: `${field.label} is required`
            });
        }
    });
    
    // Validate field types and formats
    if (formData) {
        Object.entries(formData).forEach(([fieldName, value]) => {
            const field = formStructure.fields.find(f => f.name === fieldName);
            
            if (field && value) {
                const validation = validateFieldValue(field, value);
                if (!validation.isValid) {
                    errors.push({
                        field: fieldName,
                        message: validation.message
                    });
                }
            }
        });
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary: {
            totalFields: formStructure.fields.length,
            requiredFields: formStructure.fields.filter(f => f.required).length,
            completedFields: formData ? Object.keys(formData).length : 0,
            errorCount: errors.length,
            warningCount: warnings.length
        }
    };
}

/**
 * Validate individual field value
 */
function validateFieldValue(field, value) {
    switch (field.type) {
        case 'email':
            const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
            if (!emailRegex.test(value)) {
                return { isValid: false, message: 'Invalid email format' };
            }
            break;
            
        case 'phone':
            const phoneRegex = /^\\+?[\\d\\s\\-\\(\\)]{7,15}$/;
            if (!phoneRegex.test(value)) {
                return { isValid: false, message: 'Invalid phone number format' };
            }
            break;
            
        case 'number':
            if (isNaN(value)) {
                return { isValid: false, message: 'Must be a valid number' };
            }
            break;
            
        case 'url':
            try {
                new URL(value);
            } catch {
                return { isValid: false, message: 'Invalid URL format' };
            }
            break;
    }
    
    return { isValid: true };
}

/**
 * Get form templates (helper function)
 */
async function getFormTemplates() {
    // Return templates from the templates endpoint logic
    // This is a simplified version
    return [
        { id: 'contact-form', name: 'Contact Form', description: 'Basic contact form', fields: [] },
        { id: 'job-application', name: 'Job Application', description: 'Employment application', fields: [] }
    ];
}

module.exports = router;