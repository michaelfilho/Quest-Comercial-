import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

export const app = express();

// Necessário para execução atrás de Reverse Proxy (Nginx / Traefik / Coolify na VPS questos.com.br)
app.set('trust proxy', 1);

function resolveAllowedOrigins(): Set<string> {
  const allowed = new Set<string>([
    'https://questos.com.br',
    'https://www.questos.com.br',
  ]);
  try {
    const parsed = new URL(env.FRONTEND_URL);
    allowed.add(parsed.origin);
  } catch {
    allowed.add(env.FRONTEND_URL);
  }
  return allowed;
}

const allowedOrigins = resolveAllowedOrigins();

// 🔒 SEGURANÇA [Lei 15]: Desabilita header X-Powered-By e aplica headers estritos via Helmet
app.disable('x-powered-by');
app.use(
  helmet({
    frameguard: { action: 'deny' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", ...Array.from(allowedOrigins)],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalDev =
        env.NODE_ENV !== 'production' &&
        Boolean(origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
      if (!origin || allowedOrigins.has(origin) || origin === env.FRONTEND_URL || isLocalDev) {
        callback(null, true);
      } else {
        callback(new Error('Origem não autorizada pelo CORS.'));
      }
    },
    credentials: true,
  })
);
// 🔒 SEGURANÇA [VULN-5 / Lei 3]: Limite de payload JSON reduzido para 256kb (prevenção de DoS)
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

// Suporta roteamento tanto na raiz (/api/v1) quanto sob o subpath oficial (/comercial/api/v1)
app.use(env.API_PREFIX, apiRouter);
const normalizedBasePath = env.BASE_PATH.replace(/\/+$/, '');
if (normalizedBasePath && !env.API_PREFIX.startsWith(normalizedBasePath)) {
  app.use(`${normalizedBasePath}${env.API_PREFIX}`, apiRouter);
}

app.use((_req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Endpoint não encontrado na API do Playbook de Vendas Quest.',
  });
});

app.use(errorHandler);
