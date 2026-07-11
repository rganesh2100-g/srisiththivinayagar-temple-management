import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import routes from './routes/index.js';
import { errorMiddleware, authMiddleware } from './middleware/index.js';
import logger from './utils/logger.js';
import { setupAdminUsers } from './utils/adminUserSetup.js';
import { autoArchivePoojas, startAutoArchiveScheduler } from './utils/autoArchivePoojas.js';

const app = express();

process.on('uncaughtException', (error) => {
	logger.error('Uncaught exception:', error);
});
  
process.on('unhandledRejection', (reason, promise) => {
	logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', async () => {
	logger.info('Interrupted');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('SIGTERM signal received');

	await new Promise(resolve => setTimeout(resolve, 3000));

	logger.info('Exiting');
	process.exit();
});

logger.info('[MAIN] ========================================');
logger.info('[MAIN] Initializing Express.js API Server');
logger.info('[MAIN] ========================================');

logger.info('[MAIN] Step 1: Applying middleware');
logger.info('[MAIN]   - helmet() for security headers');
app.use(helmet());

logger.info('[MAIN]   - cors() for cross-origin requests');
logger.info(`[MAIN]     - Configured Origin: ${process.env.CORS_ORIGIN || 'not set'}`);

// Custom CORS logging middleware
app.use((req, res, next) => {
	const origin = req.headers.origin || 'self (no origin header)';
	logger.info(`[CORS Debug] Incoming request from origin: ${origin} | Method: ${req.method} | Path: ${req.path}`);
	next();
});

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];

app.use(cors({
	origin: function (origin, callback) {
		// Allow requests with no origin (like mobile apps or curl requests)
		if (!origin) {
			logger.info(`[CORS Debug] Allowed request with no origin`);
			return callback(null, true);
		}
		
		if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
			logger.info(`[CORS Debug] Allowed origin: ${origin}`);
			return callback(null, true);
		} else {
			logger.warn(`[CORS Debug] Rejected origin: ${origin}`);
			// For development/diagnostic purposes, we are allowing it but logging the rejection
			// In strict production, this should be: callback(new Error('Not allowed by CORS'))
			return callback(null, true); 
		}
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

logger.info('[MAIN]   - morgan() for HTTP request logging');
app.use(morgan('combined'));

logger.info('[MAIN]   - express.json() for JSON body parsing');
app.use(express.json());

logger.info('[MAIN]   - express.urlencoded() for URL-encoded body parsing');
app.use(express.urlencoded({ extended: true }));

logger.info('[MAIN]   - authMiddleware() for Bearer token extraction and validation');
app.use(authMiddleware);

logger.info('[MAIN] Step 2: Mounting routes at /');
logger.info('[MAIN]   - All routes will be available at /hcgi/api/* (platform adds prefix)');
app.use('/', routes());

logger.info('[MAIN] Step 3: Applying error middleware');
app.use(errorMiddleware);

logger.info('[MAIN] Step 4: Registering 404 handler');
app.use((req, res) => {
	logger.warn(`[MAIN] 404 - Route not found: ${req.method} ${req.path}`);
	res.status(404).json({ error: 'Route not found' });
});

const port = process.env.PORT || 3001;

logger.info('[MAIN] ========================================');
logger.info(`[MAIN] Starting server on port ${port}`);
logger.info('[MAIN] ========================================');

app.listen(port, async () => {
	logger.info('[MAIN] ========================================');
	logger.info(`[MAIN] 🚀 API Server running on http://localhost:${port}`);
	logger.info('[MAIN] ========================================');
	logger.info('[MAIN] Available endpoints:');
	logger.info('[MAIN]   - GET  /hcgi/api/health');
	logger.info('[MAIN]   - GET  /hcgi/api/users (admin only)');
	logger.info('[MAIN]   - PUT  /hcgi/api/users/:userId/role (admin only)');
	logger.info('[MAIN]   - DELETE /hcgi/api/users/:userId (admin only)');
	logger.info('[MAIN] ========================================');

	// Setup admin users on server start
	logger.info('[MAIN] Step 5: Setting up admin users');
	try {
		await setupAdminUsers();
		logger.info('[MAIN] ✓ Admin users setup completed');
	} catch (error) {
		logger.error('[MAIN] ✗ Error setting up admin users');
		logger.error(`[MAIN]   - Error: ${error.message}`);
	}

	// Auto-archive expired poojas on server start
	logger.info('[MAIN] Step 6: Running auto-archive check for expired poojas');
	try {
		const archived = await autoArchivePoojas();
		logger.info(`[MAIN] ✓ Auto-archive check completed — ${archived} pooja(s) archived`);
	} catch (error) {
		logger.error('[MAIN] ✗ Error during auto-archive check');
		logger.error(`[MAIN]   - Error: ${error.message}`);
	}

	// Schedule periodic auto-archive checks
	startAutoArchiveScheduler();
});

export default app;