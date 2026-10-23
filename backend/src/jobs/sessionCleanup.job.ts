import { db } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Job de manutenção de segurança: remove sessões e tokens expirados do PostgreSQL
 */
export async function runSessionAndTokenCleanupJob(): Promise<{
  expiredSessionsDeleted: number;
  expiredTokensDeleted: number;
}> {
  const sRes = await db.query(
    `DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP OR revoked_at < (CURRENT_TIMESTAMP - INTERVAL '7 days')`
  );
  const tRes = await db.query(
    `DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP`
  );
  logger.info(
    {
      expiredSessionsDeleted: sRes.rowCount,
      expiredTokensDeleted: tRes.rowCount,
    },
    'Job de limpeza de sessões e tokens expirados executado.'
  );
  return {
    expiredSessionsDeleted: sRes.rowCount,
    expiredTokensDeleted: tRes.rowCount,
  };
}

