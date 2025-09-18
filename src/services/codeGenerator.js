const fs = require('fs').promises;
const path = require('path');

class CodeGenerator {
    constructor() {
        this.templates = {
            frontend: {},
            backend: {},
            database: {}
        };
    }

    /**
     * Generate micro application code
     */
    async generateMicroAppCode(analysis, type, configuration) {
        try {
            console.log(`🔧 Generating ${type} code...`);

            switch (type) {
                case 'frontend':
                    return await this.generateFrontendCode(analysis, configuration);
                case 'backend':
                    return await this.generateBackendCode(analysis, configuration);
                case 'database':
                    return await this.generateDatabaseCode(analysis, configuration);
                default:
                    throw new Error(`Unsupported code type: ${type}`);
            }
        } catch (error) {
            console.error(`❌ ${type} code generation failed:`, error);
            throw error;
        }
    }

    /**
     * Generate frontend code (HTML, CSS, JavaScript)
     */
    async generateFrontendCode(analysis, configuration) {
        const frontend = {
            html: await this.generateHTML(analysis, configuration),
            css: await this.generateCSS(analysis, configuration),
            javascript: await this.generateJavaScript(analysis, configuration),
            manifest: await this.generateManifest(analysis, configuration)
        };

        return frontend;
    }

    /**
     * Generate HTML structure
     */
    async generateHTML(analysis, configuration) {
        const appName = configuration.appName || 'Micro App';
        const fields = analysis.formFields || [];

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName}</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#4CAF50">
</head>
<body>
    <div class="container">
        <header class="app-header">
            <h1>${appName}</h1>
            ${analysis.description ? `<p class="description">${analysis.description}</p>` : ''}
        </header>

        <main class="app-content">
            <form id="mainForm" class="data-form" novalidate>
                <div class="form-progress">
                    <div class="progress-bar" id="progressBar"></div>
                </div>

                <div class="form-sections">`;

        // Group fields into sections for better UX
        const sections = this.groupFieldsIntoSections(fields);
        
        sections.forEach((section, sectionIndex) => {
            html += `
                    <div class="form-section ${sectionIndex === 0 ? 'active' : ''}" data-section="${sectionIndex}">
                        <h2>${section.title}</h2>`;

            section.fields.forEach(field => {
                html += this.generateFieldHTML(field);
            });

            html += `
                    </div>`;
        });

        html += `
                </div>

                <div class="form-navigation">
                    <button type="button" id="prevBtn" class="btn btn-secondary" disabled>Previous</button>
                    <button type="button" id="nextBtn" class="btn btn-primary">Next</button>
                    <button type="submit" id="submitBtn" class="btn btn-success" style="display: none;">Submit</button>
                </div>

                <div class="form-status" id="formStatus"></div>
            </form>

            <!-- Success/Error Messages -->
            <div id="successMessage" class="message success" style="display: none;">
                <h3>✅ Success!</h3>
                <p>Your submission has been received and is being processed.</p>
            </div>

            <div id="errorMessage" class="message error" style="display: none;">
                <h3>❌ Error</h3>
                <p id="errorText">Something went wrong. Please try again.</p>
            </div>

            <!-- Submission Summary -->
            <div id="submissionSummary" class="submission-summary" style="display: none;">
                <h3>📋 Submission Summary</h3>
                <div id="summaryContent"></div>
                <div class="summary-actions">
                    <button type="button" id="downloadPdf" class="btn btn-primary">📄 Download PDF</button>
                    <button type="button" id="emailCopy" class="btn btn-secondary">📧 Email Copy</button>
                    <button type="button" id="newSubmission" class="btn btn-outline">🔄 New Submission</button>
                </div>
            </div>
        </main>

        <footer class="app-footer">
            <p>Powered by AI Micro App Builder</p>
        </footer>
    </div>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay" style="display: none;">
        <div class="spinner"></div>
        <p>Processing...</p>
    </div>

    <script src="app.js"></script>
</body>
</html>`;

        return html;
    }

    /**
     * Group fields into logical sections
     */
    groupFieldsIntoSections(fields) {
        const sections = [];
        let currentSection = { title: 'General Information', fields: [] };
        
        fields.forEach((field, index) => {
            // Start new section every 5-7 fields or based on field types
            if (currentSection.fields.length >= 6 || this.shouldStartNewSection(field, currentSection.fields)) {
                if (currentSection.fields.length > 0) {
                    sections.push(currentSection);
                }
                currentSection = { 
                    title: this.getSectionTitle(field, sections.length + 1), 
                    fields: [] 
                };
            }
            
            currentSection.fields.push(field);
        });

        if (currentSection.fields.length > 0) {
            sections.push(currentSection);
        }

        return sections.length > 0 ? sections : [{ title: 'Information', fields }];
    }

    /**
     * Determine if we should start a new section
     */
    shouldStartNewSection(field, currentFields) {
        // Start new section for file uploads
        if (field.type === 'file') return true;
        
        // Start new section for contact information
        if (['email', 'phone', 'address'].includes(field.type)) {
            return !currentFields.some(f => ['email', 'phone', 'address'].includes(f.type));
        }
        
        return false;
    }

    /**
     * Get section title based on field types
     */
    getSectionTitle(field, sectionIndex) {
        if (field.type === 'file') return 'File Uploads';
        if (['email', 'phone', 'address'].includes(field.type)) return 'Contact Information';
        if (field.type === 'date') return 'Date & Time Information';
        return `Section ${sectionIndex}`;
    }

    /**
     * Generate HTML for individual field
     */
    generateFieldHTML(field) {
        const fieldId = field.name;
        const required = field.required ? 'required' : '';
        const requiredMark = field.required ? ' <span class="required">*</span>' : '';

        let html = `
                        <div class="form-group" data-field="${fieldId}">
                            <label for="${fieldId}" class="form-label">
                                ${field.label}${requiredMark}
                            </label>`;

        if (field.description) {
            html += `
                            <p class="field-description">${field.description}</p>`;
        }

        switch (field.type) {
            case 'text':
            case 'email':
            case 'phone':
            case 'url':
                html += `
                            <input type="${field.type}" id="${fieldId}" name="${fieldId}" class="form-input" ${required}
                                   ${field.validation?.pattern ? `pattern="${field.validation.pattern}"` : ''}
                                   ${field.validation?.minLength ? `minlength="${field.validation.minLength}"` : ''}
                                   ${field.validation?.maxLength ? `maxlength="${field.validation.maxLength}"` : ''}
                                   placeholder="Enter ${field.label.toLowerCase()}">`;
                break;

            case 'textarea':
                html += `
                            <textarea id="${fieldId}" name="${fieldId}" class="form-textarea" ${required}
                                      ${field.validation?.minLength ? `minlength="${field.validation.minLength}"` : ''}
                                      ${field.validation?.maxLength ? `maxlength="${field.validation.maxLength}"` : ''}
                                      rows="4" placeholder="Enter ${field.label.toLowerCase()}"></textarea>`;
                break;

            case 'number':
                html += `
                            <input type="number" id="${fieldId}" name="${fieldId}" class="form-input" ${required}
                                   ${field.validation?.min !== undefined ? `min="${field.validation.min}"` : ''}
                                   ${field.validation?.max !== undefined ? `max="${field.validation.max}"` : ''}
                                   ${field.validation?.step ? `step="${field.validation.step}"` : ''}
                                   placeholder="Enter ${field.label.toLowerCase()}">`;
                break;

            case 'date':
                html += `
                            <input type="date" id="${fieldId}" name="${fieldId}" class="form-input" ${required}>`;
                break;

            case 'datetime':
                html += `
                            <input type="datetime-local" id="${fieldId}" name="${fieldId}" class="form-input" ${required}>`;
                break;

            case 'time':
                html += `
                            <input type="time" id="${fieldId}" name="${fieldId}" class="form-input" ${required}>`;
                break;

            case 'radio':
                if (field.options) {
                    html += `
                            <div class="radio-group">`;
                    field.options.forEach((option, index) => {
                        html += `
                                <label class="radio-label">
                                    <input type="radio" name="${fieldId}" value="${option.value || option}" ${required}>
                                    <span class="radio-custom"></span>
                                    ${option.label || option}
                                </label>`;
                    });
                    html += `
                            </div>`;
                }
                break;

            case 'checkbox':
                if (field.options) {
                    html += `
                            <div class="checkbox-group">`;
                    field.options.forEach((option, index) => {
                        html += `
                                <label class="checkbox-label">
                                    <input type="checkbox" name="${fieldId}" value="${option.value || option}">
                                    <span class="checkbox-custom"></span>
                                    ${option.label || option}
                                </label>`;
                    });
                    html += `
                            </div>`;
                }
                break;

            case 'select':
                html += `
                            <select id="${fieldId}" name="${fieldId}" class="form-select" ${required}>
                                <option value="">Select ${field.label.toLowerCase()}</option>`;
                if (field.options) {
                    field.options.forEach(option => {
                        html += `
                                <option value="${option.value || option}">${option.label || option}</option>`;
                    });
                }
                html += `
                            </select>`;
                break;

            case 'file':
                html += `
                            <div class="file-upload-area" id="${fieldId}_area">
                                <input type="file" id="${fieldId}" name="${fieldId}" class="form-file" ${required}
                                       ${field.validation?.maxFiles > 1 ? 'multiple' : ''}
                                       ${field.validation?.allowedTypes ? `accept="${field.validation.allowedTypes.join(',')}"` : ''}>
                                <label for="${fieldId}" class="file-upload-label">
                                    <span class="file-upload-icon">📁</span>
                                    <span class="file-upload-text">Click to upload or drag files here</span>
                                </label>
                                <div class="file-list" id="${fieldId}_list"></div>
                            </div>`;
                break;

            default:
                html += `
                            <input type="text" id="${fieldId}" name="${fieldId}" class="form-input" ${required}
                                   placeholder="Enter ${field.label.toLowerCase()}">`;
        }

        html += `
                            <div class="field-error" id="${fieldId}_error"></div>
                        </div>`;

        return html;
    }

    /**
     * Generate CSS styles
     */
    async generateCSS(analysis, configuration) {
        const primaryColor = configuration.primaryColor || '#4CAF50';
        const secondaryColor = configuration.secondaryColor || '#45a049';
        
        return `/* AI Micro App - Generated Styles */
:root {
    --primary-color: ${primaryColor};
    --secondary-color: ${secondaryColor};
    --error-color: #f44336;
    --success-color: #4CAF50;
    --warning-color: #ff9800;
    --border-radius: 8px;
    --shadow: 0 2px 10px rgba(0,0,0,0.1);
    --font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: var(--font-family);
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

/* Header */
.app-header {
    text-align: center;
    margin-bottom: 30px;
    color: white;
}

.app-header h1 {
    font-size: 2.5em;
    margin-bottom: 10px;
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.description {
    font-size: 1.1em;
    opacity: 0.9;
}

/* Main Content */
.app-content {
    background: white;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    overflow: hidden;
}

/* Form Styles */
.data-form {
    padding: 30px;
}

.form-progress {
    height: 4px;
    background: #e0e0e0;
    border-radius: 2px;
    margin-bottom: 30px;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    background: var(--primary-color);
    width: 0%;
    transition: width 0.3s ease;
}

.form-sections {
    position: relative;
    min-height: 400px;
}

.form-section {
    display: none;
    animation: fadeIn 0.3s ease;
}

.form-section.active {
    display: block;
}

.form-section h2 {
    color: var(--primary-color);
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid #e0e0e0;
}

.form-group {
    margin-bottom: 20px;
}

.form-label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    color: #555;
}

.required {
    color: var(--error-color);
}

.field-description {
    font-size: 0.9em;
    color: #777;
    margin-bottom: 8px;
}

/* Input Styles */
.form-input,
.form-textarea,
.form-select {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: var(--border-radius);
    font-size: 16px;
    transition: border-color 0.3s ease;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.form-textarea {
    resize: vertical;
    min-height: 100px;
}

/* Radio and Checkbox Groups */
.radio-group,
.checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.radio-label,
.checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 10px;
    border: 2px solid #e0e0e0;
    border-radius: var(--border-radius);
    transition: all 0.3s ease;
}

.radio-label:hover,
.checkbox-label:hover {
    border-color: var(--primary-color);
    background: #f8f9fa;
}

.radio-custom,
.checkbox-custom {
    width: 20px;
    height: 20px;
    border: 2px solid #ddd;
    margin-right: 10px;
    position: relative;
    transition: all 0.3s ease;
}

.radio-custom {
    border-radius: 50%;
}

.checkbox-custom {
    border-radius: 3px;
}

input[type="radio"]:checked + .radio-custom::after {
    content: '';
    width: 10px;
    height: 10px;
    background: var(--primary-color);
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

input[type="checkbox"]:checked + .checkbox-custom::after {
    content: '✓';
    color: white;
    font-weight: bold;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 14px;
}

input[type="checkbox"]:checked + .checkbox-custom {
    background: var(--primary-color);
    border-color: var(--primary-color);
}

input[type="radio"],
input[type="checkbox"] {
    display: none;
}

/* File Upload */
.file-upload-area {
    border: 2px dashed #ddd;
    border-radius: var(--border-radius);
    padding: 20px;
    text-align: center;
    transition: border-color 0.3s ease;
    cursor: pointer;
}

.file-upload-area:hover {
    border-color: var(--primary-color);
}

.form-file {
    display: none;
}

.file-upload-label {
    cursor: pointer;
    display: block;
}

.file-upload-icon {
    font-size: 2em;
    display: block;
    margin-bottom: 10px;
}

.file-upload-text {
    color: #666;
}

.file-list {
    margin-top: 10px;
    text-align: left;
}

.file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px;
    background: #f8f9fa;
    border-radius: 4px;
    margin-bottom: 5px;
}

/* Buttons */
.btn {
    padding: 12px 24px;
    border: none;
    border-radius: var(--border-radius);
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: inline-block;
    text-align: center;
}

.btn-primary {
    background: var(--primary-color);
    color: white;
}

.btn-primary:hover {
    background: var(--secondary-color);
    transform: translateY(-2px);
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-secondary:hover {
    background: #5a6268;
}

.btn-success {
    background: var(--success-color);
    color: white;
}

.btn-success:hover {
    background: #45a049;
}

.btn-outline {
    background: transparent;
    color: var(--primary-color);
    border: 2px solid var(--primary-color);
}

.btn-outline:hover {
    background: var(--primary-color);
    color: white;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

/* Navigation */
.form-navigation {
    display: flex;
    justify-content: space-between;
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #e0e0e0;
}

/* Messages */
.message {
    padding: 20px;
    border-radius: var(--border-radius);
    margin: 20px 0;
    text-align: center;
}

.message.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.message.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.field-error {
    color: var(--error-color);
    font-size: 0.9em;
    margin-top: 5px;
    display: none;
}

.field-error.show {
    display: block;
}

.form-group.error .form-input,
.form-group.error .form-textarea,
.form-group.error .form-select {
    border-color: var(--error-color);
}

/* Submission Summary */
.submission-summary {
    background: #f8f9fa;
    padding: 20px;
    border-radius: var(--border-radius);
    border: 1px solid #e0e0e0;
}

.summary-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    flex-wrap: wrap;
}

/* Loading Overlay */
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    color: white;
}

.spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255,255,255,0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
}

/* Footer */
.app-footer {
    text-align: center;
    margin-top: 20px;
    color: white;
    opacity: 0.7;
}

/* Animations */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
    .container {
        padding: 10px;
    }
    
    .data-form {
        padding: 20px;
    }
    
    .app-header h1 {
        font-size: 2em;
    }
    
    .form-navigation {
        flex-direction: column;
        gap: 10px;
    }
    
    .radio-group,
    .checkbox-group {
        gap: 5px;
    }
    
    .summary-actions {
        flex-direction: column;
    }
}

/* Print Styles */
@media print {
    body {
        background: white;
    }
    
    .form-navigation,
    .loading-overlay {
        display: none !important;
    }
}`;
    }

    /**
     * Generate JavaScript functionality
     */
    async generateJavaScript(analysis, configuration) {
        const fields = analysis.formFields || [];
        
        return `// AI Micro App - Generated JavaScript
class MicroApp {
    constructor() {
        this.currentSection = 0;
        this.totalSections = document.querySelectorAll('.form-section').length;
        this.formData = {};
        this.validationRules = ${JSON.stringify(this.generateValidationRules(fields), null, 2)};
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateProgress();
        this.setupFileUploads();
        this.setupAutoSave();
        
        // Load saved data if available
        this.loadSavedData();
        
        console.log('📱 Micro App initialized');
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('nextBtn').addEventListener('click', () => this.nextSection());
        document.getElementById('prevBtn').addEventListener('click', () => this.prevSection());
        
        // Form submission
        document.getElementById('mainForm').addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Real-time validation
        const inputs = document.querySelectorAll('.form-input, .form-textarea, .form-select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
        
        // Radio and checkbox validation
        const radioGroups = document.querySelectorAll('input[type="radio"]');
        const checkboxGroups = document.querySelectorAll('input[type="checkbox"]');
        
        radioGroups.forEach(radio => {
            radio.addEventListener('change', () => this.validateField(radio));
        });
        
        checkboxGroups.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.validateField(checkbox));
        });
        
        // Success/Error actions
        document.getElementById('downloadPdf')?.addEventListener('click', () => this.downloadPDF());
        document.getElementById('emailCopy')?.addEventListener('click', () => this.emailCopy());
        document.getElementById('newSubmission')?.addEventListener('click', () => this.newSubmission());
    }

    setupFileUploads() {
        const fileInputs = document.querySelectorAll('.form-file');
        
        fileInputs.forEach(input => {
            const area = document.getElementById(input.id + '_area');
            const list = document.getElementById(input.id + '_list');
            
            // Drag and drop
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.classList.add('dragover');
            });
            
            area.addEventListener('dragleave', () => {
                area.classList.remove('dragover');
            });
            
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('dragover');
                this.handleFiles(input, e.dataTransfer.files, list);
            });
            
            // File input change
            input.addEventListener('change', (e) => {
                this.handleFiles(input, e.target.files, list);
            });
        });
    }

    handleFiles(input, files, list) {
        const fieldName = input.name;
        const validation = this.validationRules[fieldName];
        
        // Validate files
        if (validation?.maxFiles && files.length > validation.maxFiles) {
            this.showFieldError(input, \`Maximum \${validation.maxFiles} files allowed\`);
            return;
        }
        
        if (validation?.maxFileSize) {
            for (let file of files) {
                if (file.size > validation.maxFileSize) {
                    this.showFieldError(input, \`File "\${file.name}" is too large. Maximum size: \${this.formatFileSize(validation.maxFileSize)}\`);
                    return;
                }
            }
        }
        
        // Display file list
        list.innerHTML = '';
        Array.from(files).forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = \`
                <span>\${file.name} (\${this.formatFileSize(file.size)})</span>
                <button type="button" onclick="this.parentElement.remove()" class="btn-remove">×</button>
            \`;
            list.appendChild(fileItem);
        });
        
        this.clearFieldError(input);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    setupAutoSave() {
        // Auto-save form data every 30 seconds
        setInterval(() => {
            this.saveFormData();
        }, 30000);
        
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveFormData();
        });
    }

    nextSection() {
        if (this.validateCurrentSection()) {
            if (this.currentSection < this.totalSections - 1) {
                this.hideSection(this.currentSection);
                this.currentSection++;
                this.showSection(this.currentSection);
                this.updateProgress();
                this.updateNavigation();
            }
        }
    }

    prevSection() {
        if (this.currentSection > 0) {
            this.hideSection(this.currentSection);
            this.currentSection--;
            this.showSection(this.currentSection);
            this.updateProgress();
            this.updateNavigation();
        }
    }

    hideSection(index) {
        const section = document.querySelector(\`[data-section="\${index}"]\`);
        if (section) {
            section.classList.remove('active');
        }
    }

    showSection(index) {
        const section = document.querySelector(\`[data-section="\${index}"]\`);
        if (section) {
            section.classList.add('active');
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    updateProgress() {
        const progress = ((this.currentSection + 1) / this.totalSections) * 100;
        document.getElementById('progressBar').style.width = progress + '%';
    }

    updateNavigation() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');
        
        prevBtn.disabled = this.currentSection === 0;
        
        if (this.currentSection === this.totalSections - 1) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
        }
    }

    validateCurrentSection() {
        const section = document.querySelector(\`[data-section="\${this.currentSection}"]\`);
        const fields = section.querySelectorAll('.form-input, .form-textarea, .form-select, input[type="radio"], input[type="checkbox"]');
        
        let isValid = true;
        const processedGroups = new Set();
        
        fields.forEach(field => {
            const fieldName = field.name;
            
            // Skip if already processed (for radio/checkbox groups)
            if (processedGroups.has(fieldName)) return;
            processedGroups.add(fieldName);
            
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    validateField(field) {
        const fieldName = field.name;
        const validation = this.validationRules[fieldName];
        const fieldGroup = document.querySelector(\`[data-field="\${fieldName}"]\`);
        
        if (!validation) return true;
        
        let value = this.getFieldValue(fieldName);
        let isValid = true;
        let errorMessage = '';
        
        // Required validation
        if (validation.required && (!value || (Array.isArray(value) && value.length === 0))) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        
        // Type-specific validation
        if (value && isValid) {
            switch (validation.type) {
                case 'email':
                    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid email address';
                    }
                    break;
                    
                case 'phone':
                    if (!/^\\+?[\\d\\s\\-\\(\\)]{7,15}$/.test(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid phone number';
                    }
                    break;
                    
                case 'url':
                    if (!/^https?:\\/\\/.+/.test(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid URL starting with http:// or https://';
                    }
                    break;
                    
                case 'number':
                    const num = parseFloat(value);
                    if (isNaN(num)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid number';
                    } else {
                        if (validation.min !== undefined && num < validation.min) {
                            isValid = false;
                            errorMessage = \`Minimum value is \${validation.min}\`;
                        }
                        if (validation.max !== undefined && num > validation.max) {
                            isValid = false;
                            errorMessage = \`Maximum value is \${validation.max}\`;
                        }
                    }
                    break;
            }
            
            // Length validation
            if (validation.minLength && value.length < validation.minLength) {
                isValid = false;
                errorMessage = \`Minimum length is \${validation.minLength} characters\`;
            }
            
            if (validation.maxLength && value.length > validation.maxLength) {
                isValid = false;
                errorMessage = \`Maximum length is \${validation.maxLength} characters\`;
            }
            
            // Pattern validation
            if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
                isValid = false;
                errorMessage = validation.message || 'Invalid format';
            }
        }
        
        if (isValid) {
            this.clearFieldError(field);
            fieldGroup?.classList.remove('error');
        } else {
            this.showFieldError(field, errorMessage);
            fieldGroup?.classList.add('error');
        }
        
        return isValid;
    }

    getFieldValue(fieldName) {
        const field = document.querySelector(\`[name="\${fieldName}"]\`);
        
        if (!field) return null;
        
        if (field.type === 'radio') {
            const checked = document.querySelector(\`[name="\${fieldName}"]:checked\`);
            return checked ? checked.value : null;
        }
        
        if (field.type === 'checkbox') {
            const checked = document.querySelectorAll(\`[name="\${fieldName}"]:checked\`);
            return Array.from(checked).map(cb => cb.value);
        }
        
        if (field.type === 'file') {
            return field.files.length > 0 ? Array.from(field.files) : null;
        }
        
        return field.value.trim();
    }

    showFieldError(field, message) {
        const errorElement = document.getElementById(field.name + '_error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    clearFieldError(field) {
        const errorElement = document.getElementById(field.name + '_error');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }
    }

    collectFormData() {
        const formData = new FormData();
        const data = {};
        
        Object.keys(this.validationRules).forEach(fieldName => {
            const value = this.getFieldValue(fieldName);
            
            if (value !== null && value !== '') {
                if (Array.isArray(value)) {
                    if (value[0] instanceof File) {
                        // Handle file uploads
                        value.forEach((file, index) => {
                            formData.append(\`\${fieldName}[\${index}]\`, file);
                        });
                        data[fieldName] = value.map(file => ({ name: file.name, size: file.size, type: file.type }));
                    } else {
                        // Handle checkbox arrays
                        data[fieldName] = value;
                        formData.append(fieldName, JSON.stringify(value));
                    }
                } else {
                    data[fieldName] = value;
                    formData.append(fieldName, value);
                }
            }
        });
        
        return { data, formData };
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateCurrentSection()) {
            return;
        }
        
        this.showLoading();
        
        try {
            const { data, formData } = this.collectFormData();
            
            // Submit to backend
            const response = await fetch('/api/submissions', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Submission failed');
            }
            
            const result = await response.json();
            
            this.hideLoading();
            this.showSuccess(result);
            this.clearSavedData();
            
        } catch (error) {
            console.error('Submission error:', error);
            this.hideLoading();
            this.showError(error.message);
        }
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showSuccess(result) {
        document.getElementById('mainForm').style.display = 'none';
        document.getElementById('successMessage').style.display = 'block';
        
        // Show submission summary
        this.showSubmissionSummary(result);
    }

    showError(message) {
        document.getElementById('errorText').textContent = message;
        document.getElementById('errorMessage').style.display = 'block';
        
        setTimeout(() => {
            document.getElementById('errorMessage').style.display = 'none';
        }, 5000);
    }

    showSubmissionSummary(result) {
        const summary = document.getElementById('submissionSummary');
        const content = document.getElementById('summaryContent');
        
        let html = '<div class="summary-grid">';
        
        Object.entries(result.data || {}).forEach(([key, value]) => {
            const label = this.getFieldLabel(key);
            html += \`
                <div class="summary-item">
                    <strong>\${label}:</strong>
                    <span>\${Array.isArray(value) ? value.join(', ') : value}</span>
                </div>
            \`;
        });
        
        html += '</div>';
        
        if (result.submissionId) {
            html += \`<p><strong>Submission ID:</strong> \${result.submissionId}</p>\`;
        }
        
        content.innerHTML = html;
        summary.style.display = 'block';
    }

    getFieldLabel(fieldName) {
        const validation = this.validationRules[fieldName];
        return validation?.label || fieldName.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
    }

    async downloadPDF() {
        try {
            const { data } = this.collectFormData();
            
            const response = await fetch('/api/pdf/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data, template: 'submission' })
            });
            
            if (!response.ok) {
                throw new Error('PDF generation failed');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'submission.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        } catch (error) {
            console.error('PDF download error:', error);
            alert('Failed to download PDF. Please try again.');
        }
    }

    async emailCopy() {
        try {
            const { data } = this.collectFormData();
            
            const email = prompt('Enter email address to send copy:');
            if (!email) return;
            
            const response = await fetch('/api/email/send-copy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data, email })
            });
            
            if (!response.ok) {
                throw new Error('Email sending failed');
            }
            
            alert('Email sent successfully!');
            
        } catch (error) {
            console.error('Email error:', error);
            alert('Failed to send email. Please try again.');
        }
    }

    newSubmission() {
        // Reset form
        document.getElementById('mainForm').reset();
        document.getElementById('mainForm').style.display = 'block';
        document.getElementById('successMessage').style.display = 'none';
        document.getElementById('submissionSummary').style.display = 'none';
        
        // Reset navigation
        this.currentSection = 0;
        this.hideSection(1);
        this.hideSection(2);
        this.showSection(0);
        this.updateProgress();
        this.updateNavigation();
        
        // Clear saved data
        this.clearSavedData();
        
        // Clear file lists
        document.querySelectorAll('.file-list').forEach(list => {
            list.innerHTML = '';
        });
        
        // Clear errors
        document.querySelectorAll('.field-error').forEach(error => {
            error.classList.remove('show');
        });
        
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
        });
    }

    saveFormData() {
        const { data } = this.collectFormData();
        localStorage.setItem('microapp_form_data', JSON.stringify({
            data,
            currentSection: this.currentSection,
            timestamp: Date.now()
        }));
    }

    loadSavedData() {
        const saved = localStorage.getItem('microapp_form_data');
        if (!saved) return;
        
        try {
            const { data, currentSection, timestamp } = JSON.parse(saved);
            
            // Only load if data is less than 24 hours old
            if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
                this.clearSavedData();
                return;
            }
            
            // Restore form values
            Object.entries(data).forEach(([fieldName, value]) => {
                const field = document.querySelector(\`[name="\${fieldName}"]\`);
                if (field && field.type !== 'file') {
                    if (field.type === 'radio') {
                        const radio = document.querySelector(\`[name="\${fieldName}"][value="\${value}"]\`);
                        if (radio) radio.checked = true;
                    } else if (field.type === 'checkbox') {
                        if (Array.isArray(value)) {
                            value.forEach(val => {
                                const checkbox = document.querySelector(\`[name="\${fieldName}"][value="\${val}"]\`);
                                if (checkbox) checkbox.checked = true;
                            });
                        }
                    } else {
                        field.value = value;
                    }
                }
            });
            
            // Restore section
            if (currentSection > 0) {
                this.hideSection(this.currentSection);
                this.currentSection = currentSection;
                this.showSection(this.currentSection);
                this.updateProgress();
                this.updateNavigation();
            }
            
            console.log('📥 Restored saved form data');
            
        } catch (error) {
            console.error('Failed to load saved data:', error);
            this.clearSavedData();
        }
    }

    clearSavedData() {
        localStorage.removeItem('microapp_form_data');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MicroApp();
});

// Service Worker for offline functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered:', registration))
            .catch(error => console.log('SW registration failed:', error));
    });
}`;
    }

    /**
     * Generate validation rules object
     */
    generateValidationRules(fields) {
        const rules = {};
        
        fields.forEach(field => {
            rules[field.name] = {
                type: field.type,
                label: field.label,
                required: field.required || false
            };
            
            if (field.validation) {
                Object.assign(rules[field.name], field.validation);
            }
            
            if (field.options) {
                rules[field.name].options = field.options;
            }
        });
        
        return rules;
    }

    /**
     * Generate app manifest
     */
    async generateManifest(analysis, configuration) {
        const appName = configuration.appName || 'Micro App';
        
        return JSON.stringify({
            name: appName,
            short_name: appName.substring(0, 12),
            description: analysis.description || 'AI-generated micro application',
            start_url: '/',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: configuration.primaryColor || '#4CAF50',
            icons: [
                {
                    src: '/icon-192x192.png',
                    sizes: '192x192',
                    type: 'image/png'
                },
                {
                    src: '/icon-512x512.png',
                    sizes: '512x512',
                    type: 'image/png'
                }
            ],
            categories: ['productivity', 'business'],
            lang: 'en',
            scope: '/',
            orientation: 'portrait-primary'
        }, null, 2);
    }

    /**
     * Generate backend code
     */
    async generateBackendCode(analysis, configuration) {
        // This would generate Node.js/Express backend code
        // For brevity, returning structure outline
        return {
            routes: await this.generateBackendRoutes(analysis),
            models: await this.generateBackendModels(analysis),
            controllers: await this.generateBackendControllers(analysis),
            middleware: await this.generateBackendMiddleware(analysis),
            config: await this.generateBackendConfig(configuration)
        };
    }

    async generateBackendRoutes(analysis) {
        return `// Generated routes for micro app
const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const upload = require('../middleware/upload');

// Submission routes
router.post('/submissions', upload.any(), submissionController.create);
router.get('/submissions/:id', submissionController.getById);
router.get('/submissions', submissionController.getAll);
router.put('/submissions/:id', submissionController.update);
router.delete('/submissions/:id', submissionController.delete);

// PDF generation
router.post('/pdf/generate', submissionController.generatePDF);

// Email functionality
router.post('/email/send-copy', submissionController.sendEmailCopy);

module.exports = router;`;
    }

    async generateBackendModels(analysis) {
        const fields = analysis.formFields || [];
        
        const schemaFields = fields.map(field => {
            let schemaType = 'String';
            const options = [];
            
            switch (field.type) {
                case 'number':
                    schemaType = 'Number';
                    break;
                case 'date':
                case 'datetime':
                    schemaType = 'Date';
                    break;
                case 'checkbox':
                    schemaType = '[String]';
                    break;
                case 'file':
                    schemaType = '[{ filename: String, originalName: String, mimetype: String, size: Number, path: String }]';
                    break;
            }
            
            if (field.required) options.push('required: true');
            if (field.validation?.min !== undefined) options.push(`min: ${field.validation.min}`);
            if (field.validation?.max !== undefined) options.push(`max: ${field.validation.max}`);
            
            return `  ${field.name}: { type: ${schemaType}${options.length > 0 ? ', ' + options.join(', ') : ''} }`;
        }).join(',\n');

        return `// Generated Mongoose model
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
${schemaFields},
  status: { type: String, default: 'submitted', enum: ['submitted', 'processing', 'approved', 'rejected', 'completed'] },
  submittedAt: { type: Date, default: Date.now },
  submittedBy: { type: String },
  processedAt: { type: Date },
  notes: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Submission', submissionSchema);`;
    }

    async generateBackendControllers(analysis) {
        return `// Generated submission controller
const Submission = require('../models/Submission');
const PDFGenerator = require('../services/pdfGenerator');
const EmailService = require('../services/emailService');

class SubmissionController {
    async create(req, res) {
        try {
            const submissionData = { ...req.body };
            
            // Handle file uploads
            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    const fieldName = file.fieldname.replace(/\\[\\d+\\]$/, '');
                    if (!submissionData[fieldName]) {
                        submissionData[fieldName] = [];
                    }
                    submissionData[fieldName].push({
                        filename: file.filename,
                        originalName: file.originalname,
                        mimetype: file.mimetype,
                        size: file.size,
                        path: file.path
                    });
                });
            }
            
            const submission = new Submission(submissionData);
            await submission.save();
            
            res.status(201).json({
                success: true,
                submissionId: submission._id,
                data: submissionData,
                message: 'Submission created successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    async getById(req, res) {
        try {
            const submission = await Submission.findById(req.params.id);
            if (!submission) {
                return res.status(404).json({ error: 'Submission not found' });
            }
            res.json(submission);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            
            const submissions = await Submission.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
                
            const total = await Submission.countDocuments();
            
            res.json({
                submissions,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async generatePDF(req, res) {
        try {
            const { data, template } = req.body;
            const pdfBuffer = await PDFGenerator.generateFromData(data, template);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="submission.pdf"');
            res.send(pdfBuffer);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async sendEmailCopy(req, res) {
        try {
            const { data, email } = req.body;
            await EmailService.sendSubmissionCopy(email, data);
            
            res.json({
                success: true,
                message: 'Email sent successfully'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new SubmissionController();`;
    }

    async generateBackendMiddleware(analysis) {
        return `// Generated middleware
const multer = require('multer');
const path = require('path');

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

module.exports = upload;`;
    }

    async generateBackendConfig(configuration) {
        return `// Generated configuration
module.exports = {
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/microapp'
    },
    upload: {
        destination: 'uploads/',
        maxFileSize: 10485760 // 10MB
    },
    email: {
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    },
    pdf: {
        format: 'A4',
        margin: '1in'
    }
};`;
    }
}

module.exports = {
    generateMicroAppCode: async (analysis, type, configuration) => {
        const generator = new CodeGenerator();
        return await generator.generateMicroAppCode(analysis, type, configuration);
    }
};