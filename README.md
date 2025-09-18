# 🤖 AI Micro App Builder

An intelligent system that transforms Google Sheets, Excel files, and forms into fully functional micro applications with complete workflow management, digital signatures, PDF generation, and cloud integration.

## ✨ Features

### 📊 **Document Analysis & Processing**
- **Excel/CSV Analysis**: Upload and analyze spreadsheet structures to auto-generate form fields
- **Google Sheets Integration**: Connect directly to Google Sheets for real-time data processing
- **Microsoft Forms Support**: Import and analyze Microsoft Forms structures
- **Google Forms Integration**: Parse Google Forms for automatic application generation
- **AI-Powered Analysis**: Advanced AI analyzes document patterns and suggests optimal structures

### 🔄 **Workflow Automation**
- **Multi-Step Workflows**: Create complex approval processes with conditional logic
- **Digital Signatures**: Integrated electronic signature capabilities
- **Approval Flows**: Configurable multi-level approval systems
- **Email Notifications**: Automated email alerts and updates
- **PDF Generation**: Automatic document generation from form data
- **Invoice Processing**: Complete invoicing workflow with tracking

### ☁️ **Cloud Integration**
- **Google Drive**: Automatic file storage and organization
- **OneDrive**: Microsoft cloud storage integration
- **SharePoint**: Enterprise document management
- **Real-time Sync**: Bidirectional data synchronization

### 📱 **Modern Web Applications**
- **Progressive Web Apps**: Offline-capable mobile applications
- **Responsive Design**: Works perfectly on all devices
- **Real-time Validation**: Instant form validation with smart error handling
- **Auto-save**: Automatic form data preservation
- **Multi-step Forms**: Enhanced user experience with progress tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- MongoDB (optional, uses in-memory storage by default)
- Redis (optional, for enhanced rate limiting)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/W3JDev/AI-MICRO-APP.git
cd AI-MICRO-APP
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

4. **Start the application**
```bash
npm start
```

5. **Access the application**
Open http://localhost:3000 in your browser

## 📖 API Documentation

### 🔍 **Analysis Endpoints**

#### Upload & Analyze Spreadsheet
```http
POST /api/sheets/upload
Content-Type: multipart/form-data

# Upload Excel/CSV file for analysis
```

#### Analyze Form Structure
```http
POST /api/forms/analyze
Content-Type: application/json

{
  "formData": {...},  // Form structure data
  "source": "google-forms"  // Source platform
}
```

#### AI Document Analysis
```http
POST /api/ai/analyze
Content-Type: application/json

{
  "fileData": "...",  // Document data
  "fileType": "xlsx", // File type
  "requirements": {}  // Additional requirements
}
```

### 🏗️ **Generation Endpoints**

#### Generate Micro Application
```http
POST /api/ai/generate-app
Content-Type: application/json

{
  "analysis": {...},     // Analysis result
  "configuration": {     // App configuration
    "appName": "My App",
    "primaryColor": "#4CAF50",
    "features": ["validation", "pdf", "email"]
  }
}
```

#### Create Workflow
```http
POST /api/workflow/create
Content-Type: application/json

{
  "analysis": {...},        // Document analysis
  "configuration": {        // Workflow config
    "workflowType": "approval",
    "requiresApproval": true,
    "managerEmail": "manager@company.com"
  }
}
```

#### Generate PDF
```http
POST /api/pdf/generate
Content-Type: application/json

{
  "data": {...},           // Form data
  "template": "invoice",   // PDF template
  "options": {}           // PDF options
}
```

## 🛠️ Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/ai-micro-app

# Google API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Microsoft Graph API
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_TENANT_ID=your_microsoft_tenant_id

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# JWT Security
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

## 📋 Use Cases

### 1. **Digital Form Creation**
Transform paper forms into interactive web applications with:
- Real-time validation
- Progress tracking
- Auto-save functionality
- Mobile optimization

### 2. **Approval Workflows**
Create sophisticated approval processes for:
- Expense reports
- Leave requests
- Purchase orders
- Document approvals

### 3. **Document Management**
Build document processing systems with:
- File upload and validation
- Automatic organization
- Version control
- Search and indexing

### 4. **Invoice & Billing**
Generate complete invoicing systems with:
- Automated PDF generation
- Digital signature integration
- Payment tracking
- Client notifications

### 5. **Data Collection & Analysis**
Create data collection applications with:
- Survey forms
- Feedback systems
- Registration forms
- Analytics dashboards

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   AI Agent      │    │   Services      │
│   - React/HTML  │◄──►│   - Analysis    │◄──►│   - Sheets      │
│   - Progressive │    │   - Generation  │    │   - Forms       │
│   - Mobile      │    │   - Workflows   │    │   - PDF         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Workflow      │    │   Integrations  │
│   - Rate Limit  │    │   Engine        │    │   - Google API  │
│   - Auth        │    │   - Automation  │    │   - Microsoft   │
│   - Validation  │    │   - Approvals   │    │   - Cloud       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run specific tests:
```bash
npm test -- --grep "spreadsheet analysis"
```

## 📊 Examples

### Example 1: Contact Form
```javascript
// Upload a spreadsheet with columns: Name, Email, Phone, Message
// The system will generate a complete contact form with:
// - Email validation
// - Phone number formatting
// - Spam protection
// - Email notifications
// - PDF receipt generation
```

### Example 2: Expense Report
```javascript
// Create expense reporting with approval workflow:
// - Multi-step form with file uploads
// - Manager approval process
// - Automatic PDF generation
// - Email notifications
// - Integration with accounting systems
```

## 🔒 Security

- **Rate Limiting**: Configurable API rate limits
- **Input Validation**: Comprehensive input sanitization
- **File Security**: Virus scanning for uploads
- **Authentication**: JWT-based secure authentication
- **HTTPS Enforcement**: SSL/TLS encryption
- **Data Privacy**: GDPR-compliant data handling

## 🚀 Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t ai-micro-app .

# Run container
docker run -p 3000:3000 ai-micro-app
```

### Production Deployment
1. Set NODE_ENV=production
2. Configure production database
3. Set up SSL certificates
4. Configure reverse proxy (nginx)
5. Set up monitoring and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/W3JDev/AI-MICRO-APP/wiki)
- **Issues**: [GitHub Issues](https://github.com/W3JDev/AI-MICRO-APP/issues)
- **Discussions**: [GitHub Discussions](https://github.com/W3JDev/AI-MICRO-APP/discussions)

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- Google for Sheets and Forms APIs
- Microsoft for Graph API integration
- The open-source community

---

**Built with ❤️ by the W3JDev Team**