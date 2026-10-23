import crypto from 'crypto';
import { db } from '../config/database.js';
import { AuthenticatedUser, recordAuditLog } from '../middlewares/auth.middleware.js';
import { AppError } from '../middlewares/error.middleware.js';

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const conteudoService = {
  async getRituaisAndAlerts(user: AuthenticatedUser) {
    const { rows: rituais } = await db.query<any>(
      `SELECT * FROM rituais WHERE ativo = true ORDER BY frequencia ASC, ordem ASC`
    );

    const execParams: any[] = [];
    let execWhere = '';
    if (user.role === 'VENDEDOR') {
      execParams.push(user.id);
      execWhere = `WHERE re.responsavel_id = $1`;
    }

    const { rows: execucoes } = await db.query<any>(
      `SELECT
         re.*,
         r.nome AS ritual_nome,
         r.frequencia AS ritual_frequencia,
         u.name AS responsavel_nome,
         n.nome AS negociacao_nome
       FROM ritual_execucoes re
       INNER JOIN rituais r ON r.id = re.ritual_id
       INNER JOIN users u ON u.id = re.responsavel_id
       LEFT JOIN negociacoes n ON n.id = re.negociacao_id
       ${execWhere}
       ORDER BY re.data_execucao DESC, re.created_at DESC
       LIMIT 100`,
      execParams
    );

    // =========================================================================
    // REGRAS DETERMINÍSTICAS DE ALERTAS COMERCIAIS NO BACKEND (Seção 11)
    // =========================================================================
    const ownerParams: any[] = [];
    const ownerFilterCliente = user.role === 'VENDEDOR' ? `AND c.responsavel_id = $1` : '';
    const ownerFilterDeal = user.role === 'VENDEDOR' ? `AND n.owner_id = $1` : '';
    if (user.role === 'VENDEDOR') {
      ownerParams.push(user.id);
    }

    // 1. Regra de Ouro (Diário): Leads/Clientes criados há mais de 12 horas sem primeiro contato
    const { rows: leadsAtrasados12h } = await db.query<any>(
      `SELECT
         c.id,
         c.nome,
         c.empresa,
         c.origem,
         c.created_at,
         u.name AS responsavel_nome,
         ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.created_at)) / 3600, 1) AS horas_sem_contato
       FROM clientes c
       INNER JOIN users u ON u.id = c.responsavel_id
       WHERE c.first_contact_at IS NULL
         AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.created_at)) > (12 * 3600)
         ${ownerFilterCliente}
       ORDER BY c.created_at ASC`,
      ownerParams
    );

    // 2. WBR Semanal: Negócios EM_ANDAMENTO parados há mais de 15 dias na mesma etapa ou sem atividade
    const { rows: negociosParados15d } = await db.query<any>(
      `SELECT
         n.id,
         n.nome,
         n.valor,
         n.stage_changed_at,
         n.last_activity_at,
         c.empresa AS cliente_empresa,
         s.nome AS etapa_nome,
         u.name AS owner_nome,
         FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - LEAST(n.stage_changed_at, n.last_activity_at))) / 86400)::int AS dias_parado
       FROM negociacoes n
       INNER JOIN clientes c ON c.id = n.cliente_id
       INNER JOIN stages s ON s.id = n.etapa_id
       INNER JOIN users u ON u.id = n.owner_id
       WHERE n.status = 'EM_ANDAMENTO'
         AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - LEAST(n.stage_changed_at, n.last_activity_at))) > (15 * 86400)
         ${ownerFilterDeal}
       ORDER BY dias_parado DESC`,
      ownerParams
    );

    // 3. Mensal — Forecast Meeting & 7-Point Scorecard (Elegibilidade somente com score >= 6)
    const { rows: forecastDeals } = await db.query<any>(
      `SELECT
         n.id,
         n.nome,
         n.valor,
         n.probabilidade,
         n.forecast_score,
         n.expected_close_date,
         c.empresa AS cliente_empresa,
         s.nome AS etapa_nome,
         u.name AS owner_nome
       FROM negociacoes n
       INNER JOIN clientes c ON c.id = n.cliente_id
       INNER JOIN stages s ON s.id = n.etapa_id
       INNER JOIN users u ON u.id = n.owner_id
       WHERE n.status = 'EM_ANDAMENTO'
         ${ownerFilterDeal}
       ORDER BY COALESCE(n.forecast_score, -1) DESC, n.valor DESC`,
      ownerParams
    );

    const elegiveisForecast = forecastDeals
      .filter((d) => d.forecast_score !== null && Number(d.forecast_score) >= 6)
      .map((d) => ({ ...d, valor: toNum(d.valor), elegivel_forecast: true }));

    const naoElegiveisForecast = forecastDeals
      .filter((d) => d.forecast_score === null || Number(d.forecast_score) < 6)
      .map((d) => ({
        ...d,
        valor: toNum(d.valor),
        elegivel_forecast: false,
        motivo_inelegibilidade:
          d.forecast_score === null
            ? '7-Point Scorecard ainda não preenchido'
            : `Score atual (${d.forecast_score}/7) abaixo do mínimo exigido (6/7)`,
      }));

    const valorTotalElegivelForecast = Number(
      elegiveisForecast.reduce((acc, d) => acc + d.valor, 0).toFixed(2)
    );

    return {
      rituais,
      por_frequencia: {
        DIARIO: rituais.filter((r) => r.frequencia === 'DIARIO'),
        SEMANAL: rituais.filter((r) => r.frequencia === 'SEMANAL'),
        MENSAL: rituais.filter((r) => r.frequencia === 'MENSAL'),
        TRIMESTRAL: rituais.filter((r) => r.frequencia === 'TRIMESTRAL'),
      },
      execucoes,
      alertas_deterministicos: {
        regra_ouro_12h: {
          regra: 'Contato com lead novo em até 12 horas',
          quantidade_alertas: leadsAtrasados12h.length,
          leads_em_alerta: leadsAtrasados12h.map((l) => ({
            ...l,
            horas_sem_contato: toNum(l.horas_sem_contato),
          })),
        },
        negocios_parados_15_dias: {
          regra: 'Identificação de negócios parados há mais de 15 dias (WBR Semanal)',
          quantidade_alertas: negociosParados15d.length,
          negocios: negociosParados15d.map((n) => ({
            ...n,
            valor: toNum(n.valor),
          })),
        },
        forecast_7point_scorecard: {
          regra: 'Elegibilidade de Forecast com score mínimo de 6 no 7-Point Scorecard',
          score_minimo_exigido: 6,
          quantidade_elegiveis: elegiveisForecast.length,
          valor_total_elegivel_forecast: valorTotalElegivelForecast,
          negocios_elegiveis: elegiveisForecast,
          negocios_inelegiveis_ou_pendentes: naoElegiveisForecast,
        },
      },
    };
  },

  async createRitualExecucao(
    user: AuthenticatedUser,
    ritualId: string,
    data: any,
    ipAddress?: string
  ) {
    const ritual = await db.queryOne<{ id: string; nome: string; codigo: string }>(
      `SELECT id, nome, codigo FROM rituais WHERE id = $1`,
      [ritualId]
    );
    if (!ritual) {
      throw new AppError('Ritual comercial não encontrado.', 404, 'RITUAL_NOT_FOUND');
    }

    const execId = crypto.randomUUID();
    const dataExecucao = data.data_execucao
      ? new Date(data.data_execucao).toISOString()
      : new Date().toISOString();

    await db.withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO ritual_execucoes
          (id, ritual_id, responsavel_id, data_execucao, status, observacoes, respostas_acompanhamento, pitch_score, forecast_score, negociacao_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          execId,
          ritualId,
          user.id,
          dataExecucao,
          data.status || 'CONCLUIDO',
          data.observacoes || null,
          data.respostas_acompanhamento || null,
          data.pitch_score ?? null,
          data.forecast_score ?? null,
          data.negociacao_id || null,
        ]
      );

      // Se um forecast_score foi avaliado para uma negociação específica durante o ritual, sincroniza na negociação
      if (data.negociacao_id && data.forecast_score !== undefined && data.forecast_score !== null) {
        await tx.query(
          `UPDATE negociacoes
           SET forecast_score = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [data.forecast_score, data.negociacao_id]
        );
      }
    });

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'RITUAL_EXECUTADO',
      entidade: 'ritual_execucoes',
      entidadeId: execId,
      detalhes: `Execução do ritual "${ritual.nome}" registrada por ${user.name}.`,
      ipAddress,
    });

    return db.queryOne(`SELECT * FROM ritual_execucoes WHERE id = $1`, [execId]);
  },

  async getPlaybookInbound() {
    const { rows } = await db.query<any>(
      `SELECT * FROM playbook_conteudos ORDER BY secao_numero ASC, ordem ASC`
    );

    const sectionsMap = new Map<
      number,
      {
        secao_numero: number;
        secao_slug: string;
        secao_titulo: string;
        blocos: any[];
      }
    >();

    for (const row of rows) {
      if (!sectionsMap.has(row.secao_numero)) {
        sectionsMap.set(row.secao_numero, {
          secao_numero: row.secao_numero,
          secao_slug: row.secao_slug,
          secao_titulo: row.secao_titulo,
          blocos: [],
        });
      }
      sectionsMap.get(row.secao_numero)!.blocos.push(row);
    }

    return {
      documento_referencia: 'Playbook Inbound Rev03 — Quest Comunicação Total',
      secoes: Array.from(sectionsMap.values()),
      total_blocos: rows.length,
    };
  },

  async updatePlaybookConteudo(
    user: AuthenticatedUser,
    id: string,
    data: any,
    ipAddress?: string
  ) {
    if (user.role !== 'GESTOR') {
      throw new AppError(
        'Apenas gestores podem atualizar o documento-mestre do Playbook Inbound.',
        403,
        'FORBIDDEN'
      );
    }

    const existing = await db.queryOne(`SELECT * FROM playbook_conteudos WHERE id = $1`, [id]);
    if (!existing) {
      throw new AppError('Bloco do Playbook não encontrado.', 404, 'PLAYBOOK_BLOCK_NOT_FOUND');
    }

    await db.query(
      `UPDATE playbook_conteudos
       SET titulo = $1,
           subtitulo = $2,
           conteudo = $3,
           criterios_avanco = $4,
           responsaveis = $5,
           copiavel = COALESCE($6, copiavel),
           oficial_importado = COALESCE($7, true),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        data.titulo,
        data.subtitulo ?? existing.subtitulo,
        data.conteudo,
        data.criterios_avanco ?? existing.criterios_avanco,
        data.responsaveis ?? existing.responsaveis,
        data.copiavel ?? null,
        data.oficial_importado ?? true,
        id,
      ]
    );

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'PLAYBOOK_INBOUND_ATUALIZADO',
      entidade: 'playbook_conteudos',
      entidadeId: id,
      detalhes: `Bloco "${data.titulo}" atualizado com conteúdo oficial.`,
      ipAddress,
    });

    return db.queryOne(`SELECT * FROM playbook_conteudos WHERE id = $1`, [id]);
  },
};

