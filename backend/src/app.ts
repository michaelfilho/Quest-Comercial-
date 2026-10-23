import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin === env.FRONTEND_URL ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Origem não autorizada pelo CORS.'));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use(env.API_PREFIX, apiRouter);

app.use((_req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Endpoint não encontrado na API do Playbook de Vendas Quest.',
  });
});

app.use(errorHandler);

