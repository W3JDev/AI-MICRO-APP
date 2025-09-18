class WorkflowBuilder {
    constructor() {
        this.workflowTemplates = {
            basic: {
                name: 'Basic Form Submission',
                description: 'Simple form submission with validation and storage',
                steps: [
                    { name: 'Form Submission', type: 'input', automated: false },
                    { name: 'Data Validation', type: 'validation', automated: true },
                    { name: 'Data Storage', type: 'storage', automated: true },
                    { name: 'Confirmation Email', type: 'notification', automated: true }
                ]
            },
            approval: {
                name: 'Approval Workflow',
                description: 'Multi-step approval process with notifications',
                steps: [
                    { name: 'Form Submission', type: 'input', automated: false },
                    { name: 'Initial Validation', type: 'validation', automated: true },
                    { name: 'Manager Review', type: 'approval', automated: false, role: 'manager' },
                    { name: 'Senior Approval', type: 'approval', automated: false, role: 'senior_manager', condition: 'amount > 1000' },
                    { name: 'Final Processing', type: 'processing', automated: true },
                    { name: 'Completion Notification', type: 'notification', automated: true }
                ]
            },
            document: {
                name: 'Document Processing',
                description: 'Document upload, processing, and storage workflow',
                steps: [
                    { name: 'Document Upload', type: 'input', automated: false },
                    { name: 'Virus Scan', type: 'security', automated: true },
                    { name: 'Document Analysis', type: 'processing', automated: true },
                    { name: 'Cloud Storage', type: 'storage', automated: true },
                    { name: 'Index Creation', type: 'indexing', automated: true },
                    { name: 'Notification', type: 'notification', automated: true }
                ]
            },
            invoice: {
                name: 'Invoice Generation',
                description: 'Invoice creation and approval workflow',
                steps: [
                    { name: 'Invoice Data Entry', type: 'input', automated: false },
                    { name: 'Data Validation', type: 'validation', automated: true },
                    { name: 'PDF Generation', type: 'document_generation', automated: true },
                    { name: 'Finance Review', type: 'approval', automated: false, role: 'finance' },
                    { name: 'Digital Signature', type: 'signature', automated: false },
                    { name: 'Email Delivery', type: 'notification', automated: true },
                    { name: 'Payment Tracking', type: 'tracking', automated: true }
                ]
            }
        };
    }

    /**
     * Create workflow based on analysis and configuration
     */
    async createWorkflow(analysis, configuration) {
        try {
            console.log('🔄 Creating workflow...');

            const workflowType = this.determineWorkflowType(analysis, configuration);
            const template = this.workflowTemplates[workflowType];
            
            const workflow = {
                id: this.generateWorkflowId(),
                name: configuration.workflowName || template.name,
                description: configuration.workflowDescription || template.description,
                type: workflowType,
                status: 'draft',
                steps: this.customizeWorkflowSteps(template.steps, analysis, configuration),
                triggers: this.createTriggers(analysis, configuration),
                conditions: this.createConditions(analysis, configuration),
                notifications: this.createNotifications(analysis, configuration),
                integrations: this.createIntegrations(analysis, configuration),
                settings: this.createWorkflowSettings(configuration),
                createdAt: new Date().toISOString(),
                version: '1.0.0'
            };

            return workflow;
        } catch (error) {
            console.error('❌ Workflow creation failed:', error);
            throw error;
        }
    }

    /**
     * Determine appropriate workflow type based on analysis
     */
    determineWorkflowType(analysis, configuration) {
        // Check for specific indicators
        if (configuration.workflowType) {
            return configuration.workflowType;
        }

        // Check for approval needs
        if (this.needsApproval(analysis, configuration)) {
            return 'approval';
        }

        // Check for document processing
        if (this.needsDocumentProcessing(analysis)) {
            return 'document';
        }

        // Check for invoice generation
        if (this.needsInvoiceGeneration(analysis)) {
            return 'invoice';
        }

        // Default to basic workflow
        return 'basic';
    }

    /**
     * Check if workflow needs approval steps
     */
    needsApproval(analysis, configuration) {
        if (configuration.requiresApproval) return true;

        // Check for approval-related fields
        const approvalKeywords = ['approval', 'manager', 'supervisor', 'budget', 'expense', 'authorize'];
        const formData = JSON.stringify(analysis).toLowerCase();
        
        return approvalKeywords.some(keyword => formData.includes(keyword));
    }

    /**
     * Check if workflow needs document processing
     */
    needsDocumentProcessing(analysis) {
        return analysis.formFields?.some(field => field.type === 'file') || false;
    }

    /**
     * Check if workflow needs invoice generation
     */
    needsInvoiceGeneration(analysis) {
        const invoiceKeywords = ['invoice', 'billing', 'payment', 'amount', 'cost', 'price'];
        const formData = JSON.stringify(analysis).toLowerCase();
        
        return invoiceKeywords.some(keyword => formData.includes(keyword));
    }

    /**
     * Customize workflow steps based on analysis
     */
    customizeWorkflowSteps(templateSteps, analysis, configuration) {
        const customSteps = templateSteps.map(step => ({
            ...step,
            id: this.generateStepId(),
            config: this.createStepConfig(step, analysis, configuration)
        }));

        // Add custom steps based on analysis
        if (analysis.formFields?.some(field => field.type === 'file')) {
            this.addFileProcessingSteps(customSteps, analysis);
        }

        if (configuration.digitalSignature) {
            this.addSignatureSteps(customSteps);
        }

        if (configuration.pdfGeneration) {
            this.addPDFGenerationSteps(customSteps);
        }

        return customSteps;
    }

    /**
     * Create step configuration
     */
    createStepConfig(step, analysis, configuration) {
        const config = {
            timeout: this.getStepTimeout(step.type),
            retries: step.automated ? 3 : 0,
            onSuccess: 'next',
            onFailure: step.automated ? 'retry' : 'halt'
        };

        switch (step.type) {
            case 'validation':
                config.rules = this.createValidationRules(analysis);
                break;

            case 'storage':
                config.database = configuration.database || 'mongodb';
                config.collection = 'submissions';
                break;

            case 'notification':
                config.recipients = this.getNotificationRecipients(step, configuration);
                config.template = this.getNotificationTemplate(step.name);
                break;

            case 'approval':
                config.approvers = this.getApprovers(step.role, configuration);
                config.deadline = configuration.approvalDeadline || '72h';
                config.escalation = configuration.enableEscalation || false;
                break;

            case 'document_generation':
                config.template = configuration.documentTemplate || 'default';
                config.format = configuration.documentFormat || 'pdf';
                break;

            case 'signature':
                config.signers = this.getSigners(configuration);
                config.provider = configuration.signatureProvider || 'docusign';
                break;
        }

        return config;
    }

    /**
     * Create validation rules from analysis
     */
    createValidationRules(analysis) {
        const rules = {};

        analysis.formFields?.forEach(field => {
            rules[field.name] = {
                required: field.required || false,
                type: field.type,
                validation: field.validation || {}
            };
        });

        return rules;
    }

    /**
     * Add file processing steps
     */
    addFileProcessingSteps(steps, analysis) {
        const fileFields = analysis.formFields?.filter(field => field.type === 'file') || [];
        
        if (fileFields.length > 0) {
            // Insert after initial validation
            const insertIndex = steps.findIndex(step => step.type === 'validation') + 1;
            
            const fileSteps = [
                {
                    id: this.generateStepId(),
                    name: 'File Virus Scan',
                    type: 'security',
                    automated: true,
                    config: {
                        scanner: 'clamav',
                        quarantine: true,
                        timeout: 300
                    }
                },
                {
                    id: this.generateStepId(),
                    name: 'File Processing',
                    type: 'processing',
                    automated: true,
                    config: {
                        extractMetadata: true,
                        generateThumbnails: true,
                        formats: ['pdf', 'jpg', 'png', 'docx']
                    }
                }
            ];

            steps.splice(insertIndex, 0, ...fileSteps);
        }
    }

    /**
     * Add signature steps
     */
    addSignatureSteps(steps) {
        const signatureStep = {
            id: this.generateStepId(),
            name: 'Digital Signature',
            type: 'signature',
            automated: false,
            config: {
                required: true,
                provider: 'docusign',
                timeout: 604800 // 7 days
            }
        };

        // Insert before final notification
        const insertIndex = steps.length - 1;
        steps.splice(insertIndex, 0, signatureStep);
    }

    /**
     * Add PDF generation steps
     */
    addPDFGenerationSteps(steps) {
        const pdfStep = {
            id: this.generateStepId(),
            name: 'PDF Generation',
            type: 'document_generation',
            automated: true,
            config: {
                template: 'submission',
                format: 'pdf',
                watermark: false,
                protection: false
            }
        };

        // Insert after storage
        const insertIndex = steps.findIndex(step => step.type === 'storage') + 1;
        steps.splice(insertIndex, 0, pdfStep);
    }

    /**
     * Create workflow triggers
     */
    createTriggers(analysis, configuration) {
        const triggers = [
            {
                id: this.generateTriggerId(),
                name: 'Form Submission',
                type: 'form_submit',
                event: 'submission.created',
                active: true
            }
        ];

        if (configuration.scheduledTriggers) {
            triggers.push({
                id: this.generateTriggerId(),
                name: 'Scheduled Processing',
                type: 'schedule',
                cron: configuration.scheduleCron || '0 9 * * 1-5', // 9 AM weekdays
                active: true
            });
        }

        if (configuration.emailTriggers) {
            triggers.push({
                id: this.generateTriggerId(),
                name: 'Email Trigger',
                type: 'email',
                address: configuration.triggerEmail,
                active: true
            });
        }

        return triggers;
    }

    /**
     * Create workflow conditions
     */
    createConditions(analysis, configuration) {
        const conditions = [];

        // Amount-based conditions
        const amountFields = analysis.formFields?.filter(field => 
            field.type === 'number' && 
            (field.name.includes('amount') || field.name.includes('cost') || field.name.includes('price'))
        ) || [];

        amountFields.forEach(field => {
            conditions.push({
                id: this.generateConditionId(),
                name: `High Value ${field.label}`,
                field: field.name,
                operator: 'greater_than',
                value: configuration.highValueThreshold || 1000,
                action: 'require_additional_approval'
            });
        });

        // Department-based conditions
        const deptField = analysis.formFields?.find(field => 
            field.name.includes('department') || field.name.includes('dept')
        );

        if (deptField) {
            conditions.push({
                id: this.generateConditionId(),
                name: 'Department Routing',
                field: deptField.name,
                operator: 'equals',
                value: 'Finance',
                action: 'assign_to_finance_team'
            });
        }

        return conditions;
    }

    /**
     * Create notification settings
     */
    createNotifications(analysis, configuration) {
        return {
            email: {
                enabled: true,
                templates: {
                    submission_received: {
                        subject: 'Submission Received - {{submissionId}}',
                        template: 'submission_confirmation'
                    },
                    approval_required: {
                        subject: 'Approval Required - {{submissionId}}',
                        template: 'approval_request'
                    },
                    approved: {
                        subject: 'Submission Approved - {{submissionId}}',
                        template: 'approval_confirmation'
                    },
                    completed: {
                        subject: 'Process Completed - {{submissionId}}',
                        template: 'completion_notification'
                    }
                }
            },
            sms: {
                enabled: configuration.smsNotifications || false,
                provider: 'twilio'
            },
            webhook: {
                enabled: configuration.webhookNotifications || false,
                url: configuration.webhookUrl,
                events: ['completed', 'failed', 'approved']
            }
        };
    }

    /**
     * Create integration settings
     */
    createIntegrations(analysis, configuration) {
        const integrations = [];

        if (configuration.googleIntegration) {
            integrations.push({
                type: 'google_drive',
                name: 'Google Drive Storage',
                config: {
                    folder: configuration.googleDriveFolder || 'Submissions',
                    sharing: 'private',
                    autoOrganize: true
                }
            });

            integrations.push({
                type: 'google_sheets',
                name: 'Google Sheets Export',
                config: {
                    spreadsheetId: configuration.googleSheetId,
                    worksheet: 'Submissions',
                    autoUpdate: true
                }
            });
        }

        if (configuration.microsoftIntegration) {
            integrations.push({
                type: 'onedrive',
                name: 'OneDrive Storage',
                config: {
                    folder: configuration.oneDriveFolder || 'Submissions',
                    sharing: 'organization',
                    versioning: true
                }
            });

            integrations.push({
                type: 'sharepoint',
                name: 'SharePoint Lists',
                config: {
                    siteUrl: configuration.sharepointSite,
                    listName: 'Submissions',
                    syncFields: true
                }
            });
        }

        if (configuration.slackIntegration) {
            integrations.push({
                type: 'slack',
                name: 'Slack Notifications',
                config: {
                    webhook: configuration.slackWebhook,
                    channel: configuration.slackChannel || '#submissions',
                    events: ['submission', 'approval', 'completion']
                }
            });
        }

        return integrations;
    }

    /**
     * Create workflow settings
     */
    createWorkflowSettings(configuration) {
        return {
            timeout: configuration.workflowTimeout || 604800, // 7 days
            retryPolicy: {
                maxRetries: 3,
                backoff: 'exponential',
                initialDelay: 1000
            },
            errorHandling: {
                onFailure: 'halt',
                notifyAdmin: true,
                logLevel: 'error'
            },
            concurrency: {
                maxParallel: 5,
                queueLimit: 100
            },
            archiving: {
                enabled: true,
                retentionDays: configuration.retentionDays || 2555, // 7 years
                compressionEnabled: true
            }
        };
    }

    /**
     * Get step timeout based on type
     */
    getStepTimeout(type) {
        const timeouts = {
            validation: 30,
            storage: 60,
            notification: 120,
            approval: 604800, // 7 days
            processing: 300,
            security: 300,
            document_generation: 180,
            signature: 604800 // 7 days
        };

        return timeouts[type] || 300;
    }

    /**
     * Get notification recipients
     */
    getNotificationRecipients(step, configuration) {
        const recipients = [];

        if (step.name.includes('Confirmation')) {
            recipients.push({ type: 'submitter', email: '{{submitter.email}}' });
        }

        if (step.name.includes('Approval')) {
            recipients.push({ type: 'manager', email: configuration.managerEmail || '{{manager.email}}' });
        }

        if (step.name.includes('Completion')) {
            recipients.push({ type: 'submitter', email: '{{submitter.email}}' });
            if (configuration.adminEmail) {
                recipients.push({ type: 'admin', email: configuration.adminEmail });
            }
        }

        return recipients;
    }

    /**
     * Get notification template
     */
    getNotificationTemplate(stepName) {
        const templates = {
            'Confirmation Email': 'submission_confirmation',
            'Approval Required': 'approval_request',
            'Approval Notification': 'approval_notification',
            'Completion Notification': 'completion_notification',
            'Error Notification': 'error_notification'
        };

        return templates[stepName] || 'default_notification';
    }

    /**
     * Get approvers for step
     */
    getApprovers(role, configuration) {
        const approvers = [];

        switch (role) {
            case 'manager':
                if (configuration.managerEmail) {
                    approvers.push({ role: 'manager', email: configuration.managerEmail });
                }
                break;

            case 'senior_manager':
                if (configuration.seniorManagerEmail) {
                    approvers.push({ role: 'senior_manager', email: configuration.seniorManagerEmail });
                }
                break;

            case 'finance':
                if (configuration.financeEmail) {
                    approvers.push({ role: 'finance', email: configuration.financeEmail });
                }
                break;
        }

        return approvers;
    }

    /**
     * Get signers for digital signature
     */
    getSigners(configuration) {
        const signers = [];

        if (configuration.signerEmail) {
            signers.push({
                name: configuration.signerName || 'Authorized Signatory',
                email: configuration.signerEmail,
                order: 1,
                required: true
            });
        }

        return signers;
    }

    /**
     * Generate unique IDs
     */
    generateWorkflowId() {
        return 'wf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateStepId() {
        return 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateTriggerId() {
        return 'trigger_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateConditionId() {
        return 'condition_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Validate workflow configuration
     */
    validateWorkflow(workflow) {
        const errors = [];

        if (!workflow.name) {
            errors.push('Workflow name is required');
        }

        if (!workflow.steps || workflow.steps.length === 0) {
            errors.push('Workflow must have at least one step');
        }

        // Validate step dependencies
        workflow.steps.forEach((step, index) => {
            if (step.type === 'approval' && !step.config.approvers) {
                errors.push(`Step ${index + 1}: Approval step requires approvers`);
            }

            if (step.type === 'notification' && !step.config.recipients) {
                errors.push(`Step ${index + 1}: Notification step requires recipients`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Generate workflow execution code
     */
    generateWorkflowCode(workflow) {
        return `// Generated Workflow Execution Code
const WorkflowEngine = require('../engine/WorkflowEngine');

class ${workflow.name.replace(/\\s+/g, '')}Workflow {
    constructor() {
        this.workflow = ${JSON.stringify(workflow, null, 2)};
        this.engine = new WorkflowEngine();
    }

    async execute(submissionData) {
        try {
            console.log('🚀 Starting workflow: ${workflow.name}');
            
            const execution = await this.engine.start(this.workflow, submissionData);
            return execution;
        } catch (error) {
            console.error('❌ Workflow execution failed:', error);
            throw error;
        }
    }

    async getStatus(executionId) {
        return await this.engine.getStatus(executionId);
    }

    async pause(executionId) {
        return await this.engine.pause(executionId);
    }

    async resume(executionId) {
        return await this.engine.resume(executionId);
    }

    async cancel(executionId) {
        return await this.engine.cancel(executionId);
    }
}

module.exports = ${workflow.name.replace(/\\s+/g, '')}Workflow;`;
    }
}

module.exports = {
    createWorkflow: async (analysis, configuration) => {
        const builder = new WorkflowBuilder();
        return await builder.createWorkflow(analysis, configuration);
    }
};