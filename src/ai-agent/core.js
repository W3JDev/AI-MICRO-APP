const OpenAI = require('openai');
const { analyzeSpreadsheet } = require('../services/spreadsheetAnalyzer');
const { analyzeForm } = require('../services/formAnalyzer');
const { generateMicroAppCode } = require('../services/codeGenerator');
const { createWorkflow } = require('../services/workflowBuilder');

class AIAgent {
    constructor() {
        // Initialize OpenAI only if API key is available
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
            this.aiEnabled = true;
        } else {
            console.warn('⚠️ OpenAI API key not provided. AI features will be limited.');
            this.openai = null;
            this.aiEnabled = false;
        }
        
        this.capabilities = {
            documentAnalysis: true,
            workflowGeneration: true,
            codeGeneration: true,
            pdfGeneration: true,
            signatureHandling: true,
            approvalFlows: true,
            automation: true,
            aiInsights: this.aiEnabled
        };
    }

    /**
     * Analyze uploaded documents (Excel, Google Sheets, Forms) and extract structure
     */
    async analyzeDocument(fileData, fileType, requirements = {}) {
        try {
            console.log(`🔍 Analyzing ${fileType} document...`);
            
            let analysis = {};
            
            switch (fileType.toLowerCase()) {
                case 'xlsx':
                case 'xls':
                case 'csv':
                    analysis = await analyzeSpreadsheet(fileData);
                    break;
                case 'json':
                    // For Google Sheets/Forms exported as JSON
                    analysis = await this.analyzeGoogleData(fileData);
                    break;
                case 'form':
                    analysis = await analyzeForm(fileData);
                    break;
                default:
                    throw new Error(`Unsupported file type: ${fileType}`);
            }

            // Enhance analysis with AI insights
            const aiInsights = await this.generateAIInsights(analysis, requirements);
            
            return {
                ...analysis,
                aiInsights,
                suggestedApps: await this.suggestMicroApps(analysis, requirements),
                workflows: await this.suggestWorkflows(analysis),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Document analysis failed:', error);
            throw error;
        }
    }

    /**
     * Generate AI insights about the document structure and suggest improvements
     */
    async generateAIInsights(analysis, requirements) {
        if (!this.aiEnabled) {
            return {
                error: 'AI insights not available - OpenAI API key not configured',
                fallback: 'Basic analysis completed without AI insights'
            };
        }

        try {
            const prompt = `
Analyze this document structure and provide insights for creating a digital micro-application:

Document Analysis:
${JSON.stringify(analysis, null, 2)}

User Requirements:
${JSON.stringify(requirements, null, 2)}

Please provide:
1. Key data patterns identified
2. Suggested form fields and validation rules
3. Workflow recommendations
4. Automation opportunities
5. Integration suggestions with Google/Microsoft ecosystems
6. Security and compliance considerations

Format as JSON with clear categories.
            `;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert in digital transformation and micro-application development. Analyze documents and suggest optimal digital workflows."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            console.error('❌ AI insights generation failed:', error);
            return {
                error: 'Failed to generate AI insights',
                fallback: 'Basic analysis completed without AI enhancement'
            };
        }
    }

    /**
     * Suggest micro applications based on document analysis
     */
    async suggestMicroApps(analysis, requirements) {
        const suggestions = [];

        // Form-based applications
        if (analysis.formFields && analysis.formFields.length > 0) {
            suggestions.push({
                type: 'data-entry-form',
                name: 'Digital Data Entry Form',
                description: 'Convert paper form to digital with validation and submission tracking',
                features: ['Real-time validation', 'Auto-save', 'Progress tracking', 'PDF export'],
                complexity: 'low',
                estimatedTime: '2-4 hours'
            });
        }

        // Workflow applications
        if (analysis.workflows || requirements.approvalFlow) {
            suggestions.push({
                type: 'approval-workflow',
                name: 'Approval Workflow System',
                description: 'Multi-step approval process with notifications and tracking',
                features: ['Multi-level approval', 'Email notifications', 'Status tracking', 'Audit trail'],
                complexity: 'medium',
                estimatedTime: '4-8 hours'
            });
        }

        // Document management
        if (requirements.pdfGeneration || requirements.invoicing) {
            suggestions.push({
                type: 'document-generator',
                name: 'Document Generator & Manager',
                description: 'Generate PDFs, invoices, and manage document lifecycle',
                features: ['Template-based generation', 'Digital signatures', 'Storage integration', 'Version control'],
                complexity: 'medium',
                estimatedTime: '6-10 hours'
            });
        }

        // Dashboard and reporting
        if (analysis.dataTypes && analysis.dataTypes.includes('numeric')) {
            suggestions.push({
                type: 'analytics-dashboard',
                name: 'Analytics Dashboard',
                description: 'Real-time data visualization and reporting',
                features: ['Interactive charts', 'Export capabilities', 'Scheduled reports', 'KPI tracking'],
                complexity: 'high',
                estimatedTime: '8-12 hours'
            });
        }

        return suggestions;
    }

    /**
     * Suggest workflows based on document structure
     */
    async suggestWorkflows(analysis) {
        const workflows = [];

        // Standard data entry workflow
        workflows.push({
            name: 'Data Entry & Validation',
            steps: [
                { name: 'Form Submission', type: 'input', automated: false },
                { name: 'Data Validation', type: 'validation', automated: true },
                { name: 'Storage', type: 'storage', automated: true },
                { name: 'Notification', type: 'notification', automated: true }
            ]
        });

        // Approval workflow if needed
        if (analysis.requiresApproval) {
            workflows.push({
                name: 'Approval Process',
                steps: [
                    { name: 'Submission Review', type: 'review', automated: false },
                    { name: 'Manager Approval', type: 'approval', automated: false },
                    { name: 'Final Processing', type: 'processing', automated: true },
                    { name: 'Completion Notification', type: 'notification', automated: true }
                ]
            });
        }

        return workflows;
    }

    /**
     * Generate a complete micro application
     */
    async generateMicroApp(analysis, configuration) {
        try {
            console.log('🏗️ Generating micro application...');

            const appStructure = {
                metadata: {
                    name: configuration.appName || 'Generated Micro App',
                    description: configuration.description || 'AI-generated micro application',
                    version: '1.0.0',
                    createdAt: new Date().toISOString(),
                    author: configuration.author || 'AI Agent'
                },
                frontend: await generateMicroAppCode(analysis, 'frontend', configuration),
                backend: await generateMicroAppCode(analysis, 'backend', configuration),
                database: this.generateDatabaseSchema(analysis),
                workflows: await createWorkflow(analysis, configuration),
                integrations: this.generateIntegrations(configuration),
                deployment: this.generateDeploymentConfig(configuration)
            };

            return appStructure;
        } catch (error) {
            console.error('❌ Micro app generation failed:', error);
            throw error;
        }
    }

    /**
     * Generate database schema based on analysis
     */
    generateDatabaseSchema(analysis) {
        const schema = {
            collections: [],
            relationships: []
        };

        if (analysis.formFields) {
            const mainCollection = {
                name: 'submissions',
                fields: analysis.formFields.map(field => ({
                    name: field.name,
                    type: this.mapFieldType(field.type),
                    required: field.required || false,
                    validation: field.validation || null
                })),
                indexes: ['createdAt', 'status'],
                timestamps: true
            };
            schema.collections.push(mainCollection);
        }

        // Add workflow tracking collection
        schema.collections.push({
            name: 'workflow_instances',
            fields: [
                { name: 'submissionId', type: 'ObjectId', required: true },
                { name: 'currentStep', type: 'String', required: true },
                { name: 'status', type: 'String', required: true },
                { name: 'history', type: 'Array', required: false },
                { name: 'assignedTo', type: 'String', required: false }
            ],
            indexes: ['submissionId', 'status', 'assignedTo'],
            timestamps: true
        });

        return schema;
    }

    /**
     * Generate integration configurations
     */
    generateIntegrations(configuration) {
        const integrations = [];

        if (configuration.googleIntegration) {
            integrations.push({
                type: 'google-drive',
                name: 'Google Drive Storage',
                config: {
                    scopes: ['https://www.googleapis.com/auth/drive.file'],
                    fileTypes: ['pdf', 'xlsx', 'docx'],
                    autoBackup: true
                }
            });

            integrations.push({
                type: 'google-sheets',
                name: 'Google Sheets Export',
                config: {
                    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
                    autoExport: configuration.autoExport || false,
                    schedule: configuration.exportSchedule || null
                }
            });
        }

        if (configuration.microsoftIntegration) {
            integrations.push({
                type: 'onedrive',
                name: 'OneDrive Storage',
                config: {
                    scopes: ['Files.ReadWrite'],
                    fileTypes: ['pdf', 'xlsx', 'docx'],
                    autoBackup: true
                }
            });
        }

        return integrations;
    }

    /**
     * Generate deployment configuration
     */
    generateDeploymentConfig(configuration) {
        return {
            platform: configuration.deploymentPlatform || 'docker',
            environment: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            docker: {
                baseImage: 'node:18-alpine',
                workdir: '/app',
                exposedPort: 3000
            },
            scaling: {
                minInstances: 1,
                maxInstances: 3,
                targetCPU: 70
            }
        };
    }

    /**
     * Analyze Google Sheets/Forms data
     */
    async analyzeGoogleData(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            return {
                source: 'google',
                type: data.kind || 'unknown',
                formFields: this.extractGoogleFormFields(data),
                dataTypes: this.identifyDataTypes(data),
                structure: data.properties || data.settings || {},
                requiresApproval: this.detectApprovalNeeds(data)
            };
        } catch (error) {
            throw new Error(`Failed to analyze Google data: ${error.message}`);
        }
    }

    /**
     * Extract form fields from Google Forms data
     */
    extractGoogleFormFields(data) {
        if (data.items || data.questions) {
            const questions = data.items || data.questions;
            return questions.map(q => ({
                name: this.sanitizeFieldName(q.title || q.questionItem?.question?.questionId),
                type: this.mapGoogleFieldType(q.questionItem?.question?.choiceQuestion ? 'choice' : 'text'),
                required: q.questionItem?.question?.required || false,
                options: q.questionItem?.question?.choiceQuestion?.options?.map(opt => opt.value) || null,
                description: q.description || q.helpText || null
            }));
        }
        return [];
    }

    /**
     * Utility methods
     */
    mapFieldType(type) {
        const typeMap = {
            'text': 'String',
            'number': 'Number',
            'date': 'Date',
            'boolean': 'Boolean',
            'email': 'String',
            'phone': 'String',
            'url': 'String',
            'choice': 'String',
            'multiple_choice': 'Array'
        };
        return typeMap[type] || 'String';
    }

    mapGoogleFieldType(type) {
        const typeMap = {
            'SHORT_ANSWER': 'text',
            'LONG_ANSWER': 'textarea',
            'MULTIPLE_CHOICE': 'choice',
            'CHECKBOX': 'multiple_choice',
            'DROPDOWN': 'select',
            'LINEAR_SCALE': 'number',
            'DATE': 'date',
            'TIME': 'time'
        };
        return typeMap[type] || 'text';
    }

    sanitizeFieldName(name) {
        return name?.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '') || 'unnamed_field';
    }

    identifyDataTypes(data) {
        const types = new Set();
        if (data.items || data.questions) {
            (data.items || data.questions).forEach(item => {
                const type = item.questionItem?.question?.choiceQuestion ? 'choice' : 'text';
                types.add(type);
            });
        }
        return Array.from(types);
    }

    detectApprovalNeeds(data) {
        const text = JSON.stringify(data).toLowerCase();
        const approvalKeywords = ['approval', 'review', 'manager', 'supervisor', 'authorize', 'confirm'];
        return approvalKeywords.some(keyword => text.includes(keyword));
    }
}

module.exports = new AIAgent();