/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Default error
    let error = {
        message: err.message || 'Internal Server Error',
        status: err.status || err.statusCode || 500
    };

    // Handle specific error types
    if (err.name === 'ValidationError') {
        error = handleValidationError(err);
    } else if (err.name === 'CastError') {
        error = handleCastError(err);
    } else if (err.code === 11000) {
        error = handleDuplicateError(err);
    } else if (err.name === 'JsonWebTokenError') {
        error = handleJWTError(err);
    } else if (err.name === 'TokenExpiredError') {
        error = handleTokenExpiredError(err);
    } else if (err.name === 'MulterError') {
        error = handleMulterError(err);
    } else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        error = handleMongoError(err);
    } else if (err.type === 'entity.parse.failed') {
        error = handleSyntaxError(err);
    } else if (err.code === 'ENOENT') {
        error = handleFileNotFoundError(err);
    } else if (err.code === 'ECONNREFUSED') {
        error = handleConnectionError(err);
    }

    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production' && error.status === 500) {
        error.message = 'Something went wrong!';
        delete error.stack;
    }

    // Log critical errors
    if (error.status >= 500) {
        console.error('🚨 Critical Error:', {
            error: err,
            request: {
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: req.body,
                params: req.params,
                query: req.query
            }
        });
    }

    res.status(error.status).json({
        success: false,
        error: {
            message: error.message,
            ...(process.env.NODE_ENV === 'development' && { 
                stack: err.stack,
                details: err 
            })
        }
    });
};

/**
 * Handle Mongoose validation error
 */
const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map(val => ({
        field: val.path,
        message: val.message,
        value: val.value
    }));

    return {
        message: 'Validation Error',
        status: 400,
        errors
    };
};

/**
 * Handle Mongoose cast error
 */
const handleCastError = (err) => {
    return {
        message: `Invalid ${err.path}: ${err.value}`,
        status: 400
    };
};

/**
 * Handle Mongoose duplicate key error
 */
const handleDuplicateError = (err) => {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    return {
        message: `Duplicate field value: ${field} = ${value}. Please use another value.`,
        status: 400
    };
};

/**
 * Handle JWT errors
 */
const handleJWTError = (err) => {
    return {
        message: 'Invalid token. Please log in again.',
        status: 401
    };
};

/**
 * Handle JWT expired error
 */
const handleTokenExpiredError = (err) => {
    return {
        message: 'Your token has expired. Please log in again.',
        status: 401
    };
};

/**
 * Handle Multer file upload errors
 */
const handleMulterError = (err) => {
    let message = 'File upload error';
    
    switch (err.code) {
        case 'LIMIT_FILE_SIZE':
            message = 'File too large. Maximum size is 10MB.';
            break;
        case 'LIMIT_FILE_COUNT':
            message = 'Too many files. Maximum is 5 files.';
            break;
        case 'LIMIT_UNEXPECTED_FILE':
            message = 'Unexpected field name in file upload.';
            break;
        case 'LIMIT_FIELD_KEY':
            message = 'Field name too long.';
            break;
        case 'LIMIT_FIELD_VALUE':
            message = 'Field value too long.';
            break;
        case 'LIMIT_FIELD_COUNT':
            message = 'Too many fields.';
            break;
        case 'LIMIT_PART_COUNT':
            message = 'Too many parts in multipart data.';
            break;
        default:
            message = err.message;
    }
    
    return {
        message,
        status: 400
    };
};

/**
 * Handle MongoDB errors
 */
const handleMongoError = (err) => {
    let message = 'Database error';
    let status = 500;
    
    switch (err.code) {
        case 11000:
            message = 'Duplicate field value entered';
            status = 400;
            break;
        case 11001:
            message = 'Duplicate key error';
            status = 400;
            break;
        case 12582:
            message = 'Request timed out';
            status = 408;
            break;
        case 13:
            message = 'Unauthorized database operation';
            status = 403;
            break;
        default:
            message = 'Database operation failed';
    }
    
    return {
        message,
        status
    };
};

/**
 * Handle JSON syntax errors
 */
const handleSyntaxError = (err) => {
    return {
        message: 'Invalid JSON in request body',
        status: 400
    };
};

/**
 * Handle file not found errors
 */
const handleFileNotFoundError = (err) => {
    return {
        message: 'Requested file not found',
        status: 404
    };
};

/**
 * Handle connection errors
 */
const handleConnectionError = (err) => {
    return {
        message: 'Service temporarily unavailable',
        status: 503
    };
};

/**
 * Handle 404 errors (not found)
 */
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.status = 404;
    next(error);
};

/**
 * Async error wrapper to catch async errors
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Create custom error
 */
const createError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.status = statusCode;
    error.statusCode = statusCode;
    return error;
};

/**
 * HTTP status code constants
 */
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
};

module.exports = {
    errorHandler,
    notFound,
    asyncHandler,
    createError,
    HTTP_STATUS
};