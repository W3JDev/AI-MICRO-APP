const PDFGenerator = require('../utils/pdfGenerator');
const EmailService = require('../utils/emailService');

describe('PDF Generator', () => {
    test('should generate basic PDF from data', async () => {
        const testData = {
            title: 'Test Document',
            formData: {
                name: 'John Doe',
                email: 'john@example.com',
                message: 'Test message'
            }
        };

        const pdfBuffer = await PDFGenerator.generateFromData(testData, 'submission');
        
        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(0);
        
        // Check if it's a valid PDF by looking for PDF header
        const pdfHeader = pdfBuffer.slice(0, 4).toString();
        expect(pdfHeader).toBe('%PDF');
    });

    test('should generate invoice PDF', async () => {
        const invoiceData = {
            invoiceNumber: 'INV-001',
            billTo: {
                name: 'Test Client',
                email: 'client@example.com',
                address: '123 Test St'
            },
            items: [
                {
                    description: 'Web Development',
                    quantity: 1,
                    rate: 1000
                }
            ]
        };

        const pdfBuffer = await PDFGenerator.generateFromData(invoiceData, 'invoice');
        
        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    test('should handle custom PDF creation', async () => {
        const customContent = (doc) => {
            doc.fontSize(16).text('Custom PDF Content', 100, 100);
        };

        const pdfBuffer = await PDFGenerator.createCustomPDF(customContent);
        
        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(0);
    });
});

describe('Email Service', () => {
    test('should format form data correctly', () => {
        const formData = {
            user_name: 'John Doe',
            email_address: 'john@example.com',
            phone_number: '123-456-7890'
        };

        const formatted = EmailService.formatFormData(formData);
        
        expect(formatted).toContain('User Name');
        expect(formatted).toContain('Email Address');
        expect(formatted).toContain('Phone Number');
        expect(formatted).toContain('John Doe');
    });

    test('should format file size correctly', () => {
        expect(EmailService.formatFileSize(0)).toBe('0 Bytes');
        expect(EmailService.formatFileSize(1024)).toBe('1 KB');
        expect(EmailService.formatFileSize(1048576)).toBe('1 MB');
        expect(EmailService.formatFileSize(1073741824)).toBe('1 GB');
    });

    test('should generate confirmation email HTML', () => {
        const submission = {
            submissionId: 'TEST-123',
            status: 'submitted',
            createdAt: new Date(),
            formData: {
                name: 'John Doe',
                email: 'john@example.com'
            },
            attachments: [
                {
                    originalName: 'test.pdf',
                    size: 1024
                }
            ]
        };

        const html = EmailService.generateConfirmationEmail(submission);
        
        expect(html).toContain('TEST-123');
        expect(html).toContain('John Doe');
        expect(html).toContain('test.pdf');
        expect(html).toContain('1 KB');
    });
});