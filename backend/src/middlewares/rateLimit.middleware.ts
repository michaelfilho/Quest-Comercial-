import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: env.NODE_ENV === 'test' ? 2000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Muitas requisições deste endereço IP. Tente novamente em alguns minutos.',
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 500 : 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Muitas tentativas de autenticação. Aguarde 15 minutos antes de tentar novamente.',
  },
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: env.NODE_ENV === 'test' ? 200 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'AI_RATE_LIMIT_EXCEEDED',
    message: 'Limite de consultas ao Assistente Comercial IA por minuto atingido. Aguarde um instante.',
  },
});

