class FormAnalyzer {
    /**
     * Analyze form data from Google Forms or Microsoft Forms
     */
    async analyzeForm(formData) {
        try {
            const data = typeof formData === 'string' ? JSON.parse(formData) : formData;
            
            const analysis = {
                source: this.detectSource(data),
                title: data.title || data.displayName || 'Untitled Form',
                description: data.description || '',
                formFields: [],
                settings: {},
                structure: 'form',
                dataTypes: [],
                validation: {},
                workflows: []
            };

            // Analyze based on source
            if (analysis.source === 'google-forms') {
                Object.assign(analysis, await this.analyzeGoogleForm(data));
            } else if (analysis.source === 'microsoft-forms') {
                Object.assign(analysis, await this.analyzeMicrosoftForm(data));
            } else {
                Object.assign(analysis, await this.analyzeGenericForm(data));
            }

            analysis.summary = this.generateFormSummary(analysis);
            return analysis;
        } catch (error) {
            console.error('❌ Form analysis failed:', error);
            throw new Error(`Failed to analyze form: ${error.message}`);
        }
    }

    /**
     * Detect form source platform
     */
    detectSource(data) {
        if (data.kind && data.kind.includes('forms')) return 'google-forms';
        if (data.properties && data.properties.microsoft) return 'microsoft-forms';
        if (data.formId || data.questions) return 'google-forms';
        if (data.id && data.settings) return 'microsoft-forms';
        return 'generic';
    }

    /**
     * Analyze Google Forms data
     */
    async analyzeGoogleForm(data) {
        const analysis = {
            formId: data.formId || data.id,
            formFields: [],
            settings: data.settings || {},
            dataTypes: [],
            validation: {}
        };

        // Process form items/questions
        const items = data.items || data.questions || [];
        
        items.forEach((item, index) => {
            const field = this.processGoogleFormItem(item, index);
            if (field) {
                analysis.formFields.push(field);
                
                // Collect data types
                if (!analysis.dataTypes.includes(field.type)) {
                    analysis.dataTypes.push(field.type);
                }
            }
        });

        // Extract settings
        if (data.settings) {
            analysis.settings = {
                requireSignIn: data.settings.requireSignIn || false,
                collectEmail: data.settings.collectEmail || false,
                allowResponseEditing: data.settings.allowResponseEditing || false,
                shuffleQuestions: data.settings.shuffleQuestions || false,
                isQuiz: data.settings.quizSettings?.isQuiz || false,
                confirmationMessage: data.settings.confirmationMessage || 'Thank you for your response!'
            };
        }

        return analysis;
    }

    /**
     * Process individual Google Form item
     */
    processGoogleFormItem(item, index) {
        if (!item.questionItem && !item.textItem && !item.imageItem) {
            return null; // Skip unsupported items
        }

        // Handle text/image items (informational)
        if (item.textItem) {
            return {
                name: `info_${index}`,
                label: item.title || 'Information',
                type: 'info',
                content: item.textItem.text || '',
                required: false
            };
        }

        if (item.imageItem) {
            return {
                name: `image_${index}`,
                label: item.title || 'Image',
                type: 'image',
                content: item.imageItem.image?.sourceUri || '',
                required: false
            };
        }

        // Handle question items
        const question = item.questionItem.question;
        const field = {
            name: this.sanitizeFieldName(item.title || `question_${index}`),
            label: item.title || `Question ${index + 1}`,
            description: item.description || item.helpText || '',
            required: question.required || false,
            type: 'text',
            validation: {},
            options: null
        };

        // Determine field type and extract specific properties
        if (question.choiceQuestion) {
            const choiceType = question.choiceQuestion.type;
            field.type = choiceType === 'RADIO' ? 'radio' : 
                        choiceType === 'CHECKBOX' ? 'checkbox' : 'select';
            field.options = question.choiceQuestion.options?.map(opt => ({
                value: opt.value,
                label: opt.value,
                isOther: opt.isOther || false
            })) || [];
        } else if (question.textQuestion) {
            field.type = question.textQuestion.paragraph ? 'textarea' : 'text';
        } else if (question.scaleQuestion) {
            field.type = 'scale';
            field.validation.min = question.scaleQuestion.low || 1;
            field.validation.max = question.scaleQuestion.high || 5;
            field.scaleLabels = {
                low: question.scaleQuestion.lowLabel || '',
                high: question.scaleQuestion.highLabel || ''
            };
        } else if (question.dateQuestion) {
            field.type = question.dateQuestion.includeTime ? 'datetime' : 'date';
        } else if (question.timeQuestion) {
            field.type = 'time';
            field.validation.duration = question.timeQuestion.duration || false;
        } else if (question.fileUploadQuestion) {
            field.type = 'file';
            field.validation.maxFiles = question.fileUploadQuestion.maxFiles || 1;
            field.validation.maxFileSize = question.fileUploadQuestion.maxFileSize || 10485760; // 10MB
            field.validation.allowedTypes = question.fileUploadQuestion.types || [];
        }

        return field;
    }

    /**
     * Analyze Microsoft Forms data
     */
    async analyzeMicrosoftForm(data) {
        const analysis = {
            formId: data.id,
            formFields: [],
            settings: {},
            dataTypes: [],
            validation: {}
        };

        // Process questions
        const questions = data.questions || [];
        
        questions.forEach((question, index) => {
            const field = this.processMicrosoftFormQuestion(question, index);
            if (field) {
                analysis.formFields.push(field);
                
                if (!analysis.dataTypes.includes(field.type)) {
                    analysis.dataTypes.push(field.type);
                }
            }
        });

        // Extract settings
        if (data.settings) {
            analysis.settings = {
                isAnonymous: data.settings.isAnonymousResponse || false,
                allowResponseEditing: data.settings.isResponseEditable || false,
                oneResponsePerUser: data.settings.isOncePerUser || false,
                shuffleQuestions: data.settings.isShuffled || false,
                notificationEmail: data.settings.notificationEmail || null
            };
        }

        return analysis;
    }

    /**
     * Process Microsoft Forms question
     */
    processMicrosoftFormQuestion(question, index) {
        const field = {
            name: this.sanitizeFieldName(question.title || `question_${index}`),
            label: question.title || `Question ${index + 1}`,
            description: question.subtitle || '',
            required: question.isRequired || false,
            type: 'text',
            validation: {},
            options: null
        };

        // Map Microsoft Forms question types
        switch (question.questionType) {
            case 'choice':
                field.type = question.hasOtherOption ? 'radio_with_other' : 'radio';
                field.options = question.choices?.map(choice => ({
                    value: choice.displayText,
                    label: choice.displayText
                })) || [];
                break;

            case 'multichoice':
                field.type = 'checkbox';
                field.options = question.choices?.map(choice => ({
                    value: choice.displayText,
                    label: choice.displayText
                })) || [];
                break;

            case 'text':
                field.type = question.isLongAnswer ? 'textarea' : 'text';
                break;

            case 'rating':
                field.type = 'rating';
                field.validation.max = question.maxRatingValue || 5;
                field.validation.min = 1;
                field.ratingSymbol = question.ratingSymbol || 'star';
                break;

            case 'ranking':
                field.type = 'ranking';
                field.options = question.choices?.map(choice => ({
                    value: choice.displayText,
                    label: choice.displayText
                })) || [];
                break;

            case 'likert':
                field.type = 'likert';
                field.statements = question.rows?.map(row => row.displayText) || [];
                field.options = question.columns?.map(col => col.displayText) || [];
                break;

            case 'date':
                field.type = 'date';
                break;

            case 'upload':
                field.type = 'file';
                field.validation.maxFiles = question.maxFileCount || 1;
                break;

            case 'nps':
                field.type = 'nps';
                field.validation.min = 0;
                field.validation.max = 10;
                break;

            default:
                field.type = 'text';
        }

        return field;
    }

    /**
     * Analyze generic form data
     */
    async analyzeGenericForm(data) {
        const analysis = {
            formFields: [],
            settings: {},
            dataTypes: [],
            validation: {}
        };

        // Try to extract fields from various possible structures
        const fields = data.fields || data.elements || data.questions || data.inputs || [];
        
        fields.forEach((field, index) => {
            const processedField = this.processGenericFormField(field, index);
            if (processedField) {
                analysis.formFields.push(processedField);
                
                if (!analysis.dataTypes.includes(processedField.type)) {
                    analysis.dataTypes.push(processedField.type);
                }
            }
        });

        return analysis;
    }

    /**
     * Process generic form field
     */
    processGenericFormField(field, index) {
        return {
            name: this.sanitizeFieldName(field.name || field.id || `field_${index}`),
            label: field.label || field.title || field.placeholder || `Field ${index + 1}`,
            description: field.description || field.help || '',
            type: this.normalizeFieldType(field.type || 'text'),
            required: field.required || field.mandatory || false,
            validation: this.extractValidation(field),
            options: field.options || field.choices || null
        };
    }

    /**
     * Normalize field type to standard types
     */
    normalizeFieldType(type) {
        const typeMap = {
            'string': 'text',
            'textarea': 'textarea',
            'number': 'number',
            'integer': 'number',
            'email': 'email',
            'password': 'password',
            'tel': 'phone',
            'url': 'url',
            'date': 'date',
            'datetime': 'datetime',
            'time': 'time',
            'checkbox': 'checkbox',
            'radio': 'radio',
            'select': 'select',
            'file': 'file',
            'hidden': 'hidden',
            'submit': 'submit',
            'button': 'button'
        };

        return typeMap[type.toLowerCase()] || 'text';
    }

    /**
     * Extract validation rules from field
     */
    extractValidation(field) {
        const validation = {};

        if (field.minLength) validation.minLength = field.minLength;
        if (field.maxLength) validation.maxLength = field.maxLength;
        if (field.min) validation.min = field.min;
        if (field.max) validation.max = field.max;
        if (field.pattern) validation.pattern = field.pattern;
        if (field.step) validation.step = field.step;

        // Extract validation from constraints
        if (field.constraints) {
            Object.assign(validation, field.constraints);
        }

        return validation;
    }

    /**
     * Generate form summary
     */
    generateFormSummary(analysis) {
        const summary = {
            totalFields: analysis.formFields.length,
            requiredFields: analysis.formFields.filter(f => f.required).length,
            fieldTypes: analysis.dataTypes,
            hasFileUpload: analysis.dataTypes.includes('file'),
            hasValidation: analysis.formFields.some(f => Object.keys(f.validation || {}).length > 0),
            hasOptions: analysis.formFields.some(f => f.options && f.options.length > 0),
            complexity: this.calculateFormComplexity(analysis),
            estimatedCompletionTime: this.estimateCompletionTime(analysis)
        };

        // Add workflow suggestions
        summary.suggestedWorkflows = this.suggestWorkflows(analysis);

        return summary;
    }

    /**
     * Calculate form complexity
     */
    calculateFormComplexity(analysis) {
        let score = 0;
        
        score += analysis.formFields.length; // Base score from field count
        score += analysis.formFields.filter(f => f.required).length; // Required fields add complexity
        score += analysis.formFields.filter(f => f.options).length * 0.5; // Select fields
        score += analysis.formFields.filter(f => f.type === 'file').length * 2; // File uploads
        score += analysis.formFields.filter(f => Object.keys(f.validation || {}).length > 0).length; // Validation

        if (score <= 8) return 'low';
        if (score <= 20) return 'medium';
        return 'high';
    }

    /**
     * Estimate form completion time in minutes
     */
    estimateCompletionTime(analysis) {
        let timeMinutes = 0;
        
        analysis.formFields.forEach(field => {
            switch (field.type) {
                case 'text':
                    timeMinutes += 0.5;
                    break;
                case 'textarea':
                    timeMinutes += 2;
                    break;
                case 'email':
                case 'phone':
                case 'url':
                    timeMinutes += 0.5;
                    break;
                case 'number':
                case 'date':
                case 'time':
                    timeMinutes += 0.3;
                    break;
                case 'radio':
                case 'select':
                    timeMinutes += 0.2;
                    break;
                case 'checkbox':
                    timeMinutes += 0.3;
                    break;
                case 'file':
                    timeMinutes += 2;
                    break;
                case 'scale':
                case 'rating':
                    timeMinutes += 0.3;
                    break;
                default:
                    timeMinutes += 0.5;
            }
        });

        return Math.ceil(timeMinutes);
    }

    /**
     * Suggest workflows based on form analysis
     */
    suggestWorkflows(analysis) {
        const workflows = [];

        // Basic submission workflow
        workflows.push({
            name: 'Form Submission',
            type: 'basic',
            steps: [
                'Form Completion',
                'Validation',
                'Data Storage',
                'Confirmation Email'
            ]
        });

        // If form has file uploads, suggest document workflow
        if (analysis.dataTypes.includes('file')) {
            workflows.push({
                name: 'Document Processing',
                type: 'document',
                steps: [
                    'File Upload',
                    'Virus Scan',
                    'Document Processing',
                    'Storage in Cloud Drive',
                    'Notification'
                ]
            });
        }

        // If form seems business-related, suggest approval workflow
        const businessKeywords = ['manager', 'supervisor', 'approval', 'budget', 'expense', 'request'];
        const hasBusinessContext = analysis.formFields.some(field => 
            businessKeywords.some(keyword => 
                field.label.toLowerCase().includes(keyword) ||
                field.description.toLowerCase().includes(keyword)
            )
        );

        if (hasBusinessContext) {
            workflows.push({
                name: 'Approval Workflow',
                type: 'approval',
                steps: [
                    'Submission',
                    'Manager Review',
                    'Approval/Rejection',
                    'Notification to Submitter',
                    'Final Processing'
                ]
            });
        }

        return workflows;
    }

    /**
     * Utility function to sanitize field names
     */
    sanitizeFieldName(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
}

module.exports = {
    analyzeForm: async (formData) => {
        const analyzer = new FormAnalyzer();
        return await analyzer.analyzeForm(formData);
    }
};