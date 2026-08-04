import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import api from './api';
import type { AppConfig } from './config/env';
import { requestLogger } from './middlewares/request-logger';

export function createApp(config: AppConfig): Express {
  const app = express();

  if (config.nodeEnv === 'production') {
    app.use(helmet());
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          error: 'Too many requests. Please try again later.',
        },
      }),
    );
  }

  app.set('trust proxy', 'loopback');
  app.use(
    cors({
      origin: config.appUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(requestLogger);
  app.use(api);

  return app;
}
