import express from 'express';
import serverless from 'serverless-http';
import { createApiRouter } from '../../apiRoutes.js';

const app = express();
app.use(express.json());
app.use(createApiRouter());

export const handler = serverless(app);
