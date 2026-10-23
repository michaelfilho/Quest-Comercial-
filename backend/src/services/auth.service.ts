import crypto from 'crypto';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import {
  generateSecureToken,
  hashPassword,
  hashTokenSha256,
  verifyPassword,
} from '../config/security.js';
import { AppError } from '../middlewares/error.middleware.js';
import { recordAuditLog } from '../middlewares/auth.middleware.js';
import { logger } from '../config/logger.js';

export const authService = {
  async login(params: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const user = await db.queryOne<{
      id: string;
      name: string;
      email: string;
      password_hash: string | null;
      role: 'GESTOR' | 'VENDEDOR';
      cargo: string;
      active: boolean;
    }>(
      `SELECT id, name, email, password_hash, role, cargo, active
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [params.email]
    );

    if (!user) {
      throw new AppError('Credenciais inválidas.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.active) {
      throw new AppError(
        'Esta conta está desativada. Entre em contato com a gestão comercial.',
        403,
        'ACCOUNT_DISABLED'
      );
    }

    if (!user.password_hash) {
      throw new AppError(
        'Conta pendente de ativação de senha. Utilize a opção "Esqueci minha senha / Primeiro acesso" para definir sua senha segura.',
        403,
        'ACCOUNT_NEEDS_ACTIVATION'
      );
    }

    const valid = await verifyPassword(params.password, user.password_hash);
    if (!valid) {
      throw new AppError('Credenciais inválidas.', 401, 'INVALID_CREDENTIALS');
    }

    const rawSessionToken = generateSecureToken(32);
    const tokenHash = hashTokenSha256(rawSessionToken);
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600 * 1000);
    const sessionId = crypto.randomUUID();

    await db.query(
      `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [
        sessionId,
        user.id,
        tokenHash,
        params.ipAddress || null,
        params.userAgent || null,
        expiresAt.toISOString(),
      ]
    );

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'LOGIN',
      entidade: 'sessions',
      entidadeId: sessionId,
      detalhes: `Login efetuado por ${user.email}`,
      ipAddress: params.ipAddress,
    });

    return {
      sessionToken: rawSessionToken,
      expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        cargo: user.cargo,
        active: user.active,
      },
    };
  },

  async logout(sessionId?: string, userId?: string, ipAddress?: string) {
    if (sessionId) {
      await db.query(
        `UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [sessionId]
      );
    }
    if (userId) {
      await recordAuditLog({
        usuarioId: userId,
        acao: 'LOGOUT',
        entidade: 'sessions',
        entidadeId: sessionId || null,
        ipAddress,
      });
    }
  },

  async requestPasswordResetOrActivation(email: string, ipAddress?: string) {
    const user = await db.queryOne<{
      id: string;
      name: string;
      email: string;
      password_hash: string | null;
      active: boolean;
    }>(
      `SELECT id, name, email, password_hash, active
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    // Não vazar existência de e-mail para contas inexistentes, mas gerar token se existir e estiver ativo
    if (!user || !user.active) {
      return {
        message:
          'Se o e-mail informado pertencer a uma conta ativa da Quest, as instruções de definição/recuperação de senha foram geradas.',
        resetTokenForSetup: null,
      };
    }

    const rawToken = generateSecureToken(24);
    const tokenHash = hashTokenSha256(rawToken);
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
    const purpose = user.password_hash ? 'PASSWORD_RESET' : 'ACCOUNT_ACTIVATION';

    // Invalida tokens anteriores não usados do mesmo usuário
    await db.query(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );

    await db.query(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, purpose, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [crypto.randomUUID(), user.id, tokenHash, purpose, expiresAt.toISOString()]
    );

    await recordAuditLog({
      usuarioId: user.id,
      acao: purpose,
      entidade: 'password_reset_tokens',
      detalhes: `Solicitação de ${purpose} para ${user.email}`,
      ipAddress,
    });

    logger.info(
      { email: user.email, purpose, expiresAt: expiresAt.toISOString() },
      'Token de ativação/recuperação de senha gerado.'
    );

    // Se SMTP não estiver configurado, retorna o token de uso único para permitir ativação segura imediata das contas iniciais
    const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
    return {
      message:
        'Token seguro de definição/recuperação de senha gerado com validade de 60 minutos.',
      purpose,
      expiresAt: expiresAt.toISOString(),
      resetTokenForSetup: !smtpConfigured ? rawToken : null,
    };
  },

  async resetPasswordWithToken(rawToken: string, newPassword: string, ipAddress?: string) {
    const tokenHash = hashTokenSha256(rawToken);

    const tokenRow = await db.queryOne<{
      id: string;
      user_id: string;
      purpose: string;
      expires_at: string;
      used_at: string | null;
      email: string;
      active: boolean;
    }>(
      `SELECT prt.id, prt.user_id, prt.purpose, prt.expires_at, prt.used_at, u.email, u.active
       FROM password_reset_tokens prt
       INNER JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1`,
      [tokenHash]
    );

    if (!tokenRow) {
      throw new AppError('Token de redefinição/ativação inválido.', 400, 'INVALID_RESET_TOKEN');
    }

    if (tokenRow.used_at) {
      throw new AppError('Este token já foi utilizado.', 400, 'RESET_TOKEN_ALREADY_USED');
    }

    if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      throw new AppError('Este token expirou. Solicite um novo token.', 400, 'RESET_TOKEN_EXPIRED');
    }

    if (!tokenRow.active) {
      throw new AppError('Conta desativada.', 403, 'ACCOUNT_DISABLED');
    }

    const passwordHash = await hashPassword(newPassword);

    await db.withTransaction(async (tx) => {
      await tx.query(
        `UPDATE users
         SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [passwordHash, tokenRow.user_id]
      );

      await tx.query(
        `UPDATE password_reset_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [tokenRow.id]
      );

      // Revoga sessões anteriores por segurança
      await tx.query(
        `UPDATE sessions
         SET revoked_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [tokenRow.user_id]
      );
    });

    await recordAuditLog({
      usuarioId: tokenRow.user_id,
      acao: 'PASSWORD_DEFINED',
      entidade: 'users',
      entidadeId: tokenRow.user_id,
      detalhes: `Senha definida/redefinida via token (${tokenRow.purpose})`,
      ipAddress,
    });

    return {
      message: 'Senha definida com sucesso! Você já pode acessar o Playbook de Vendas Quest.',
      email: tokenRow.email,
    };
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string
  ) {
    const user = await db.queryOne<{ id: string; password_hash: string | null }>(
      `SELECT id, password_hash FROM users WHERE id = $1`,
      [userId]
    );

    if (!user || !user.password_hash) {
      throw new AppError('Usuário não encontrado.', 404, 'USER_NOT_FOUND');
    }

    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      throw new AppError('A senha atual informada está incorreta.', 400, 'INVALID_CURRENT_PASSWORD');
    }

    const newHash = await hashPassword(newPassword);
    await db.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newHash, userId]
    );

    await recordAuditLog({
      usuarioId: userId,
      acao: 'PASSWORD_CHANGED',
      entidade: 'users',
      entidadeId: userId,
      detalhes: 'Alteração de senha realizada pelo próprio usuário.',
      ipAddress,
    });

    return { message: 'Senha alterada com sucesso.' };
  },

  async listInitialAccountsStatus() {
    const { rows } = await db.query<{
      id: string;
      name: string;
      email: string;
      role: 'GESTOR' | 'VENDEDOR';
      cargo: string;
      active: boolean;
      activated: boolean;
    }>(
      `SELECT
         id,
         name,
         email,
         role,
         cargo,
         active,
         (password_hash IS NOT NULL) AS activated
       FROM users
       WHERE active = true
       ORDER BY CASE WHEN role = 'GESTOR' THEN 0 ELSE 1 END, name ASC`
    );
    return rows;
  },
};

