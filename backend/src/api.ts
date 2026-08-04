import { Router } from 'express';

import appsRoutes from './routes/app/apps/index';
import authRoutes from './routes/auth';
import healthRoutes from './routes/health';

const api = Router();

api.use(healthRoutes);
api.use(authRoutes);
api.use(appsRoutes);

export default api;
