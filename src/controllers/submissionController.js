const { generateMicroAppCode } = require('../services/codeGenerator');
const { createWorkflow } = require('../services/workflowBuilder');
const PDFGenerator = require('../utils/pdfGenerator');
const EmailService = require('../utils/emailService');

// Fallback for when mongoose is not available
let SubmissionModel = null;

// In-memory storage fallback
const submissionsStore = new Map();

SubmissionModel = {
    async create(data) {
        const submission = {
            ...data,
            _id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            submissionId: data.submissionId || `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: data.status || 'submitted'
        };
        submissionsStore.set(submission._id, submission);
        return submission;
    },
    
    async findOne(query) {
        for (const submission of submissionsStore.values()) {
            if (query._id && submission._id === query._id) return submission;
            if (query.submissionId && submission.submissionId === query.submissionId) return submission;
            if (query.$or) {
                for (const condition of query.$or) {
                    if (condition._id && submission._id === condition._id) return submission;
                    if (condition.submissionId && submission.submissionId === condition.submissionId) return submission;
                }
            }
        }
        return null;
    },
    
    async find(query = {}) {
        const results = Array.from(submissionsStore.values());
        return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    
    async countDocuments(query = {}) {
        return submissionsStore.size;
    },
    
    async findOneAndDelete(query) {
        const submission = await this.findOne(query);
        if (submission) {
            submissionsStore.delete(submission._id);
        }
        return submission;
    },
    
    getSubmissionStats() {
        const submissions = Array.from(submissionsStore.values());
        const stats = {};
        submissions.forEach(sub => {
            stats[sub.status] = (stats[sub.status] || 0) + 1;
        });
        return Object.entries(stats).map(([_id, count]) => ({ _id, count }));
    }
};

class SubmissionController {
    /**
     * Create a new submission
     */
    async create(req, res) {
        try {
            const submissionData = { ...req.body };
            
            // Handle file uploads
            if (req.files && req.files.length > 0) {
                submissionData.attachments = req.files.map(file => ({
                    filename: file.filename,
                    originalName: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    path: file.path
                }));
            }

            // Extract submitter information
            submissionData.submittedBy = {
                name: req.body.submitter_name || 'Anonymous',
                email: req.body.submitter_email || req.body.email,
                ip: req.ip
            };

            // Set source
            submissionData.source = req.body.source || 'manual';

            const submission = await SubmissionModel.create ? 
                await SubmissionModel.create(submissionData) : 
                new SubmissionModel(submissionData);
                
            // If using mongoose, save the submission
            if (submission.save) {
                await submission.save();
            }

            // If workflow is specified, create and start it
            if (req.body.workflowType) {
                try {
                    const workflow = await createWorkflow(req.body.analysis || {}, {
                        workflowType: req.body.workflowType,
                        ...req.body.workflowConfig
                    });
                    submission.workflowId = workflow.workflowId;
                    await submission.save();
                } catch (workflowError) {
                    console.warn('Failed to create workflow:', workflowError.message);
                }
            }

            // Send confirmation email if email provided
            if (submissionData.submittedBy.email) {
                try {
                    await EmailService.sendSubmissionConfirmation(
                        submissionData.submittedBy.email,
                        submission
                    );
                    await submission.addNotification('confirmation', submissionData.submittedBy.email);
                } catch (emailError) {
                    console.warn('Failed to send confirmation email:', emailError.message);
                }
            }

            res.status(201).json({
                success: true,
                data: {
                    submissionId: submission.submissionId,
                    status: submission.status,
                    workflowId: submission.workflowId,
                    createdAt: submission.createdAt
                },
                message: 'Submission created successfully'
            });
        } catch (error) {
            console.error('Submission creation failed:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get submission by ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            const submission = await Submission.findOne({
                $or: [{ _id: id }, { submissionId: id }]
            });

            if (!submission) {
                return res.status(404).json({
                    success: false,
                    error: 'Submission not found'
                });
            }

            res.json({
                success: true,
                data: submission,
                message: 'Submission retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get all submissions with pagination
     */
    async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            
            const filter = {};
            if (req.query.status) filter.status = req.query.status;
            if (req.query.email) filter['submittedBy.email'] = req.query.email;
            if (req.query.source) filter.source = req.query.source;

            const submissions = await SubmissionModel.find(filter);
            const total = await SubmissionModel.countDocuments(filter);
            
            res.json({
                success: true,
                data: {
                    submissions,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    }
                },
                message: 'Submissions retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Update submission status
     */
    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, comment, approver } = req.body;

            const submission = await Submission.findOne({
                $or: [{ _id: id }, { submissionId: id }]
            });

            if (!submission) {
                return res.status(404).json({
                    success: false,
                    error: 'Submission not found'
                });
            }

            // Update status
            await submission.updateStatus(status);

            // Add approval if provided
            if (approver && ['approved', 'rejected'].includes(status)) {
                await submission.addApproval(
                    submission.currentStep || 'review',
                    approver,
                    status,
                    comment
                );
            }

            // Send notification email
            if (submission.submittedBy.email) {
                try {
                    await EmailService.sendStatusUpdate(
                        submission.submittedBy.email,
                        submission,
                        status
                    );
                    await submission.addNotification('status_update', submission.submittedBy.email);
                } catch (emailError) {
                    console.warn('Failed to send status update email:', emailError.message);
                }
            }

            res.json({
                success: true,
                data: submission,
                message: 'Submission status updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Generate PDF for submission
     */
    async generatePDF(req, res) {
        try {
            const { data, template, submissionId } = req.body;

            const pdfBuffer = await PDFGenerator.generateFromData(data, template || 'submission');

            // If submissionId provided, save PDF info to submission
            if (submissionId) {
                const submission = await Submission.findOne({
                    $or: [{ _id: submissionId }, { submissionId: submissionId }]
                });

                if (submission) {
                    const filename = `${submissionId}_${Date.now()}.pdf`;
                    submission.generatedPdf = {
                        filename,
                        path: `/generated/${filename}`,
                        generatedAt: new Date()
                    };
                    await submission.save();
                }
            }
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${submissionId || 'document'}.pdf"`);
            res.send(pdfBuffer);
        } catch (error) {
            console.error('PDF generation failed:', error);
            res.status(500).json({
                success: false,
                error: `PDF generation failed: ${error.message}`
            });
        }
    }

    /**
     * Send email copy of submission
     */
    async sendEmailCopy(req, res) {
        try {
            const { email, submissionId, includeAttachments } = req.body;

            if (!email || !submissionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and submission ID are required'
                });
            }

            const submission = await Submission.findOne({
                $or: [{ _id: submissionId }, { submissionId: submissionId }]
            });

            if (!submission) {
                return res.status(404).json({
                    success: false,
                    error: 'Submission not found'
                });
            }

            await EmailService.sendSubmissionCopy(email, submission, includeAttachments);
            await submission.addNotification('copy_sent', email);

            res.json({
                success: true,
                message: 'Email sent successfully'
            });
        } catch (error) {
            console.error('Email sending failed:', error);
            res.status(500).json({
                success: false,
                error: `Email sending failed: ${error.message}`
            });
        }
    }

    /**
     * Get submission statistics
     */
    async getStats(req, res) {
        try {
            const stats = await (SubmissionModel.getSubmissionStats ? 
                SubmissionModel.getSubmissionStats() : []);
            const totalSubmissions = await SubmissionModel.countDocuments();
            
            // Calculate additional metrics
            const recentSubmissions = await SubmissionModel.countDocuments();

            const avgProcessingTime = [{ avgTime: 0 }]; // Simplified for memory store

            res.json({
                success: true,
                data: {
                    totalSubmissions,
                    recentSubmissions,
                    statusBreakdown: stats,
                    averageProcessingTime: avgProcessingTime[0]?.avgTime || 0,
                    generatedAt: new Date().toISOString()
                },
                message: 'Statistics retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Delete submission
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            
            const submission = await SubmissionModel.findOneAndDelete({
                $or: [{ _id: id }, { submissionId: id }]
            });

            if (!submission) {
                return res.status(404).json({
                    success: false,
                    error: 'Submission not found'
                });
            }

            res.json({
                success: true,
                message: 'Submission deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new SubmissionController();