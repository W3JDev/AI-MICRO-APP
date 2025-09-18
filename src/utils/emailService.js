const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
        this.initializeTransporter();
    }

    initializeTransporter() {
        try {
            if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
                this.transporter = nodemailer.createTransporter({
                    host: process.env.EMAIL_HOST,
                    port: parseInt(process.env.EMAIL_PORT) || 587,
                    secure: process.env.EMAIL_PORT === '465',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                });

                this.initialized = true;
                console.log('📧 Email service initialized');
            } else {
                console.log('📧 Email service not configured - set EMAIL_HOST, EMAIL_USER, EMAIL_PASS in environment');
            }
        } catch (error) {
            console.error('❌ Email service initialization failed:', error.message);
        }
    }

    /**
     * Send submission confirmation email
     */
    async sendSubmissionConfirmation(email, submission) {
        if (!this.initialized) {
            console.warn('Email service not initialized, skipping email');
            return;
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Submission Confirmation - ${submission.submissionId}`,
                html: this.generateConfirmationEmail(submission),
                text: this.generateConfirmationText(submission)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Confirmation email sent to ${email}`);
            return result;
        } catch (error) {
            console.error('❌ Failed to send confirmation email:', error);
            throw error;
        }
    }

    /**
     * Send status update email
     */
    async sendStatusUpdate(email, submission, newStatus) {
        if (!this.initialized) {
            console.warn('Email service not initialized, skipping email');
            return;
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Status Update - ${submission.submissionId}`,
                html: this.generateStatusUpdateEmail(submission, newStatus),
                text: this.generateStatusUpdateText(submission, newStatus)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Status update email sent to ${email}`);
            return result;
        } catch (error) {
            console.error('❌ Failed to send status update email:', error);
            throw error;
        }
    }

    /**
     * Send submission copy email
     */
    async sendSubmissionCopy(email, submission, includeAttachments = false) {
        if (!this.initialized) {
            console.warn('Email service not initialized, skipping email');
            return;
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Submission Copy - ${submission.submissionId}`,
                html: this.generateSubmissionCopyEmail(submission),
                text: this.generateSubmissionCopyText(submission)
            };

            // Add attachments if requested and available
            if (includeAttachments && submission.attachments && submission.attachments.length > 0) {
                mailOptions.attachments = submission.attachments.map(att => ({
                    filename: att.originalName,
                    path: att.path
                }));
            }

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Submission copy sent to ${email}`);
            return result;
        } catch (error) {
            console.error('❌ Failed to send submission copy:', error);
            throw error;
        }
    }

    /**
     * Send approval request email
     */
    async sendApprovalRequest(email, submission, approverName) {
        if (!this.initialized) {
            console.warn('Email service not initialized, skipping email');
            return;
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Approval Required - ${submission.submissionId}`,
                html: this.generateApprovalRequestEmail(submission, approverName),
                text: this.generateApprovalRequestText(submission, approverName)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Approval request sent to ${email}`);
            return result;
        } catch (error) {
            console.error('❌ Failed to send approval request:', error);
            throw error;
        }
    }

    /**
     * Generate confirmation email HTML
     */
    generateConfirmationEmail(submission) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .field { margin-bottom: 10px; }
        .field strong { display: inline-block; width: 150px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .success { color: #4CAF50; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Submission Received</h1>
        </div>
        <div class="content">
            <p>Thank you for your submission! We have successfully received your information.</p>
            
            <h3>Submission Details:</h3>
            <div class="field"><strong>Submission ID:</strong> ${submission.submissionId}</div>
            <div class="field"><strong>Status:</strong> <span class="success">${submission.status}</span></div>
            <div class="field"><strong>Submitted:</strong> ${submission.createdAt.toLocaleString()}</div>
            ${submission.workflowId ? `<div class="field"><strong>Workflow ID:</strong> ${submission.workflowId}</div>` : ''}
            
            <h3>Submitted Information:</h3>
            ${this.formatFormData(submission.formData)}
            
            ${submission.attachments && submission.attachments.length > 0 ? `
            <h3>Attachments:</h3>
            <ul>
                ${submission.attachments.map(att => `<li>${att.originalName} (${this.formatFileSize(att.size)})</li>`).join('')}
            </ul>
            ` : ''}
            
            <p><strong>What's Next?</strong></p>
            <p>Your submission is being processed. You will receive email updates as the status changes.</p>
        </div>
        <div class="footer">
            <p>Generated by AI Micro App Builder</p>
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Generate status update email HTML
     */
    generateStatusUpdateEmail(submission, newStatus) {
        const statusColors = {
            'submitted': '#2196F3',
            'processing': '#FF9800',
            'pending_approval': '#9C27B0',
            'approved': '#4CAF50',
            'rejected': '#F44336',
            'completed': '#4CAF50',
            'archived': '#607D8B'
        };

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusColors[newStatus] || '#2196F3'}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .status-badge { 
            display: inline-block; 
            padding: 5px 15px; 
            background: ${statusColors[newStatus] || '#2196F3'}; 
            color: white; 
            border-radius: 20px; 
            font-weight: bold;
        }
        .timeline { margin: 20px 0; }
        .timeline-item { 
            padding: 10px; 
            border-left: 3px solid ${statusColors[newStatus] || '#2196F3'}; 
            margin-left: 10px; 
            margin-bottom: 10px; 
        }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Status Update</h1>
        </div>
        <div class="content">
            <p>Your submission status has been updated.</p>
            
            <h3>Current Status: <span class="status-badge">${newStatus.replace('_', ' ').toUpperCase()}</span></h3>
            
            <div class="field"><strong>Submission ID:</strong> ${submission.submissionId}</div>
            <div class="field"><strong>Last Updated:</strong> ${new Date().toLocaleString()}</div>
            
            ${submission.approvals && submission.approvals.length > 0 ? `
            <h3>Approval History:</h3>
            <div class="timeline">
                ${submission.approvals.map(approval => `
                    <div class="timeline-item">
                        <strong>${approval.step}:</strong> ${approval.status} by ${approval.approver}<br>
                        <small>${approval.timestamp.toLocaleString()}</small>
                        ${approval.comment ? `<br><em>"${approval.comment}"</em>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <p><strong>Need Help?</strong></p>
            <p>If you have any questions about this update, please contact our support team.</p>
        </div>
        <div class="footer">
            <p>Generated by AI Micro App Builder</p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Generate submission copy email HTML
     */
    generateSubmissionCopyEmail(submission) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .field { margin-bottom: 10px; }
        .field strong { display: inline-block; width: 150px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📄 Submission Copy</h1>
        </div>
        <div class="content">
            <p>Here is a copy of the requested submission:</p>
            
            <h3>Submission Details:</h3>
            <div class="field"><strong>Submission ID:</strong> ${submission.submissionId}</div>
            <div class="field"><strong>Status:</strong> ${submission.status}</div>
            <div class="field"><strong>Submitted:</strong> ${submission.createdAt.toLocaleString()}</div>
            <div class="field"><strong>Submitted By:</strong> ${submission.submittedBy.name} (${submission.submittedBy.email})</div>
            
            <h3>Form Data:</h3>
            ${this.formatFormData(submission.formData)}
        </div>
        <div class="footer">
            <p>Generated by AI Micro App Builder</p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Generate approval request email HTML
     */
    generateApprovalRequestEmail(submission, approverName) {
        const approvalUrl = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3000'}/approval/${submission.submissionId}`;
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #9C27B0; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #4CAF50; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 10px 5px; 
        }
        .button.reject { background: #F44336; }
        .field { margin-bottom: 10px; }
        .field strong { display: inline-block; width: 150px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏳ Approval Required</h1>
        </div>
        <div class="content">
            <p>Hello ${approverName},</p>
            <p>A submission requires your approval:</p>
            
            <h3>Submission Details:</h3>
            <div class="field"><strong>Submission ID:</strong> ${submission.submissionId}</div>
            <div class="field"><strong>Submitted By:</strong> ${submission.submittedBy.name} (${submission.submittedBy.email})</div>
            <div class="field"><strong>Submitted:</strong> ${submission.createdAt.toLocaleString()}</div>
            
            <h3>Form Data:</h3>
            ${this.formatFormData(submission.formData)}
            
            <h3>Action Required:</h3>
            <p>Please review the submission and take action:</p>
            <a href="${approvalUrl}?action=approve" class="button">✅ Approve</a>
            <a href="${approvalUrl}?action=reject" class="button reject">❌ Reject</a>
            
            <p><em>Or visit: <a href="${approvalUrl}">${approvalUrl}</a></em></p>
        </div>
        <div class="footer">
            <p>Generated by AI Micro App Builder</p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Format form data for email display
     */
    formatFormData(formData) {
        if (!formData || typeof formData !== 'object') {
            return '<p>No form data available</p>';
        }

        let html = '<div style="background: white; padding: 15px; border-radius: 5px;">';
        
        Object.entries(formData).forEach(([key, value]) => {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let displayValue = value;

            if (Array.isArray(value)) {
                displayValue = value.join(', ');
            } else if (typeof value === 'object') {
                displayValue = JSON.stringify(value, null, 2);
            }

            html += `<div style="margin-bottom: 8px;"><strong>${label}:</strong> ${displayValue}</div>`;
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Generate text versions of emails
     */
    generateConfirmationText(submission) {
        return `
SUBMISSION CONFIRMATION

Thank you for your submission! We have successfully received your information.

Submission ID: ${submission.submissionId}
Status: ${submission.status}
Submitted: ${submission.createdAt.toLocaleString()}

Your submission is being processed. You will receive email updates as the status changes.

Generated by AI Micro App Builder
        `.trim();
    }

    generateStatusUpdateText(submission, newStatus) {
        return `
STATUS UPDATE

Your submission status has been updated.

Submission ID: ${submission.submissionId}
New Status: ${newStatus.replace('_', ' ').toUpperCase()}
Last Updated: ${new Date().toLocaleString()}

If you have any questions about this update, please contact our support team.

Generated by AI Micro App Builder
        `.trim();
    }

    generateSubmissionCopyText(submission) {
        return `
SUBMISSION COPY

Submission ID: ${submission.submissionId}
Status: ${submission.status}
Submitted: ${submission.createdAt.toLocaleString()}
Submitted By: ${submission.submittedBy.name} (${submission.submittedBy.email})

Form Data:
${Object.entries(submission.formData || {}).map(([key, value]) => 
    `${key.replace(/_/g, ' ')}: ${Array.isArray(value) ? value.join(', ') : value}`
).join('\n')}

Generated by AI Micro App Builder
        `.trim();
    }

    generateApprovalRequestText(submission, approverName) {
        const approvalUrl = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3000'}/approval/${submission.submissionId}`;
        
        return `
APPROVAL REQUIRED

Hello ${approverName},

A submission requires your approval:

Submission ID: ${submission.submissionId}
Submitted By: ${submission.submittedBy.name} (${submission.submittedBy.email})
Submitted: ${submission.createdAt.toLocaleString()}

Please review and approve/reject at: ${approvalUrl}

Generated by AI Micro App Builder
        `.trim();
    }

    /**
     * Test email configuration
     */
    async testConnection() {
        if (!this.initialized) {
            throw new Error('Email service not initialized');
        }

        try {
            await this.transporter.verify();
            console.log('✅ Email service connection test successful');
            return true;
        } catch (error) {
            console.error('❌ Email service connection test failed:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();