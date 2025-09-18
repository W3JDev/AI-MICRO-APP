const request = require('supertest');
const path = require('path');

// We'll create a minimal app for testing since the main class is complex
function createTestApp() {
    const express = require('express');
    const app = express();
    
    // Import routes directly
    const authRoutes = require('../routes/auth');
    const sheetRoutes = require('../routes/sheets');
    const formRoutes = require('../routes/forms');
    const workflowRoutes = require('../routes/workflow');
    const appRoutes = require('../routes/apps');
    const pdfRoutes = require('../routes/pdf');
    const submissionRoutes = require('../routes/submissions');
    
    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static('public'));
    
    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/sheets', sheetRoutes);
    app.use('/api/forms', formRoutes);
    app.use('/api/workflow', workflowRoutes);
    app.use('/api/apps', appRoutes);
    app.use('/api/pdf', pdfRoutes);
    app.use('/api/submissions', submissionRoutes);
    
    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    });
    
    // 404 handler
    app.use('*', (req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });
    
    return app;
}

describe('AI Micro App Builder API', () => {
    let app;
    let server;

    beforeAll(async () => {
        // Create app instance
        app = createTestApp();
        
        // Start server on a test port
        server = app.listen(0); // Use port 0 for random available port
    });

    afterAll(async () => {
        if (server) {
            server.close();
        }
    });

    describe('Health Check', () => {
        test('GET /health should return healthy status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toEqual({
                status: 'healthy',
                timestamp: expect.any(String),
                version: '1.0.0'
            });
        });
    });

    describe('Static Files', () => {
        test('GET / should serve HTML homepage', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.headers['content-type']).toMatch(/text\/html/);
            expect(response.text).toContain('AI Micro App Builder');
        });
    });

    describe('Sheets API', () => {
        test('GET /api/sheets/templates should return template list', async () => {
            const response = await request(app)
                .get('/api/sheets/templates')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        test('POST /api/sheets/upload without file should return error', async () => {
            const response = await request(app)
                .post('/api/sheets/upload')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('No file uploaded');
        });
    });

    describe('Forms API', () => {
        test('GET /api/forms/templates should return form templates', async () => {
            const response = await request(app)
                .get('/api/forms/templates')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });
    });

    describe('AI API', () => {
        test('POST /api/ai/analyze should handle missing data', async () => {
            const response = await request(app)
                .post('/api/ai/analyze')
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('POST /api/ai/generate-app should handle missing analysis', async () => {
            const response = await request(app)
                .post('/api/ai/generate-app')
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Workflow API', () => {
        test('GET /api/workflow/templates should return workflow templates', async () => {
            const response = await request(app)
                .get('/api/workflow/templates')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });
    });

    describe('PDF API', () => {
        test('POST /api/pdf/generate should handle basic PDF generation', async () => {
            const testData = {
                data: {
                    title: 'Test Document',
                    content: 'This is a test document'
                },
                template: 'submission'
            };

            const response = await request(app)
                .post('/api/pdf/generate')
                .send(testData)
                .expect(200);

            expect(response.headers['content-type']).toBe('application/pdf');
        });
    });

    describe('Submissions API', () => {
        test('POST /api/submissions should create submission', async () => {
            const testSubmission = {
                formData: {
                    name: 'Test User',
                    email: 'test@example.com',
                    message: 'This is a test submission'
                },
                source: 'manual',
                submitter_name: 'Test User',
                submitter_email: 'test@example.com'
            };

            const response = await request(app)
                .post('/api/submissions')
                .send(testSubmission)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.submissionId).toBeDefined();
            expect(response.body.data.status).toBe('submitted');
        });

        test('GET /api/submissions should return submissions list', async () => {
            const response = await request(app)
                .get('/api/submissions')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.submissions).toBeInstanceOf(Array);
            expect(response.body.data.pagination).toBeDefined();
        });

        test('GET /api/submissions/stats/overview should return statistics', async () => {
            const response = await request(app)
                .get('/api/submissions/stats/overview')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.totalSubmissions).toBeDefined();
        });
    });

    describe('Rate Limiting', () => {
        test('Should not block normal requests', async () => {
            // Make a few requests to ensure rate limiting doesn't block normal usage
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .get('/health')
                    .expect(200);
            }
        });
    });

    describe('Error Handling', () => {
        test('Should handle 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/non-existent-route')
                .expect(404);

            expect(response.body.error).toContain('Not Found');
        });
    });
});