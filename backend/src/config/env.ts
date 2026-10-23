import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });
dotenv.config({ path: path.resolve(process.cwd(), '../.env'), override: false });

export const env = {
  NODE_ENV: process.env.VITEST ? 'test' : process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  BASE_PATH: process.env.BASE_PATH || '/comercial',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://questos.com.br/comercial',
  DATABASE_URL:
    process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')
      ? process.env.DATABASE_URL
      : 'postgresql://quest_user:quest_pass@localhost:5432/playbook_quest?schema=public',
  USE_EMBEDDED_PG: process.env.USE_EMBEDDED_PG || 'auto',
  PGDATA_DIR: process.env.PGDATA_DIR || './data/pgdata',
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'quest_playbook_sid',
  SESSION_TTL_HOURS: parseInt(process.env.SESSION_TTL_HOURS || '24', 10),
  SESSION_SECRET:
    process.env.SESSION_SECRET ||
    'quest-comunicacao-total-playbook-2026-default-dev-secret-change-in-prod',
  PASSWORD_RESET_TTL_MINUTES: parseInt(process.env.PASSWORD_RESET_TTL_MINUTES || '60', 10),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  AI_MAX_TOKENS_PER_RESPONSE: parseInt(process.env.AI_MAX_TOKENS_PER_RESPONSE || '1200', 10),
  AI_DAILY_TOKEN_LIMIT_PER_USER: parseInt(process.env.AI_DAILY_TOKEN_LIMIT_PER_USER || '50000', 10),
  WEBHOOK_SHARED_SECRET:
    process.env.WEBHOOK_SHARED_SECRET || 'quest-webhook-shared-secret-2026',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'Playbook Quest <no-reply@questcomunicacao.com.br>',
};

// 🔒 SEGURANÇA [VULN-4 / Lei 11 & Lei 15]: Fail Secure em produção se segredos críticos usarem fallback ou forem curtos
if (env.NODE_ENV === 'production') {
  if (
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32 ||
    process.env.SESSION_SECRET.includes('default-dev-secret')
  ) {
    throw new Error(
      'CRITICAL SECURITY ERROR: SESSION_SECRET ausente ou inseguro em ambiente de produção.'
    );
  }
  if (
    !process.env.WEBHOOK_SHARED_SECRET ||
    process.env.WEBHOOK_SHARED_SECRET.length < 24 ||
    process.env.WEBHOOK_SHARED_SECRET === 'quest-webhook-shared-secret-2026'
  ) {
    throw new Error(
      'CRITICAL SECURITY ERROR: WEBHOOK_SHARED_SECRET ausente ou inseguro em ambiente de produção.'
    );
  }
}
