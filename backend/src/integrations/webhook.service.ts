import crypto from 'crypto';
import { db } from '../config/database.js';
import { verifySharedSecretTimingSafe, verifyWebhookSignature } from '../config/security.js';
import { AppError } from '../middlewares/error.middleware.js';

export const webhookService = {
  async processInboundWebhook(params: {
    idempotencyKey?: string;
    signature?: string;
    secretHeader?: string;
    rawBody: string;
    payload: {
      event: string;
      source: string;
      data: Record<string, any>;
    };
  }) {
    // 🔒 SEGURANÇA [VULN-4]: Autenticação do Webhook em tempo constante (HMAC-SHA256 ou Shared Secret via timingSafeEqual)
    const isHmacValid = verifyWebhookSignature(params.rawBody, params.signature);
    const isSecretValid = verifySharedSecretTimingSafe(params.secretHeader);

    if (!isHmacValid && !isSecretValid) {
      throw new AppError(
        'Assinatura ou credencial de webhook inválida.',
        401,
        'INVALID_WEBHOOK_SIGNATURE'
      );
    }

    // 2. Idempotência
    const idempotencyKey =
      params.idempotencyKey?.trim() ||
      crypto.createHash('sha256').update(params.rawBody).digest('hex');

    const existingLog = await db.queryOne<{ id: string; status: string; created_at: string }>(
      `SELECT id, status, created_at FROM webhook_logs WHERE idempotency_key = $1`,
      [idempotencyKey]
    );

    if (existingLog) {
      return {
        idempotent_replay: true,
        log_id: existingLog.id,
        status: existingLog.status,
        message: 'Evento já processado anteriormente (idempotência garantida).',
      };
    }

    const logId = crypto.randomUUID();
    const { event, source, data } = params.payload;

    // 3. Regras de negócio permanecem no backend (Seção 3: n8n atua apenas como camada de integração)
    if (event === 'lead.created' && data.nome && data.empresa) {
      // Localiza vendedor responsável (padrão Tiago Hilário para Inbound/Radar Quest ou Gestor)
      const owner = data.responsavel_email
        ? await db.queryOne<{ id: string }>(
            `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND active = true`,
            [data.responsavel_email]
          )
        : await db.queryOne<{ id: string }>(
            `SELECT id FROM users WHERE active = true ORDER BY CASE WHEN LOWER(email) LIKE 'tiago.hilario%' THEN 0 ELSE 1 END LIMIT 1`
          );

      if (owner) {
        await db.query(
          `INSERT INTO clientes (id, nome, empresa, segmento, email, telefone, status, origem, responsavel_id, observacoes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'PROSPECT', $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            crypto.randomUUID(),
            String(data.nome),
            String(data.empresa),
            data.segmento ? String(data.segmento) : null,
            data.email ? String(data.email) : null,
            data.telefone ? String(data.telefone) : null,
            source === 'radar_quest' ? 'RADAR_QUEST' : 'INBOUND',
            owner.id,
            data.observacoes ? String(data.observacoes) : `Integrado via ${source}`,
          ]
        );
      }
    }

    await db.query(
      `INSERT INTO webhook_logs (id, idempotency_key, direcao, evento, origem, status, payload_resumo, created_at)
       VALUES ($1, $2, 'INBOUND', $3, $4, 'PROCESSED', $5, CURRENT_TIMESTAMP)`,
      [
        logId,
        idempotencyKey,
        event,
        source,
        JSON.stringify(data).slice(0, 500),
      ]
    );

    return {
      idempotent_replay: false,
      log_id: logId,
      event,
      source,
      status: 'PROCESSED',
    };
  },

  async listWebhookLogs() {
    const { rows } = await db.query(
      `SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 100`
    );
    return rows;
  },
};

