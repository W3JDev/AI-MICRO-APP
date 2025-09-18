const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const sheetRoutes = require('./routes/sheets');
const formRoutes = require('./routes/forms');
const workflowRoutes = require('./routes/workflow');
const appRoutes = require('./routes/apps');
const pdfRoutes = require('./routes/pdf');

const aiAgent = require('./ai-agent/core');
const { rateLimitMiddleware } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

class AIWebAppBuilder {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.aiAgent = aiAgent;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupDatabase();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet());
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'production' ? 
                ['https://yourdomain.com'] : 
                ['http://localhost:3000', 'http://localhost:3001'],
            credentials: true
        }));

        // Rate limiting
        this.app.use(rateLimitMiddleware);

        // Body parsing
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        // Static files
        this.app.use(express.static(path.join(__dirname, '../public')));
    }

    setupRoutes() {
        // API Routes
        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/sheets', sheetRoutes);
        this.app.use('/api/forms', formRoutes);
        this.app.use('/api/workflow', workflowRoutes);
        this.app.use('/api/apps', appRoutes);
        this.app.use('/api/pdf', pdfRoutes);

        // AI Agent endpoint
        this.app.post('/api/ai/analyze', async (req, res) => {
            try {
                const { fileData, fileType, requirements } = req.body;
                const analysis = await this.aiAgent.analyzeDocument(fileData, fileType, requirements);
                res.json(analysis);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/ai/generate-app', async (req, res) => {
            try {
                const { analysis, configuration } = req.body;
                const microApp = await this.aiAgent.generateMicroApp(analysis, configuration);
                res.json(microApp);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                version: require('../package.json').version
            });
        });

        // Serve main application
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });
    }

    async setupDatabase() {
        try {
            if (process.env.MONGODB_URI) {
                await mongoose.connect(process.env.MONGODB_URI, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                });
                console.log('✅ Connected to MongoDB');
            } else {
                console.log('💾 Running without MongoDB - using in-memory storage');
            }
        } catch (error) {
            console.warn('⚠️ MongoDB connection failed, continuing without database:', error.message);
        }
    }

    setupErrorHandling() {
        this.app.use(errorHandler);
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            process.exit(1);
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 AI Micro App Builder server running on port ${this.port}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Access: http://localhost:${this.port}`);
        });
    }
}

// Start the application
if (require.main === module) {
    const app = new AIWebAppBuilder();
    app.start();
}

module.exports = AIWebAppBuilder;