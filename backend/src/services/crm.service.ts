import crypto from 'crypto';
import { db } from '../config/database.js';
import { AuthenticatedUser, recordAuditLog } from '../middlewares/auth.middleware.js';
import { AppError } from '../middlewares/error.middleware.js';

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const crmService = {
  async listStages() {
    const { rows } = await db.query<{
      id: string;
      nome: string;
      slug: string;
      ordem: number;
      probabilidade_padrao: number;
      cor: string;
    }>(`SELECT id, nome, slug, ordem, probabilidade_padrao, cor FROM stages ORDER BY ordem ASC`);
    return rows;
  },

  async listClientes(user: AuthenticatedUser, filters?: { search?: string; responsavelId?: string }) {
    const params: any[] = [];
    const where: string[] = [];

    if (user.role === 'VENDEDOR') {
      params.push(user.id);
      where.push(`c.responsavel_id = $${params.length}`);
    } else if (filters?.responsavelId) {
      params.push(filters.responsavelId);
      where.push(`c.responsavel_id = $${params.length}`);
    }

    if (filters?.search) {
      params.push(`%${filters.search.trim()}%`);
      where.push(`(c.nome ILIKE $${params.length} OR c.empresa ILIKE $${params.length})`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT
         c.*,
         u.name AS responsavel_nome,
         (SELECT COUNT(*)::int FROM negociacoes n WHERE n.cliente_id = c.id) AS total_negociacoes
       FROM clientes c
       INNER JOIN users u ON u.id = c.responsavel_id
       ${whereClause}
       ORDER BY c.created_at DESC`,
      params
    );

    return rows;
  },

  async createCliente(user: AuthenticatedUser, data: any, ipAddress?: string) {
    const responsavelId =
      user.role === 'GESTOR' && data.responsavel_id ? data.responsavel_id : user.id;

    const id = crypto.randomUUID();
    const firstContactAt = data.first_contact_at ? new Date(data.first_contact_at).toISOString() : null;

    await db.query(
      `INSERT INTO clientes
        (id, nome, empresa, segmento, contato, email, telefone, status, origem, responsavel_id, observacoes, first_contact_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        id,
        data.nome,
        data.empresa,
        data.segmento || null,
        data.contato || null,
        data.email || null,
        data.telefone || null,
        data.status || 'ATIVO',
        data.origem || 'INBOUND',
        responsavelId,
        data.observacoes || null,
        firstContactAt,
      ]
    );

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'CLIENTE_CRIADO',
      entidade: 'clientes',
      entidadeId: id,
      detalhes: `Cliente ${data.empresa} (${data.nome}) cadastrado.`,
      ipAddress,
    });

    return db.queryOne(`SELECT * FROM clientes WHERE id = $1`, [id]);
  },

  async updateCliente(user: AuthenticatedUser, id: string, data: any, ipAddress?: string) {
    const existing = await db.queryOne<{ id: string; responsavel_id: string; empresa: string }>(
      `SELECT id, responsavel_id, empresa FROM clientes WHERE id = $1`,
      [id]
    );

    if (!existing) {
      throw new AppError('Cliente não encontrado.', 404, 'CLIENTE_NOT_FOUND');
    }

    if (user.role === 'VENDEDOR' && existing.responsavel_id !== user.id) {
      throw new AppError(
        'Acesso negado. Você só pode editar clientes sob sua responsabilidade.',
        403,
        'FORBIDDEN'
      );
    }

    const responsavelId =
      user.role === 'GESTOR' && data.responsavel_id ? data.responsavel_id : existing.responsavel_id;

    await db.query(
      `UPDATE clientes
       SET nome = COALESCE($1, nome),
           empresa = COALESCE($2, empresa),
           segmento = $3,
           contato = $4,
           email = $5,
           telefone = $6,
           status = COALESCE($7, status),
           origem = COALESCE($8, origem),
           responsavel_id = $9,
           observacoes = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11`,
      [
        data.nome ?? null,
        data.empresa ?? null,
        data.segmento ?? null,
        data.contato ?? null,
        data.email ?? null,
        data.telefone ?? null,
        data.status ?? null,
        data.origem ?? null,
        responsavelId,
        data.observacoes ?? null,
        id,
      ]
    );

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'CLIENTE_ATUALIZADO',
      entidade: 'clientes',
      entidadeId: id,
      ipAddress,
    });

    return db.queryOne(`SELECT * FROM clientes WHERE id = $1`, [id]);
  },

  async deleteCliente(user: AuthenticatedUser, id: string, confirm: boolean, ipAddress?: string) {
    if (!confirm) {
      throw new AppError(
        'A exclusão de dados exige confirmação explícita (confirm: true).',
        400,
        'CONFIRMATION_REQUIRED'
      );
    }

    const existing = await db.queryOne<{ id: string; responsavel_id: string; empresa: string }>(
      `SELECT id, responsavel_id, empresa FROM clientes WHERE id = $1`,
      [id]
    );
    if (!existing) {
      throw new AppError('Cliente não encontrado.', 404, 'CLIENTE_NOT_FOUND');
    }
    if (user.role === 'VENDEDOR' && existing.responsavel_id !== user.id) {
      throw new AppError('Acesso negado.', 403, 'FORBIDDEN');
    }

    const dealsCount = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM negociacoes WHERE cliente_id = $1`,
      [id]
    );
    if (dealsCount && parseInt(dealsCount.count, 10) > 0) {
      throw new AppError(
        'Não é possível excluir cliente com negociações vinculadas.',
        400,
        'CLIENT_HAS_DEALS'
      );
    }

    await db.query(`DELETE FROM clientes WHERE id = $1`, [id]);
    await recordAuditLog({
      usuarioId: user.id,
      acao: 'CLIENTE_EXCLUIDO',
      entidade: 'clientes',
      entidadeId: id,
      detalhes: `Cliente ${existing.empresa} excluído.`,
      ipAddress,
    });

    return { deleted: true };
  },

  async getPipeline(
    user: AuthenticatedUser,
    filters?: { ownerId?: string; status?: string; search?: string }
  ) {
    const stages = await this.listStages();

    const params: any[] = [];
    const where: string[] = [];

    if (user.role === 'VENDEDOR') {
      params.push(user.id);
      where.push(`n.owner_id = $${params.length}`);
    } else if (filters?.ownerId) {
      params.push(filters.ownerId);
      where.push(`n.owner_id = $${params.length}`);
    }

    if (filters?.status && ['EM_ANDAMENTO', 'GANHO', 'PERDIDO'].includes(filters.status)) {
      params.push(filters.status);
      where.push(`n.status = $${params.length}::"NegociacaoStatus"`);
    }

    if (filters?.search) {
      params.push(`%${filters.search.trim()}%`);
      where.push(`(n.nome ILIKE $${params.length} OR c.empresa ILIKE $${params.length})`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const { rows: rawDeals } = await db.query(
      `SELECT
         n.*,
         c.nome AS cliente_nome,
         c.empresa AS cliente_empresa,
         c.segmento AS cliente_segmento,
         u.name AS owner_nome,
         u.cargo AS owner_cargo,
         s.nome AS etapa_nome,
         s.slug AS etapa_slug,
         s.ordem AS etapa_ordem,
         (SELECT COUNT(*)::int FROM negociacao_atividades na WHERE na.negociacao_id = n.id) AS total_atividades
       FROM negociacoes n
       INNER JOIN clientes c ON c.id = n.cliente_id
       INNER JOIN users u ON u.id = n.owner_id
       INNER JOIN stages s ON s.id = n.etapa_id
       ${whereClause}
       ORDER BY n.updated_at DESC`,
      params
    );

    const nowMs = Date.now();
    const deals = rawDeals.map((d) => {
      const stageChangedMs = new Date(d.stage_changed_at).getTime();
      const tempoSegundos = Math.max(0, Math.floor((nowMs - stageChangedMs) / 1000));
      const tempoDias = Math.floor(tempoSegundos / 86400);
      const valorNum = toNum(d.valor);
      return {
        ...d,
        valor: valorNum,
        tempo_na_etapa_segundos: tempoSegundos,
        tempo_na_etapa_dias: tempoDias,
        parado_mais_15_dias: d.status === 'EM_ANDAMENTO' && tempoDias > 15,
      };
    });

    const columns = stages.map((stage) => {
      const stageDeals = deals.filter((d) => d.etapa_id === stage.id);
      const valorTotal = stageDeals.reduce((acc, d) => acc + d.valor, 0);
      const valorPonderado = stageDeals.reduce(
        (acc, d) => acc + d.valor * (d.probabilidade / 100),
        0
      );
      return {
        ...stage,
        quantidade: stageDeals.length,
        valor_total: Number(valorTotal.toFixed(2)),
        valor_ponderado: Number(valorPonderado.toFixed(2)),
        negociacoes: stageDeals,
      };
    });

    return {
      stages,
      columns,
      negociacoes: deals,
      resumo: {
        total_negociacoes: deals.length,
        em_andamento: deals.filter((d) => d.status === 'EM_ANDAMENTO').length,
        ganhos: deals.filter((d) => d.status === 'GANHO').length,
        perdidos: deals.filter((d) => d.status === 'PERDIDO').length,
        valor_pipeline_ativo: Number(
          deals
            .filter((d) => d.status === 'EM_ANDAMENTO')
            .reduce((acc, d) => acc + d.valor, 0)
            .toFixed(2)
        ),
      },
    };
  },

  async getNegociacaoById(user: AuthenticatedUser, id: string) {
    const deal = await db.queryOne<any>(
      `SELECT
         n.*,
         c.nome AS cliente_nome,
         c.empresa AS cliente_empresa,
         c.email AS cliente_email,
         c.telefone AS cliente_telefone,
         c.segmento AS cliente_segmento,
         u.name AS owner_nome,
         u.email AS owner_email,
         u.cargo AS owner_cargo,
         s.nome AS etapa_nome,
         s.slug AS etapa_slug,
         s.ordem AS etapa_ordem
       FROM negociacoes n
       INNER JOIN clientes c ON c.id = n.cliente_id
       INNER JOIN users u ON u.id = n.owner_id
       INNER JOIN stages s ON s.id = n.etapa_id
       WHERE n.id = $1`,
      [id]
    );

    if (!deal) {
      throw new AppError('Negociação não encontrada.', 404, 'NEGOCIACAO_NOT_FOUND');
    }

    // Regra de segurança obrigatória (Seção 4): O vendedor não poderá visualizar negociações privadas de outros vendedores.
    if (user.role === 'VENDEDOR' && deal.owner_id !== user.id) {
      throw new AppError(
        'Acesso negado. Vendedores não podem visualizar negociações privadas de outros vendedores.',
        403,
        'FORBIDDEN'
      );
    }

    const { rows: atividades } = await db.query(
      `SELECT
         na.*,
         u.name AS usuario_nome
       FROM negociacao_atividades na
       INNER JOIN users u ON u.id = na.usuario_id
       WHERE na.negociacao_id = $1
       ORDER BY na.realizada_em DESC, na.created_at DESC`,
      [id]
    );

    const { rows: historico } = await db.query(
      `SELECT
         nh.*,
         u.name AS usuario_nome,
         sa.nome AS etapa_anterior_nome,
         sn.nome AS etapa_nova_nome
       FROM negociacao_historico nh
       INNER JOIN users u ON u.id = nh.usuario_id
       LEFT JOIN stages sa ON sa.id = nh.etapa_anterior_id
       LEFT JOIN stages sn ON sn.id = nh.etapa_nova_id
       WHERE nh.negociacao_id = $1
       ORDER BY nh.created_at DESC`,
      [id]
    );

    const stageChangedMs = new Date(deal.stage_changed_at).getTime();
    const tempoSegundos = Math.max(0, Math.floor((Date.now() - stageChangedMs) / 1000));

    return {
      ...deal,
      valor: toNum(deal.valor),
      tempo_na_etapa_segundos: tempoSegundos,
      tempo_na_etapa_dias: Math.floor(tempoSegundos / 86400),
      atividades,
      historico: historico.map((h) => ({
        ...h,
        valor_anterior: h.valor_anterior !== null ? toNum(h.valor_anterior) : null,
        valor_novo: h.valor_novo !== null ? toNum(h.valor_novo) : null,
      })),
    };
  },

  async createNegociacao(user: AuthenticatedUser, data: any, ipAddress?: string) {
    const cliente = await db.queryOne<{ id: string; responsavel_id: string; empresa: string }>(
      `SELECT id, responsavel_id, empresa FROM clientes WHERE id = $1`,
      [data.cliente_id]
    );

    if (!cliente) {
      throw new AppError('Cliente selecionado não encontrado.', 404, 'CLIENTE_NOT_FOUND');
    }

    if (user.role === 'VENDEDOR' && cliente.responsavel_id !== user.id) {
      throw new AppError(
        'Você só pode criar negociações para clientes sob sua responsabilidade.',
        403,
        'FORBIDDEN'
      );
    }

    const ownerId = user.role === 'GESTOR' && data.owner_id ? data.owner_id : user.id;

    let stage = data.etapa_id
      ? await db.queryOne<{ id: string; nome: string; probabilidade_padrao: number }>(
          `SELECT id, nome, probabilidade_padrao FROM stages WHERE id = $1`,
          [data.etapa_id]
        )
      : await db.queryOne<{ id: string; nome: string; probabilidade_padrao: number }>(
          `SELECT id, nome, probabilidade_padrao FROM stages ORDER BY ordem ASC LIMIT 1`
        );

    if (!stage) {
      throw new AppError('Etapa do pipeline inválida.', 400, 'INVALID_STAGE');
    }

    const dealId = crypto.randomUUID();
    const status = data.status || 'EM_ANDAMENTO';
    const closedDate =
      status === 'GANHO' || status === 'PERDIDO' ? new Date().toISOString() : null;
    const expectedCloseDate = data.expected_close_date
      ? new Date(data.expected_close_date).toISOString()
      : null;
    const probabilidade =
      status === 'GANHO'
        ? 100
        : status === 'PERDIDO'
        ? 0
        : data.probabilidade ?? stage.probabilidade_padrao;

    await db.withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO negociacoes
          (id, nome, cliente_id, owner_id, etapa_id, valor, probabilidade, status, motivo_perda,
           expected_close_date, closed_date, stage_changed_at, last_activity_at, forecast_score, produto, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::"NegociacaoStatus", $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          dealId,
          data.nome,
          data.cliente_id,
          ownerId,
          stage.id,
          data.valor,
          probabilidade,
          status,
          data.motivo_perda || null,
          expectedCloseDate,
          closedDate,
          data.forecast_score ?? null,
          data.produto || 'INBOUND_CONSULTORIA',
        ]
      );

      await tx.query(
        `INSERT INTO negociacao_historico
          (id, negociacao_id, usuario_id, etapa_anterior_id, etapa_nova_id, status_anterior, status_novo, valor_anterior, valor_novo, acao, detalhes, tempo_na_etapa_segundos, created_at)
         VALUES ($1, $2, $3, NULL, $4, NULL, $5, NULL, $6, 'CRIADO', $7, 0, CURRENT_TIMESTAMP)`,
        [
          crypto.randomUUID(),
          dealId,
          user.id,
          stage.id,
          status,
          data.valor,
          `Negociação criada na etapa "${stage.nome}" com valor R$ ${Number(data.valor).toFixed(2)}.`,
        ]
      );
    });

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'NEGOCIACAO_CRIADA',
      entidade: 'negociacoes',
      entidadeId: dealId,
      detalhes: `Negociação "${data.nome}" criada para ${cliente.empresa}.`,
      ipAddress,
    });

    return this.getNegociacaoById(user, dealId);
  },

  async updateNegociacao(user: AuthenticatedUser, id: string, data: any, ipAddress?: string) {
    const existing = await db.queryOne<any>(`SELECT * FROM negociacoes WHERE id = $1`, [id]);
    if (!existing) {
      throw new AppError('Negociação não encontrada.', 404, 'NEGOCIACAO_NOT_FOUND');
    }

    if (user.role === 'VENDEDOR' && existing.owner_id !== user.id) {
      throw new AppError('Acesso negado a esta negociação.', 403, 'FORBIDDEN');
    }

    const newEtapaId = data.etapa_id || existing.etapa_id;
    const stageChanged = newEtapaId !== existing.etapa_id;
    const newStatus = data.status || existing.status;
    const statusChanged = newStatus !== existing.status;
    const newValor = data.valor !== undefined ? Number(data.valor) : toNum(existing.valor);
    const valorChanged = Math.abs(newValor - toNum(existing.valor)) > 0.001;
    const newOwnerId =
      user.role === 'GESTOR' && data.owner_id ? data.owner_id : existing.owner_id;

    const tempoNaEtapaSegundos = Math.max(
      0,
      Math.floor((Date.now() - new Date(existing.stage_changed_at).getTime()) / 1000)
    );

    const closedDate =
      newStatus === 'GANHO' || newStatus === 'PERDIDO'
        ? existing.closed_date || new Date().toISOString()
        : null;

    const expectedCloseDate =
      data.expected_close_date !== undefined
        ? data.expected_close_date
          ? new Date(data.expected_close_date).toISOString()
          : null
        : existing.expected_close_date;

    await db.withTransaction(async (tx) => {
      await tx.query(
        `UPDATE negociacoes
         SET nome = COALESCE($1, nome),
             cliente_id = COALESCE($2, cliente_id),
             owner_id = $3,
             etapa_id = $4,
             valor = $5,
             probabilidade = COALESCE($6, probabilidade),
             status = $7::"NegociacaoStatus",
             motivo_perda = $8,
             expected_close_date = $9,
             closed_date = $10,
             stage_changed_at = CASE WHEN $11::boolean THEN CURRENT_TIMESTAMP ELSE stage_changed_at END,
             last_activity_at = CURRENT_TIMESTAMP,
             forecast_score = $12,
             produto = COALESCE($13, produto),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $14`,
        [
          data.nome ?? null,
          data.cliente_id ?? null,
          newOwnerId,
          newEtapaId,
          newValor,
          data.probabilidade ?? null,
          newStatus,
          data.motivo_perda !== undefined ? data.motivo_perda : existing.motivo_perda,
          expectedCloseDate,
          closedDate,
          stageChanged,
          data.forecast_score !== undefined ? data.forecast_score : existing.forecast_score,
          data.produto ?? null,
          id,
        ]
      );

      if (stageChanged || statusChanged || valorChanged) {
        const acao = stageChanged
          ? 'ETAPA_ALTERADA'
          : statusChanged
          ? 'STATUS_ALTERADO'
          : 'VALOR_ALTERADO';
        await tx.query(
          `INSERT INTO negociacao_historico
            (id, negociacao_id, usuario_id, etapa_anterior_id, etapa_nova_id, status_anterior, status_novo, valor_anterior, valor_novo, acao, detalhes, tempo_na_etapa_segundos, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)`,
          [
            crypto.randomUUID(),
            id,
            user.id,
            existing.etapa_id,
            newEtapaId,
            existing.status,
            newStatus,
            toNum(existing.valor),
            newValor,
            acao,
            `Atualização comercial registrada por ${user.name}.`,
            stageChanged ? tempoNaEtapaSegundos : null,
          ]
        );
      }
    });

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'NEGOCIACAO_ATUALIZADA',
      entidade: 'negociacoes',
      entidadeId: id,
      ipAddress,
    });

    return this.getNegociacaoById(user, id);
  },

  async moveStage(
    user: AuthenticatedUser,
    id: string,
    params: { etapa_id: string; probabilidade?: number; detalhes?: string | null },
    ipAddress?: string
  ) {
    const existing = await db.queryOne<any>(`SELECT * FROM negociacoes WHERE id = $1`, [id]);
    if (!existing) {
      throw new AppError('Negociação não encontrada.', 404, 'NEGOCIACAO_NOT_FOUND');
    }

    if (user.role === 'VENDEDOR' && existing.owner_id !== user.id) {
      throw new AppError('Acesso negado a esta negociação.', 403, 'FORBIDDEN');
    }

    const targetStage = await db.queryOne<{
      id: string;
      nome: string;
      probabilidade_padrao: number;
    }>(`SELECT id, nome, probabilidade_padrao FROM stages WHERE id = $1`, [params.etapa_id]);

    if (!targetStage) {
      throw new AppError('Etapa de destino não encontrada.', 404, 'STAGE_NOT_FOUND');
    }

    const oldStage = await db.queryOne<{ id: string; nome: string }>(
      `SELECT id, nome FROM stages WHERE id = $1`,
      [existing.etapa_id]
    );

    const tempoNaEtapaSegundos = Math.max(
      0,
      Math.floor((Date.now() - new Date(existing.stage_changed_at).getTime()) / 1000)
    );

    const nextProbabilidade =
      params.probabilidade !== undefined
        ? params.probabilidade
        : existing.status === 'GANHO'
        ? 100
        : existing.status === 'PERDIDO'
        ? 0
        : targetStage.probabilidade_padrao;

    await db.withTransaction(async (tx) => {
      await tx.query(
        `UPDATE negociacoes
         SET etapa_id = $1,
             probabilidade = $2,
             stage_changed_at = CURRENT_TIMESTAMP,
             last_activity_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [targetStage.id, nextProbabilidade, id]
      );

      await tx.query(
        `INSERT INTO negociacao_historico
          (id, negociacao_id, usuario_id, etapa_anterior_id, etapa_nova_id, status_anterior, status_novo, valor_anterior, valor_novo, acao, detalhes, tempo_na_etapa_segundos, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $7, 'ETAPA_ALTERADA', $8, $9, CURRENT_TIMESTAMP)`,
        [
          crypto.randomUUID(),
          id,
          user.id,
          existing.etapa_id,
          targetStage.id,
          existing.status,
          toNum(existing.valor),
          params.detalhes ||
            `Card movido de "${oldStage?.nome || 'Anterior'}" para "${targetStage.nome}".`,
          tempoNaEtapaSegundos,
        ]
      );
    });

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'NEGOCIACAO_ETAPA_ALTERADA',
      entidade: 'negociacoes',
      entidadeId: id,
      detalhes: `${oldStage?.nome} -> ${targetStage.nome}`,
      ipAddress,
    });

    return this.getNegociacaoById(user, id);
  },

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    params: { status: 'EM_ANDAMENTO' | 'GANHO' | 'PERDIDO'; motivo_perda?: string | null; closed_date?: string | null },
    ipAddress?: string
  ) {
    const existing = await db.queryOne<any>(`SELECT * FROM negociacoes WHERE id = $1`, [id]);
    if (!existing) {
      throw new AppError('Negociação não encontrada.', 404, 'NEGOCIACAO_NOT_FOUND');
    }

    if (user.role === 'VENDEDOR' && existing.owner_id !== user.id) {
      throw new AppError('Acesso negado a esta negociação.', 403, 'FORBIDDEN');
    }

    const closedDate =
      params.status === 'GANHO' || params.status === 'PERDIDO'
        ? params.closed_date
          ? new Date(params.closed_date).toISOString()
          : new Date().toISOString()
        : null;

    const probabilidade =
      params.status === 'GANHO'
        ? 100
        : params.status === 'PERDIDO'
        ? 0
        : existing.probabilidade;

    await db.withTransaction(async (tx) => {
      await tx.query(
        `UPDATE negociacoes
         SET status = $1::"NegociacaoStatus",
             probabilidade = $2,
             motivo_perda = $3,
             closed_date = $4,
             last_activity_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [
          params.status,
          probabilidade,
          params.status === 'PERDIDO' ? params.motivo_perda || null : null,
          closedDate,
          id,
        ]
      );

      await tx.query(
        `INSERT INTO negociacao_historico
          (id, negociacao_id, usuario_id, etapa_anterior_id, etapa_nova_id, status_anterior, status_novo, valor_anterior, valor_novo, acao, detalhes, tempo_na_etapa_segundos, created_at)
         VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $7, 'STATUS_ALTERADO', $8, NULL, CURRENT_TIMESTAMP)`,
        [
          crypto.randomUUID(),
          id,
          user.id,
          existing.etapa_id,
          existing.status,
          params.status,
          toNum(existing.valor),
          params.status === 'GANHO'
            ? 'Negociação marcada como GANHA.'
            : params.status === 'PERDIDO'
            ? `Negociação marcada como PERDIDA.${params.motivo_perda ? ` Motivo: ${params.motivo_perda}` : ''}`
            : 'Negociação reaberta (EM_ANDAMENTO).',
        ]
      );
    });

    await recordAuditLog({
      usuarioId: user.id,
      acao: `NEGOCIACAO_${params.status}`,
      entidade: 'negociacoes',
      entidadeId: id,
      ipAddress,
    });

    return this.getNegociacaoById(user, id);
  },

  async addAtividade(user: AuthenticatedUser, negociacaoId: string, data: any, ipAddress?: string) {
    const existing = await db.queryOne<any>(
      `SELECT id, owner_id, cliente_id, etapa_id, status, valor FROM negociacoes WHERE id = $1`,
      [negociacaoId]
    );
    if (!existing) {
      throw new AppError('Negociação não encontrada.', 404, 'NEGOCIACAO_NOT_FOUND');
    }

    if (user.role === 'VENDEDOR' && existing.owner_id !== user.id) {
      throw new AppError('Acesso negado a esta negociação.', 403, 'FORBIDDEN');
    }

    const atividadeId = crypto.randomUUID();
    const realizadaEm = data.realizada_em ? new Date(data.realizada_em).toISOString() : new Date().toISOString();
    const proximaAcaoEm = data.proxima_acao_em ? new Date(data.proxima_acao_em).toISOString() : null;

    await db.withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO negociacao_atividades
          (id, negociacao_id, usuario_id, tipo, titulo, descricao, realizada_em, proxima_acao_em, concluida, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
        [
          atividadeId,
          negociacaoId,
          user.id,
          data.tipo,
          data.titulo,
          data.descricao || null,
          realizadaEm,
          proximaAcaoEm,
          data.concluida ?? true,
        ]
      );

      await tx.query(
        `UPDATE negociacoes
         SET last_activity_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [negociacaoId]
      );

      // Atualiza first_contact_at no cliente caso seja o primeiro contato registrado (Regra de Ouro 12h)
      await tx.query(
        `UPDATE clientes
         SET first_contact_at = COALESCE(first_contact_at, $1)
         WHERE id = $2`,
        [realizadaEm, existing.cliente_id]
      );

      await tx.query(
        `INSERT INTO negociacao_historico
          (id, negociacao_id, usuario_id, etapa_anterior_id, etapa_nova_id, status_anterior, status_novo, valor_anterior, valor_novo, acao, detalhes, created_at)
         VALUES ($1, $2, $3, $4, $4, $5, $5, $6, $6, 'ATIVIDADE_REGISTRADA', $7, CURRENT_TIMESTAMP)`,
        [
          crypto.randomUUID(),
          negociacaoId,
          user.id,
          existing.etapa_id,
          existing.status,
          toNum(existing.valor),
          `Atividade [${data.tipo}] registrada: ${data.titulo}`,
        ]
      );
    });

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'ATIVIDADE_REGISTRADA',
      entidade: 'negociacao_atividades',
      entidadeId: atividadeId,
      ipAddress,
    });

    return this.getNegociacaoById(user, negociacaoId);
  },

  async deleteNegociacao(user: AuthenticatedUser, id: string, confirm: boolean, ipAddress?: string) {
    if (!confirm) {
      throw new AppError(
        'A exclusão de uma negociação exige confirmação explícita (confirm: true).',
        400,
        'CONFIRMATION_REQUIRED'
      );
    }

    const existing = await db.queryOne<{ id: string; owner_id: string; nome: string }>(
      `SELECT id, owner_id, nome FROM negociacoes WHERE id = $1`,
      [id]
    );
    if (!existing) {
      throw new AppError('Negociação não encontrada.', 404, 'NEGOCIACAO_NOT_FOUND');
    }

    if (user.role === 'VENDEDOR' && existing.owner_id !== user.id) {
      throw new AppError('Acesso negado.', 403, 'FORBIDDEN');
    }

    await db.query(`DELETE FROM negociacoes WHERE id = $1`, [id]);

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'NEGOCIACAO_EXCLUIDA',
      entidade: 'negociacoes',
      entidadeId: id,
      detalhes: `Negociação "${existing.nome}" excluída.`,
      ipAddress,
    });

    return { deleted: true };
  },
};

