const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');

// Create Redis client (optional, falls back to memory if Redis not available)
let redisClient = null;
let useRedis = false;

try {
    if (process.env.REDIS_HOST || process.env.NODE_ENV === 'production') {
        const Redis = require('redis');
        redisClient = Redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD
        });
        useRedis = true;
        console.log('📡 Using Redis for rate limiting');
    } else {
        console.log('💾 Using memory-based rate limiting');
    }
} catch (error) {
    console.warn('⚠️ Redis not available, using memory-based rate limiting');
    useRedis = false;
}

// Rate limiter configuration
const createRateLimiter = (config) => {
    if (useRedis && redisClient) {
        return new RateLimiterRedis({
            storeClient: redisClient,
            ...config
        });
    } else {
        return new RateLimiterMemory(config);
    }
};

const rateLimiter = createRateLimiter({
    keyPrefix: 'rl_',
    points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Number of requests
    duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900, // Per 15 minutes (900 seconds)
    blockDuration: 60, // Block for 1 minute if limit exceeded
    execEvenly: true, // Spread requests evenly across duration
});

// More strict rate limiting for sensitive endpoints
const strictRateLimiter = createRateLimiter({
    keyPrefix: 'rl_strict_',
    points: 10, // 10 requests
    duration: 900, // Per 15 minutes
    blockDuration: 300, // Block for 5 minutes
});

// Very strict rate limiting for auth endpoints
const authRateLimiter = createRateLimiter({
    keyPrefix: 'rl_auth_',
    points: 5, // 5 attempts
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes
});

/**
 * General rate limiting middleware
 */
const rateLimitMiddleware = async (req, res, next) => {
    try {
        // Use IP address as key
        const key = req.ip || req.connection.remoteAddress;
        
        await rateLimiter.consume(key);
        next();
    } catch (rateLimiterRes) {
        // Rate limit exceeded
        const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(secs));
        
        return res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${secs} seconds.`,
            retryAfter: secs
        });
    }
};

/**
 * Strict rate limiting for sensitive endpoints
 */
const strictRateLimitMiddleware = async (req, res, next) => {
    try {
        const key = req.ip || req.connection.remoteAddress;
        
        await strictRateLimiter.consume(key);
        next();
    } catch (rateLimiterRes) {
        const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(secs));
        
        return res.status(429).json({
            error: 'Rate Limit Exceeded',
            message: `Too many requests to sensitive endpoint. Try again in ${secs} seconds.`,
            retryAfter: secs
        });
    }
};

/**
 * Auth rate limiting middleware
 */
const authRateLimitMiddleware = async (req, res, next) => {
    try {
        const key = req.ip || req.connection.remoteAddress;
        
        await authRateLimiter.consume(key);
        next();
    } catch (rateLimiterRes) {
        const mins = Math.round(rateLimiterRes.msBeforeNext / 60000) || 1;
        res.set('Retry-After', String(rateLimiterRes.msBeforeNext / 1000));
        
        return res.status(429).json({
            error: 'Authentication Rate Limit Exceeded',
            message: `Too many authentication attempts. Try again in ${mins} minutes.`,
            retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000)
        });
    }
};

/**
 * API key rate limiting (higher limits for authenticated requests)
 */
const apiKeyRateLimitMiddleware = async (req, res, next) => {
    try {
        // Use API key if available, otherwise fall back to IP
        const key = req.headers['x-api-key'] || req.ip || req.connection.remoteAddress;
        
        // Higher limits for API key users
        const apiRateLimiter = createRateLimiter({
            keyPrefix: 'rl_api_',
            points: req.headers['x-api-key'] ? 1000 : 100, // 1000 for API keys, 100 for IP
            duration: 900, // 15 minutes
            blockDuration: 60, // 1 minute block
        });
        
        await apiRateLimiter.consume(key);
        next();
    } catch (rateLimiterRes) {
        const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(secs));
        
        return res.status(429).json({
            error: 'API Rate Limit Exceeded',
            message: `API rate limit exceeded. Try again in ${secs} seconds.`,
            retryAfter: secs,
            hint: 'Consider using an API key for higher rate limits'
        });
    }
};

/**
 * Progressive rate limiting based on endpoint
 */
const getEndpointRateLimiter = (endpoint) => {
    const endpointLimits = {
        '/api/ai/analyze': { points: 20, duration: 900 }, // AI analysis is expensive
        '/api/ai/generate-app': { points: 10, duration: 900 }, // App generation is very expensive
        '/api/pdf/generate': { points: 50, duration: 900 }, // PDF generation
        '/api/email/send': { points: 30, duration: 900 }, // Email sending
        '/api/sheets/import': { points: 25, duration: 900 }, // File processing
        '/api/forms/analyze': { points: 30, duration: 900 }, // Form analysis
    };

    const limits = endpointLimits[endpoint] || { points: 100, duration: 900 };
    
    return createRateLimiter({
        keyPrefix: `rl_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}_`,
        points: limits.points,
        duration: limits.duration,
        blockDuration: 60,
    });
};

/**
 * Endpoint-specific rate limiting middleware
 */
const endpointRateLimitMiddleware = (endpoint) => {
    const limiter = getEndpointRateLimiter(endpoint);
    
    return async (req, res, next) => {
        try {
            const key = req.ip || req.connection.remoteAddress;
            await limiter.consume(key);
            next();
        } catch (rateLimiterRes) {
            const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
            res.set('Retry-After', String(secs));
            
            return res.status(429).json({
                error: 'Endpoint Rate Limit Exceeded',
                message: `Rate limit exceeded for ${endpoint}. Try again in ${secs} seconds.`,
                endpoint,
                retryAfter: secs
            });
        }
    };
};

/**
 * Skip rate limiting for certain conditions
 */
const skipRateLimit = (req) => {
    // Skip for localhost in development
    if (process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1') {
        return true;
    }
    
    // Skip for health checks
    if (req.path === '/health' || req.path === '/status') {
        return true;
    }
    
    // Skip for trusted IPs (if configured)
    const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
    if (trustedIPs.includes(req.ip)) {
        return true;
    }
    
    return false;
};

/**
 * Conditional rate limiting middleware
 */
const conditionalRateLimitMiddleware = (middleware) => {
    return (req, res, next) => {
        if (skipRateLimit(req)) {
            return next();
        }
        return middleware(req, res, next);
    };
};

/**
 * Rate limit info middleware (adds headers about current limits)
 */
const rateLimitInfoMiddleware = async (req, res, next) => {
    try {
        const key = req.ip || req.connection.remoteAddress;
        const limiter = rateLimiter;
        
        // Get current rate limit status without consuming a point
        const resRateLimiter = await limiter.get(key);
        
        if (resRateLimiter) {
            res.set({
                'X-RateLimit-Limit': limiter.points,
                'X-RateLimit-Remaining': resRateLimiter.remainingPoints || 0,
                'X-RateLimit-Reset': Math.round(resRateLimiter.msBeforeNext / 1000) || 0,
            });
        } else {
            res.set({
                'X-RateLimit-Limit': limiter.points,
                'X-RateLimit-Remaining': limiter.points,
                'X-RateLimit-Reset': 0,
            });
        }
        
        next();
    } catch (error) {
        // Don't block request if rate limit info fails
        next();
    }
};

module.exports = {
    rateLimitMiddleware: conditionalRateLimitMiddleware(rateLimitMiddleware),
    strictRateLimitMiddleware: conditionalRateLimitMiddleware(strictRateLimitMiddleware),
    authRateLimitMiddleware: conditionalRateLimitMiddleware(authRateLimitMiddleware),
    apiKeyRateLimitMiddleware: conditionalRateLimitMiddleware(apiKeyRateLimitMiddleware),
    endpointRateLimitMiddleware,
    rateLimitInfoMiddleware,
    
    // Direct access to limiters for testing
    rateLimiter,
    strictRateLimiter,
    authRateLimiter
};