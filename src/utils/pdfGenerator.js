const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');

class PDFGenerator {
    constructor() {
        this.templates = {
            submission: this.generateSubmissionPDF,
            invoice: this.generateInvoicePDF,
            report: this.generateReportPDF,
            certificate: this.generateCertificatePDF
        };
    }

    /**
     * Generate PDF from data using specified template
     */
    async generateFromData(data, template = 'submission', options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: options.size || 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });

                doc.on('error', reject);

                // Generate content based on template
                const templateFunction = this.templates[template] || this.templates.submission;
                templateFunction.call(this, doc, data, options);

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generate submission PDF template
     */
    generateSubmissionPDF(doc, data, options) {
        // Header with logo placeholder
        doc.fontSize(24)
           .fillColor('#4CAF50')
           .text('📋 Submission Document', { align: 'center' });

        doc.moveDown(0.5);
        
        // Add a line
        doc.strokeColor('#4CAF50')
           .lineWidth(2)
           .moveTo(50, doc.y)
           .lineTo(545, doc.y)
           .stroke();

        doc.moveDown();

        // Submission metadata
        if (data.submissionId || data.id) {
            doc.fontSize(14)
               .fillColor('#333')
               .text('Submission Information', { underline: true });
            
            doc.fontSize(11)
               .text(`Submission ID: ${data.submissionId || data.id || 'N/A'}`)
               .text(`Generated: ${new Date().toLocaleString()}`)
               .text(`Status: ${data.status || 'Submitted'}`);

            if (data.submittedBy) {
                doc.text(`Submitted by: ${data.submittedBy.name || 'Unknown'} (${data.submittedBy.email || 'N/A'})`);
            }

            doc.moveDown();
        }

        // Form data section
        doc.fontSize(14)
           .fillColor('#333')
           .text('Form Data', { underline: true });
        
        doc.moveDown(0.5);

        // Process form data
        const formData = data.formData || data;
        if (formData && typeof formData === 'object') {
            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'submissionId' || key === 'id' || key === 'status') return;
                
                const label = this.formatFieldLabel(key);
                const displayValue = this.formatFieldValue(value);
                
                doc.fontSize(11)
                   .fillColor('#555')
                   .text(`${label}:`, { continued: true, width: 150 })
                   .fillColor('#333')
                   .text(` ${displayValue}`, { indent: 160 });
                
                doc.moveDown(0.3);
            });
        }

        // Attachments section
        if (data.attachments && data.attachments.length > 0) {
            doc.moveDown();
            doc.fontSize(14)
               .fillColor('#333')
               .text('Attachments', { underline: true });
            
            doc.moveDown(0.5);
            
            data.attachments.forEach((attachment, index) => {
                doc.fontSize(11)
                   .fillColor('#333')
                   .text(`${index + 1}. ${attachment.originalName || attachment.filename}`)
                   .fontSize(9)
                   .fillColor('#666')
                   .text(`   Size: ${this.formatFileSize(attachment.size)}, Type: ${attachment.mimetype || 'Unknown'}`);
                
                doc.moveDown(0.2);
            });
        }

        // Approval history
        if (data.approvals && data.approvals.length > 0) {
            doc.moveDown();
            doc.fontSize(14)
               .fillColor('#333')
               .text('Approval History', { underline: true });
            
            doc.moveDown(0.5);
            
            data.approvals.forEach((approval, index) => {
                const statusColor = approval.status === 'approved' ? '#4CAF50' : 
                                  approval.status === 'rejected' ? '#F44336' : '#FF9800';
                
                doc.fontSize(11)
                   .fillColor('#333')
                   .text(`${approval.step || 'Review'}:`, { continued: true })
                   .fillColor(statusColor)
                   .text(` ${approval.status.toUpperCase()}`)
                   .fillColor('#666')
                   .text(`By: ${approval.approver} on ${new Date(approval.timestamp).toLocaleString()}`);
                
                if (approval.comment) {
                    doc.fontSize(10)
                       .fillColor('#555')
                       .text(`Comment: "${approval.comment}"`, { indent: 20 });
                }
                
                doc.moveDown(0.5);
            });
        }

        // Footer
        this.addFooter(doc, options);
    }

    /**
     * Generate invoice PDF template
     */
    generateInvoicePDF(doc, data, options) {
        // Header
        doc.fontSize(28)
           .fillColor('#2196F3')
           .text('INVOICE', { align: 'right' });

        doc.fontSize(12)
           .fillColor('#333')
           .text('AI Micro App Builder', 50, 50)
           .text('Digital Solutions Provider', 50, 65)
           .text('support@aimicroapp.com', 50, 80);

        // Invoice details
        const invoiceNumber = data.invoiceNumber || `INV-${Date.now()}`;
        const invoiceDate = data.invoiceDate || new Date().toLocaleDateString();
        const dueDate = data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

        doc.text(`Invoice #: ${invoiceNumber}`, 400, 50)
           .text(`Date: ${invoiceDate}`, 400, 65)
           .text(`Due Date: ${dueDate}`, 400, 80);

        doc.moveDown(2);

        // Bill to section
        doc.fontSize(14)
           .text('Bill To:', { underline: true });
        
        doc.fontSize(12)
           .text(data.billTo?.name || 'Customer Name')
           .text(data.billTo?.email || 'customer@email.com')
           .text(data.billTo?.address || 'Customer Address');

        doc.moveDown();

        // Line items table
        this.generateInvoiceTable(doc, data.items || [], data);

        // Footer
        this.addFooter(doc, options);
    }

    /**
     * Generate report PDF template
     */
    generateReportPDF(doc, data, options) {
        // Header
        doc.fontSize(24)
           .fillColor('#FF9800')
           .text(data.title || 'Report', { align: 'center' });

        doc.moveDown();

        // Report metadata
        doc.fontSize(12)
           .fillColor('#333')
           .text(`Generated: ${new Date().toLocaleString()}`)
           .text(`Report Period: ${data.period || 'All Time'}`)
           .text(`Total Records: ${data.totalRecords || 'N/A'}`);

        doc.moveDown();

        // Report content
        if (data.sections) {
            data.sections.forEach(section => {
                doc.fontSize(16)
                   .fillColor('#333')
                   .text(section.title, { underline: true });
                
                doc.fontSize(12)
                   .text(section.content);
                
                doc.moveDown();
            });
        }

        this.addFooter(doc, options);
    }

    /**
     * Generate certificate PDF template
     */
    generateCertificatePDF(doc, data, options) {
        // Certificate border
        doc.rect(25, 25, 545, 770)
           .lineWidth(3)
           .strokeColor('#4CAF50')
           .stroke();

        doc.rect(35, 35, 525, 750)
           .lineWidth(1)
           .strokeColor('#4CAF50')
           .stroke();

        // Certificate header
        doc.fontSize(36)
           .fillColor('#4CAF50')
           .text('CERTIFICATE', { align: 'center' }, 100);

        doc.fontSize(16)
           .fillColor('#333')
           .text('OF COMPLETION', { align: 'center' });

        doc.moveDown(2);

        // Certificate content
        doc.fontSize(14)
           .text('This is to certify that', { align: 'center' });

        doc.fontSize(24)
           .fillColor('#2196F3')
           .text(data.recipientName || 'Recipient Name', { align: 'center' });

        doc.fontSize(14)
           .fillColor('#333')
           .text('has successfully completed', { align: 'center' });

        doc.fontSize(18)
           .text(data.courseName || 'Course/Program Name', { align: 'center' });

        doc.moveDown(2);

        doc.fontSize(12)
           .text(`Date: ${data.completionDate || new Date().toLocaleDateString()}`, { align: 'center' });

        this.addFooter(doc, options);
    }

    /**
     * Generate invoice table
     */
    generateInvoiceTable(doc, items, data) {
        const startY = doc.y;
        const tableTop = startY + 20;
        
        // Table headers
        doc.fontSize(12)
           .fillColor('#333')
           .text('Description', 50, tableTop)
           .text('Quantity', 300, tableTop)
           .text('Rate', 370, tableTop)
           .text('Amount', 450, tableTop);

        // Line under headers
        doc.moveTo(50, tableTop + 15)
           .lineTo(500, tableTop + 15)
           .stroke();

        let currentY = tableTop + 25;
        let subtotal = 0;

        // Table rows
        items.forEach(item => {
            const amount = (item.quantity || 1) * (item.rate || 0);
            subtotal += amount;

            doc.text(item.description || 'Service', 50, currentY)
               .text((item.quantity || 1).toString(), 300, currentY)
               .text(`$${(item.rate || 0).toFixed(2)}`, 370, currentY)
               .text(`$${amount.toFixed(2)}`, 450, currentY);

            currentY += 20;
        });

        // Totals
        const tax = data.tax || (subtotal * 0.1);
        const total = subtotal + tax;

        currentY += 10;
        doc.moveTo(300, currentY)
           .lineTo(500, currentY)
           .stroke();

        currentY += 10;
        doc.text('Subtotal:', 370, currentY)
           .text(`$${subtotal.toFixed(2)}`, 450, currentY);

        currentY += 15;
        doc.text('Tax:', 370, currentY)
           .text(`$${tax.toFixed(2)}`, 450, currentY);

        currentY += 15;
        doc.fontSize(14)
           .text('Total:', 370, currentY)
           .text(`$${total.toFixed(2)}`, 450, currentY);
    }

    /**
     * Add footer to PDF
     */
    addFooter(doc, options) {
        const pageHeight = doc.page.height;
        const footerY = pageHeight - 80;

        doc.fontSize(10)
           .fillColor('#666')
           .text('Generated by AI Micro App Builder', 50, footerY, { align: 'center' })
           .text(`Generated on: ${new Date().toLocaleString()}`, 50, footerY + 15, { align: 'center' });

        if (options.watermark) {
            doc.fontSize(60)
               .fillColor('#f0f0f0')
               .text(options.watermark, 0, 400, {
                   align: 'center',
                   angle: -45,
                   opacity: 0.1
               });
        }
    }

    /**
     * Format field label for display
     */
    formatFieldLabel(key) {
        return key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Format field value for display
     */
    formatFieldValue(value) {
        if (value === null || value === undefined) return 'N/A';
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'object') return JSON.stringify(value);
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return value.toString();
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (!bytes) return 'Unknown size';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Save PDF to file
     */
    async savePDFToFile(pdfBuffer, filename, directory = './generated') {
        try {
            // Ensure directory exists
            await fs.mkdir(directory, { recursive: true });
            
            const filePath = path.join(directory, filename);
            await fs.writeFile(filePath, pdfBuffer);
            
            console.log(`✅ PDF saved to: ${filePath}`);
            return filePath;
        } catch (error) {
            console.error('❌ Failed to save PDF:', error);
            throw error;
        }
    }

    /**
     * Create PDF with custom content
     */
    async createCustomPDF(content, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument(options);
                const buffers = [];
                
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));
                doc.on('error', reject);

                // Add custom content
                if (typeof content === 'function') {
                    content(doc);
                } else {
                    doc.fontSize(12).text(content.toString());
                }

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = new PDFGenerator();