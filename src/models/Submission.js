const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  // Basic info
  submissionId: {
    type: String,
    unique: true,
    required: true,
    default: () => `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Source information
  source: {
    type: String,
    enum: ['upload', 'google_sheets', 'google_forms', 'microsoft_forms', 'manual'],
    required: true
  },
  
  // Form data (flexible schema)
  formData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Files attached
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Workflow status
  status: {
    type: String,
    enum: ['submitted', 'processing', 'pending_approval', 'approved', 'rejected', 'completed', 'archived'],
    default: 'submitted'
  },
  
  // Workflow tracking
  workflowId: String,
  currentStep: String,
  approvals: [{
    step: String,
    approver: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    comment: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Generated content
  generatedPdf: {
    filename: String,
    path: String,
    generatedAt: Date
  },
  
  // Metadata
  submittedBy: {
    name: String,
    email: String,
    ip: String
  },
  
  // Analytics
  processingTime: Number,
  lastActivity: { type: Date, default: Date.now },
  
  // Email notifications sent
  notifications: [{
    type: String,
    recipient: String,
    sentAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['sent', 'failed', 'pending'] }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
submissionSchema.index({ submissionId: 1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ 'submittedBy.email': 1 });
submissionSchema.index({ createdAt: -1 });
submissionSchema.index({ workflowId: 1 });

// Virtual for days since submission
submissionSchema.virtual('daysSinceSubmission').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Methods
submissionSchema.methods.addApproval = function(step, approver, status, comment) {
  this.approvals.push({
    step,
    approver,
    status,
    comment,
    timestamp: new Date()
  });
  return this.save();
};

submissionSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  this.lastActivity = new Date();
  return this.save();
};

submissionSchema.methods.addNotification = function(type, recipient, status = 'sent') {
  this.notifications.push({
    type,
    recipient,
    status,
    sentAt: new Date()
  });
  return this.save();
};

// Statics
submissionSchema.statics.findByEmail = function(email) {
  return this.find({ 'submittedBy.email': email }).sort({ createdAt: -1 });
};

submissionSchema.statics.getSubmissionStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Submission', submissionSchema);