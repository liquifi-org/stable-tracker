import express, { Application } from 'express';
import router from './router/apiRouter';
import globalErrorHandler from './middleware/globalErrorHandler';
import notFoundError from './util/notFoundError';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';
import { buildV1Router } from './container';
import { requestLogger } from './middleware/requestLogger';

const app: Application = express();

// Security middleware — relax CSP for Swagger UI in non-production
app.use(
    helmet({
        contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    }),
);

// CORS middleware
app.use(
    cors({
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000', 'http://localhost:5173'],
        credentials: true,
    }),
);

// Middleware to parse JSON bodies
app.use(express.json());

// ---- Debug request/response logger ----
app.use(requestLogger);

// ---- Swagger UI (served from the OpenAPI YAML spec) ----
const swaggerYamlPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
if (fs.existsSync(swaggerYamlPath)) {
    const swaggerDocument = yaml.load(fs.readFileSync(swaggerYamlPath, 'utf8')) as Record<string, unknown>;
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// ---- Internal utility routes (/api/self, /api/health) ----
app.use('/api', router);

// ---- API v1 routes ----
app.use('/v1', buildV1Router());

// Not found route handler (404)
app.use(notFoundError.route);

// Global error handler
app.use(globalErrorHandler);

export default app;
