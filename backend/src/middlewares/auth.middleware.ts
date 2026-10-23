import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { hashTokenSha256 } from '../config/security.js';
import { AppError } from './error.middleware.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'GESTOR' | 'VENDEDOR';
  cargo: string;
  active: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let rawToken = req.cookies?.[env.SESSION_COOKIE_NAME] as string | undefined;

    if (!rawToken && req.headers.authorization?.startsWith('Bearer ')) {
      rawToken = req.headers.authorization.slice(7).trim();
    }

    if (!rawToken) {
      throw new AppError('Autenticação necessária. Faça login para continuar.', 401, 'UNAUTHORIZED');
    }

    const tokenHash = hashTokenSha256(rawToken);

    const sessionRow = await db.queryOne<{
      session_id: string;
      user_id: string;
      name: string;
      email: string;
      role: 'GESTOR' | 'VENDEDOR';
      cargo: string;
      active: boolean;
      expires_at: string;
      revoked_at: string | null;
    }>(
      `SELECT
         s.id AS session_id,
         s.user_id,
         s.expires_at,
         s.revoked_at,
         u.name,
         u.email,
         u.role,
         u.cargo,
         u.active
       FROM sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > CURRENT_TIMESTAMP`,
      [tokenHash]
    );

    if (!sessionRow) {
      throw new AppError('Sessão inválida ou expirada. Faça login novamente.', 401, 'SESSION_EXPIRED');
    }

    if (!sessionRow.active) {
      throw new AppError('Sua conta está desativada. Contate o gestor comercial.', 403, 'ACCOUNT_DISABLED');
    }

    req.user = {
      id: sessionRow.user_id,
      name: sessionRow.name,
      email: sessionRow.email,
      role: sessionRow.role,
      cargo: sessionRow.cargo,
      active: sessionRow.active,
    };
    req.sessionId = sessionRow.session_id;

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: ('GESTOR' | 'VENDEDOR')[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Autenticação necessária.', 401, 'UNAUTHORIZED'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          'Acesso negado. Seu perfil não possui permissão para executar esta operação.',
          403,
          'FORBIDDEN'
        )
      );
      return;
    }

    next();
  };
}

export async function recordAuditLog(params: {
  usuarioId?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  detalhes?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, usuario_id, acao, entidade, entidade_id, detalhes, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [
        crypto.randomUUID(),
        params.usuarioId || null,
        params.acao,
        params.entidade,
        params.entidadeId || null,
        params.detalhes || null,
        params.ipAddress || null,
      ]
    );
  } catch {
    // Falha em log de auditoria secundário não deve interromper transação já comitada
  }
}

