import crypto from 'crypto';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { generateSecureToken, hashTokenSha256 } from '../config/security.js';
import { AuthenticatedUser, recordAuditLog } from '../middlewares/auth.middleware.js';
import { AppError } from '../middlewares/error.middleware.js';

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function getMetaSemaforo(percentual: number): 'VERDE' | 'AMARELO' | 'VERMELHO' {
  if (percentual >= 90) return 'VERDE';
  if (percentual >= 50) return 'AMARELO';
  return 'VERMELHO';
}

function resolveDateRange(filters: {
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
}) {
  const now = new Date();
  const year = filters.year || now.getFullYear();
  const month = filters.month || now.getMonth() + 1;

  if (filters.startDate && filters.endDate) {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    const diffMs = Math.max(86400000, end.getTime() - start.getTime());
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - diffMs);
    return {
      year,
      month,
      periodoStr: `${year}-${String(month).padStart(2, '0')}`,
      start,
      end,
      prevStart,
      prevEnd,
    };
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const prevStart = new Date(Date.UTC(year, month - 2, 1, 0, 0, 0));
  const prevEnd = new Date(Date.UTC(year, month - 1, 0, 23, 59, 59, 999));

  return {
    year,
    month,
    periodoStr: `${year}-${String(month).padStart(2, '0')}`,
    start,
    end,
    prevStart,
    prevEnd,
  };
}

export const gestaoService = {
  async getOverviewDashboard(
    user: AuthenticatedUser,
    filters: {
      month?: number;
      year?: number;
      startDate?: string;
      endDate?: string;
      sellerId?: string;
    }
  ) {
    const range = resolveDateRange(filters);
    const effectiveSellerId =
      user.role === 'VENDEDOR' ? user.id : filters.sellerId || null;

    const ownerFilterSql = effectiveSellerId ? `AND n.owner_id = $3` : '';
    const baseParams: any[] = [range.start.toISOString(), range.end.toISOString()];
    if (effectiveSellerId) baseParams.push(effectiveSellerId);

    // 1. KPIs do período selecionado
    const kpiRow = await db.queryOne<any>(
      `SELECT
         COALESCE(SUM(n.valor) FILTER (
           WHERE n.status = 'GANHO'
             AND COALESCE(n.closed_date, n.updated_at) >= $1::timestamptz
             AND COALESCE(n.closed_date, n.updated_at) <= $2::timestamptz
         ), 0) AS receita_periodo,
         COUNT(*) FILTER (
           WHERE n.status = 'GANHO'
             AND COALESCE(n.closed_date, n.updated_at) >= $1::timestamptz
             AND COALESCE(n.closed_date, n.updated_at) <= $2::timestamptz
         )::int AS qtd_ganhos_periodo,
         COUNT(*) FILTER (
           WHERE n.status = 'PERDIDO'
             AND COALESCE(n.closed_date, n.updated_at) >= $1::timestamptz
             AND COALESCE(n.closed_date, n.updated_at) <= $2::timestamptz
         )::int AS qtd_perdidos_periodo,
         COUNT(*) FILTER (WHERE n.status = 'EM_ANDAMENTO')::int AS negocios_em_andamento,
         COALESCE(SUM(n.valor) FILTER (WHERE n.status = 'EM_ANDAMENTO'), 0) AS valor_em_andamento
       FROM negociacoes n
       WHERE 1=1 ${ownerFilterSql}`,
      baseParams
    );

    // Período imediatamente anterior para comparativo
    const prevParams: any[] = [range.prevStart.toISOString(), range.prevEnd.toISOString()];
    if (effectiveSellerId) prevParams.push(effectiveSellerId);

    const prevRow = await db.queryOne<any>(
      `SELECT
         COALESCE(SUM(n.valor) FILTER (
           WHERE n.status = 'GANHO'
             AND COALESCE(n.closed_date, n.updated_at) >= $1::timestamptz
             AND COALESCE(n.closed_date, n.updated_at) <= $2::timestamptz
         ), 0) AS receita_anterior,
         COUNT(*) FILTER (
           WHERE n.status = 'GANHO'
             AND COALESCE(n.closed_date, n.updated_at) >= $1::timestamptz
             AND COALESCE(n.closed_date, n.updated_at) <= $2::timestamptz
         )::int AS qtd_ganhos_anterior,
         COUNT(*) FILTER (
           WHERE n.status = 'PERDIDO'
             AND COALESCE(n.closed_date, n.updated_at) >= $1::timestamptz
             AND COALESCE(n.closed_date, n.updated_at) <= $2::timestamptz
         )::int AS qtd_perdidos_anterior
       FROM negociacoes n
       WHERE 1=1 ${ownerFilterSql}`,
      prevParams
    );

    // Meta do período
    const metaParams: any[] = [range.periodoStr, range.year, range.month];
    let metaSellerSql = '';
    if (effectiveSellerId) {
      metaParams.push(effectiveSellerId);
      metaSellerSql = `AND m.vendedor_id = $4`;
    }

    const metaRow = await db.queryOne<{ total_meta: string }>(
      `SELECT COALESCE(SUM(m.valor_alvo), 0)::text AS total_meta
       FROM metas m
       WHERE m.tipo = 'MENSAL'
         AND (m.periodo = $1 OR (m.ano = $2 AND m.mes = $3))
         ${metaSellerSql}`,
      metaParams
    );

    const receitaNoMes = Number(toNum(kpiRow?.receita_periodo).toFixed(2));
    const negociosEmAndamento = toNum(kpiRow?.negocios_em_andamento);
    const valorEmAndamento = Number(toNum(kpiRow?.valor_em_andamento).toFixed(2));
    const ganhos = toNum(kpiRow?.qtd_ganhos_periodo);
    const perdidos = toNum(kpiRow?.qtd_perdidos_periodo);
    const encerrados = ganhos + perdidos;
    const taxaConversao = encerrados > 0 ? Number(((ganhos / encerrados) * 100).toFixed(2)) : 0;

    const metaVendas = Number(toNum(metaRow?.total_meta).toFixed(2));
    const percentualMeta =
      metaVendas > 0 ? Number(((receitaNoMes / metaVendas) * 100).toFixed(2)) : 0;
    const semaforoMeta = getMetaSemaforo(percentualMeta);

    // Evolução mensal da receita no ano selecionado (12 meses)
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];
    const evolucaoMensal: Array<{
      mes_numero: number;
      mes_nome: string;
      periodo: string;
      receita: number;
      meta: number;
    }> = [];

    for (let m = 1; m <= 12; m++) {
      const mStart = new Date(Date.UTC(range.year, m - 1, 1, 0, 0, 0)).toISOString();
      const mEnd = new Date(Date.UTC(range.year, m, 0, 23, 59, 59, 999)).toISOString();
      const mPeriodo = `${range.year}-${String(m).padStart(2, '0')}`;

      const mParams: any[] = [mStart, mEnd];
      if (effectiveSellerId) mParams.push(effectiveSellerId);

      const mRec = await db.queryOne<{ receita: string }>(
        `SELECT COALESCE(SUM(n.valor), 0)::text AS receita
         FROM negociacoes n
         WHERE n.status = 'GANHO'
           AND COALESCE(n.closed_date, n.updated_at) >= $1::timestamptz
           AND COALESCE(n.closed_date, n.updated_at) <= $2::timestamptz
           ${effectiveSellerId ? 'AND n.owner_id = $3' : ''}`,
        mParams
      );

      const mMetaParams: any[] = [mPeriodo, range.year, m];
      if (effectiveSellerId) mMetaParams.push(effectiveSellerId);

      const mMeta = await db.queryOne<{ meta: string }>(
        `SELECT COALESCE(SUM(m.valor_alvo), 0)::text AS meta
         FROM metas m
         WHERE m.tipo = 'MENSAL'
           AND (m.periodo = $1 OR (m.ano = $2 AND m.mes = $3))
           ${effectiveSellerId ? 'AND m.vendedor_id = $4' : ''}`,
        mMetaParams
      );

      evolucaoMensal.push({
        mes_numero: m,
        mes_nome: monthNames[m - 1],
        periodo: mPeriodo,
        receita: Number(toNum(mRec?.receita).toFixed(2)),
        meta: Number(toNum(mMeta?.meta).toFixed(2)),
      });
    }

    // Negócios por status
    const statusParams: any[] = [];
    if (effectiveSellerId) statusParams.push(effectiveSellerId);
    const { rows: statusRows } = await db.query<{
      status: string;
      quantidade: number;
      valor_total: string;
    }>(
      `SELECT
         n.status::text AS status,
         COUNT(*)::int AS quantidade,
         COALESCE(SUM(n.valor), 0)::text AS valor_total
       FROM negociacoes n
       ${effectiveSellerId ? 'WHERE n.owner_id = $1' : ''}
       GROUP BY n.status`,
      statusParams
    );

    const statusMap: Record<string, { quantidade: number; valor_total: number }> = {
      EM_ANDAMENTO: { quantidade: 0, valor_total: 0 },
      GANHO: { quantidade: 0, valor_total: 0 },
      PERDIDO: { quantidade: 0, valor_total: 0 },
    };
    for (const r of statusRows) {
      statusMap[r.status] = {
        quantidade: toNum(r.quantidade),
        valor_total: Number(toNum(r.valor_total).toFixed(2)),
      };
    }

    const negociosPorStatus = [
      {
        status: 'EM_ANDAMENTO',
        label: 'Em Andamento',
        quantidade: statusMap.EM_ANDAMENTO.quantidade,
        valor_total: statusMap.EM_ANDAMENTO.valor_total,
      },
      {
        status: 'GANHO',
        label: 'Ganho',
        quantidade: statusMap.GANHO.quantidade,
        valor_total: statusMap.GANHO.valor_total,
      },
      {
        status: 'PERDIDO',
        label: 'Perdido',
        quantidade: statusMap.PERDIDO.quantidade,
        valor_total: statusMap.PERDIDO.valor_total,
      },
    ];

    const receitaAnterior = Number(toNum(prevRow?.receita_anterior).toFixed(2));
    const ganhosAnterior = toNum(prevRow?.qtd_ganhos_anterior);
    const perdidosAnterior = toNum(prevRow?.qtd_perdidos_anterior);
    const encerradosAnterior = ganhosAnterior + perdidosAnterior;
    const conversaoAnterior =
      encerradosAnterior > 0
        ? Number(((ganhosAnterior / encerradosAnterior) * 100).toFixed(2))
        : 0;

    const variacaoReceitaPct =
      receitaAnterior > 0
        ? Number((((receitaNoMes - receitaAnterior) / receitaAnterior) * 100).toFixed(2))
        : receitaNoMes > 0
        ? 100
        : 0;

    return {
      filtros_aplicados: {
        ano: range.year,
        mes: range.month,
        periodo: range.periodoStr,
        inicio: range.start.toISOString(),
        fim: range.end.toISOString(),
        vendedor_id: effectiveSellerId,
      },
      kpis: {
        receita_no_mes: receitaNoMes,
        negocios_em_andamento: negociosEmAndamento,
        valor_pipeline_em_andamento: valorEmAndamento,
        taxa_conversao: taxaConversao,
        ganhos_no_periodo: ganhos,
        perdidos_no_periodo: perdidos,
        meta_vendas: metaVendas,
        percentual_meta_atingido: percentualMeta,
        valor_restante_meta: Math.max(0, Number((metaVendas - receitaNoMes).toFixed(2))),
        semaforo_meta: semaforoMeta,
      },
      graficos: {
        evolucao_mensal_receita: evolucaoMensal,
        negocios_por_status: negociosPorStatus,
        progresso_meta: {
          meta: metaVendas,
          realizado: receitaNoMes,
          restante: Math.max(0, Number((metaVendas - receitaNoMes).toFixed(2))),
          percentual: percentualMeta,
          cor_semaforo: semaforoMeta,
        },
        comparativo_periodos: [
          {
            periodo: 'Período Anterior',
            receita: receitaAnterior,
            ganhos: ganhosAnterior,
            taxa_conversao: conversaoAnterior,
          },
          {
            periodo: 'Período Atual',
            receita: receitaNoMes,
            ganhos,
            taxa_conversao: taxaConversao,
          },
        ],
        variacao_receita_percentual: variacaoReceitaPct,
      },
      formulas_kpis: {
        receita_no_mes:
          'Soma do valor (BRL) das negociações com status GANHO e data de fechamento dentro do período selecionado.',
        negocios_em_andamento:
          'Quantidade total de negociações ativas com status EM_ANDAMENTO.',
        taxa_conversao:
          '(Negociações Ganhas no Período / (Negociações Ganhas + Negociações Perdidas no Período)) * 100.',
        meta_atingida: '(Receita Realizada no Período / Meta de Vendas do Período) * 100.',
      },
    };
  },

  async listMetas(
    user: AuthenticatedUser,
    filters?: { ano?: number; mes?: number; vendedorId?: string; tipo?: string }
  ) {
    const params: any[] = [];
    const where: string[] = [];

    if (user.role === 'VENDEDOR') {
      params.push(user.id);
      where.push(`(m.vendedor_id = $${params.length} OR m.vendedor_id IS NULL)`);
    } else if (filters?.vendedorId) {
      params.push(filters.vendedorId);
      where.push(`m.vendedor_id = $${params.length}`);
    }

    if (filters?.ano) {
      params.push(filters.ano);
      where.push(`m.ano = $${params.length}`);
    }

    if (filters?.mes) {
      params.push(filters.mes);
      where.push(`m.mes = $${params.length}`);
    }

    if (filters?.tipo) {
      params.push(filters.tipo);
      where.push(`m.tipo = $${params.length}::"MetaTipo"`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const { rows } = await db.query<any>(
      `SELECT
         m.*,
         u.name AS vendedor_nome,
         u.cargo AS vendedor_cargo
       FROM metas m
       LEFT JOIN users u ON u.id = m.vendedor_id
       ${whereClause}
       ORDER BY m.ano DESC, COALESCE(m.mes, 12) DESC, m.created_at DESC`,
      params
    );

    const now = new Date();
    const enriched = await Promise.all(
      rows.map(async (m) => {
        const valorAlvo = Number(toNum(m.valor_alvo).toFixed(2));
        let startDate: Date;
        let endDate: Date;

        if (m.mes) {
          startDate = new Date(Date.UTC(m.ano, m.mes - 1, 1, 0, 0, 0));
          endDate = new Date(Date.UTC(m.ano, m.mes, 0, 23, 59, 59, 999));
        } else {
          startDate = new Date(Date.UTC(m.ano, 0, 1, 0, 0, 0));
          endDate = new Date(Date.UTC(m.ano, 11, 31, 23, 59, 59, 999));
        }

        const rParams: any[] = [startDate.toISOString(), endDate.toISOString()];
        let sellerClause = '';
        if (m.vendedor_id) {
          rParams.push(m.vendedor_id);
          sellerClause = `AND n.owner_id = $3`;
        } else if (user.role === 'VENDEDOR') {
          rParams.push(user.id);
          sellerClause = `AND n.owner_id = $3`;
        }

        const recRow = await db.queryOne<{ realizado: string }>(
          `SELECT COALESCE(SUM(n.valor), 0)::text AS realizado
           FROM negociacoes n
           WHERE n.status = 'GANHO'
             AND COALESCE(n.closed_date, n.updated_at) >= $1::timestamptz
             AND COALESCE(n.closed_date, n.updated_at) <= $2::timestamptz
             ${sellerClause}`,
          rParams
        );

        const valorRealizado = Number(toNum(recRow?.realizado).toFixed(2));
        const percentualAtingido =
          valorAlvo > 0 ? Number(((valorRealizado / valorAlvo) * 100).toFixed(2)) : 0;
        const valorRestante = Math.max(0, Number((valorAlvo - valorRealizado).toFixed(2)));

        // Projeção linear de atingimento
        const totalDays = Math.max(
          1,
          Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)
        );
        let elapsedDays = totalDays;
        if (now >= startDate && now <= endDate) {
          elapsedDays = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / 86400000));
        } else if (now < startDate) {
          elapsedDays = 1;
        }
        const projecaoAtingimento =
          now < startDate
            ? 0
            : Number(((valorRealizado / elapsedDays) * totalDays).toFixed(2));

        const semaforo = getMetaSemaforo(percentualAtingido);

        return {
          ...m,
          valor_alvo: valorAlvo,
          valor_realizado: valorRealizado,
          percentual_atingido: percentualAtingido,
          valor_restante: valorRestante,
          projecao_atingimento: projecaoAtingimento,
          cor_semaforo: semaforo,
        };
      })
    );

    return enriched;
  },

  async createMeta(user: AuthenticatedUser, data: any, ipAddress?: string) {
    if (user.role !== 'GESTOR') {
      throw new AppError('Apenas gestores podem cadastrar ou editar metas.', 403, 'FORBIDDEN');
    }

    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO metas
        (id, vendedor_id, tipo, periodo, ano, mes, ciclo, indicador_nome, valor_alvo, observacoes, created_at, updated_at)
       VALUES ($1, $2, $3::"MetaTipo", $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        id,
        data.vendedor_id || null,
        data.tipo || 'MENSAL',
        data.periodo,
        data.ano,
        data.mes ?? null,
        data.ciclo || null,
        data.indicador_nome || null,
        data.valor_alvo,
        data.observacoes || null,
      ]
    );

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'META_CRIADA',
      entidade: 'metas',
      entidadeId: id,
      detalhes: `Meta ${data.tipo} (${data.periodo}) definida em R$ ${Number(data.valor_alvo).toFixed(2)}.`,
      ipAddress,
    });

    const list = await this.listMetas(user);
    return list.find((m) => m.id === id);
  },

  async updateMeta(user: AuthenticatedUser, id: string, data: any, ipAddress?: string) {
    if (user.role !== 'GESTOR') {
      throw new AppError('Apenas gestores podem editar metas.', 403, 'FORBIDDEN');
    }

    const existing = await db.queryOne(`SELECT * FROM metas WHERE id = $1`, [id]);
    if (!existing) {
      throw new AppError('Meta não encontrada.', 404, 'META_NOT_FOUND');
    }

    await db.query(
      `UPDATE metas
       SET vendedor_id = $1,
           tipo = COALESCE($2::"MetaTipo", tipo),
           periodo = COALESCE($3, periodo),
           ano = COALESCE($4, ano),
           mes = $5,
           ciclo = $6,
           indicador_nome = $7,
           valor_alvo = COALESCE($8, valor_alvo),
           observacoes = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        data.vendedor_id !== undefined ? data.vendedor_id : existing.vendedor_id,
        data.tipo ?? null,
        data.periodo ?? null,
        data.ano ?? null,
        data.mes !== undefined ? data.mes : existing.mes,
        data.ciclo !== undefined ? data.ciclo : existing.ciclo,
        data.indicador_nome !== undefined ? data.indicador_nome : existing.indicador_nome,
        data.valor_alvo ?? null,
        data.observacoes !== undefined ? data.observacoes : existing.observacoes,
        id,
      ]
    );

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'META_ATUALIZADA',
      entidade: 'metas',
      entidadeId: id,
      ipAddress,
    });

    const list = await this.listMetas(user);
    return list.find((m) => m.id === id);
  },

  async deleteMeta(user: AuthenticatedUser, id: string, confirm: boolean, ipAddress?: string) {
    if (user.role !== 'GESTOR') {
      throw new AppError('Apenas gestores podem excluir metas.', 403, 'FORBIDDEN');
    }
    if (!confirm) {
      throw new AppError('Confirmação explícita obrigatória para excluir meta.', 400, 'CONFIRMATION_REQUIRED');
    }

    await db.query(`DELETE FROM metas WHERE id = $1`, [id]);
    await recordAuditLog({
      usuarioId: user.id,
      acao: 'META_EXCLUIDA',
      entidade: 'metas',
      entidadeId: id,
      ipAddress,
    });

    return { deleted: true };
  },

  async getKpisInbound(
    user: AuthenticatedUser,
    filters?: { usuarioId?: string; periodo?: string; ciclo?: string }
  ) {
    // Localiza Tiago Hilário (Vendas Inbound / Consultoria) como referência padrão se não especificado
    const tiago = await db.queryOne<{ id: string; name: string; cargo: string }>(
      `SELECT id, name, cargo FROM users WHERE LOWER(email) LIKE 'tiago.hilario%' LIMIT 1`
    );

    const targetUserId =
      user.role === 'VENDEDOR'
        ? user.id
        : filters?.usuarioId || tiago?.id || null;

    const params: any[] = [];
    const where: string[] = [];

    if (targetUserId) {
      params.push(targetUserId);
      where.push(`k.usuario_id = $${params.length}`);
    }

    if (filters?.periodo) {
      params.push(filters.periodo);
      where.push(`k.periodo = $${params.length}`);
    }

    if (filters?.ciclo) {
      params.push(filters.ciclo);
      where.push(`k.ciclo = $${params.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const { rows } = await db.query<any>(
      `SELECT
         k.*,
         u.name AS usuario_nome,
         u.cargo AS usuario_cargo
       FROM kpi_metas k
       LEFT JOIN users u ON u.id = k.usuario_id
       ${whereClause}
       ORDER BY k.periodo DESC, k.created_at DESC`,
      params
    );

    // Calcula também indicadores reais de CRM para o usuário alvo (ticket médio, conversão, ciclo médio em dias)
    const crmStatsParams: any[] = [];
    if (targetUserId) crmStatsParams.push(targetUserId);
    const crmStats = await db.queryOne<any>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'GANHO')::int AS ganhos,
         COUNT(*) FILTER (WHERE status = 'PERDIDO')::int AS perdidos,
         COALESCE(AVG(valor) FILTER (WHERE status = 'GANHO'), 0) AS ticket_medio_crm,
         COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(closed_date, updated_at) - created_at)) / 86400) FILTER (WHERE status = 'GANHO'), 0) AS ciclo_medio_dias_crm
       FROM negociacoes
       ${targetUserId ? 'WHERE owner_id = $1' : ''}`,
      crmStatsParams
    );

    const ganhos = toNum(crmStats?.ganhos);
    const perdidos = toNum(crmStats?.perdidos);
    const taxaConversaoCrm =
      ganhos + perdidos > 0 ? Number(((ganhos / (ganhos + perdidos)) * 100).toFixed(2)) : 0;

    return {
      vendedor_referencia: tiago || null,
      registros: rows.map((r) => ({
        ...r,
        taxa_agendamento_meta: r.taxa_agendamento_meta !== null ? toNum(r.taxa_agendamento_meta) : null,
        taxa_agendamento_realizado: r.taxa_agendamento_realizado !== null ? toNum(r.taxa_agendamento_realizado) : null,
        taxa_qualificacao_meta: r.taxa_qualificacao_meta !== null ? toNum(r.taxa_qualificacao_meta) : null,
        taxa_qualificacao_realizado: r.taxa_qualificacao_realizado !== null ? toNum(r.taxa_qualificacao_realizado) : null,
        taxa_aceite_diagnostico_meta: r.taxa_aceite_diagnostico_meta !== null ? toNum(r.taxa_aceite_diagnostico_meta) : null,
        taxa_aceite_diagnostico_realizado:
          r.taxa_aceite_diagnostico_realizado !== null ? toNum(r.taxa_aceite_diagnostico_realizado) : null,
        taxa_conversao_meta: r.taxa_conversao_meta !== null ? toNum(r.taxa_conversao_meta) : null,
        taxa_conversao_realizado: r.taxa_conversao_realizado !== null ? toNum(r.taxa_conversao_realizado) : null,
        ticket_medio_meta: r.ticket_medio_meta !== null ? toNum(r.ticket_medio_meta) : null,
        ticket_medio_realizado: r.ticket_medio_realizado !== null ? toNum(r.ticket_medio_realizado) : null,
        ciclo_1_meta: r.ciclo_1_meta !== null ? toNum(r.ciclo_1_meta) : null,
        ciclo_1_realizado: r.ciclo_1_realizado !== null ? toNum(r.ciclo_1_realizado) : null,
        ciclo_2_meta: r.ciclo_2_meta !== null ? toNum(r.ciclo_2_meta) : null,
        ciclo_2_realizado: r.ciclo_2_realizado !== null ? toNum(r.ciclo_2_realizado) : null,
        previsao_receita: r.previsao_receita !== null ? toNum(r.previsao_receita) : null,
      })),
      indicadores_crm_tempo_real: {
        taxa_conversao_realizada: taxaConversaoCrm,
        ticket_medio_realizado: Number(toNum(crmStats?.ticket_medio_crm).toFixed(2)),
        ciclo_medio_fechamento_dias: Math.round(toNum(crmStats?.ciclo_medio_dias_crm)),
      },
    };
  },

  async upsertKpisInbound(user: AuthenticatedUser, data: any, ipAddress?: string) {
    if (user.role !== 'GESTOR') {
      throw new AppError(
        'Apenas gestores podem configurar os KPIs de referência do Funil Inbound + Consultoria.',
        403,
        'FORBIDDEN'
      );
    }

    const existing = data.id
      ? await db.queryOne<{ id: string }>(`SELECT id FROM kpi_metas WHERE id = $1`, [data.id])
      : await db.queryOne<{ id: string }>(
          `SELECT id FROM kpi_metas
           WHERE COALESCE(usuario_id::text, '') = COALESCE($1, '')
             AND periodo = $2
             AND ciclo = $3`,
          [data.usuario_id || null, data.periodo, data.ciclo || 'GERAL']
        );

    const recordId = existing?.id || crypto.randomUUID();

    if (existing) {
      await db.query(
        `UPDATE kpi_metas
         SET usuario_id = $1,
             periodo = $2,
             ciclo = $3,
             validacoes_radar_meta = $4,
             validacoes_radar_realizado = COALESCE($5, 0),
             taxa_agendamento_meta = $6,
             taxa_agendamento_realizado = $7,
             taxa_qualificacao_meta = $8,
             taxa_qualificacao_realizado = $9,
             taxa_aceite_diagnostico_meta = $10,
             taxa_aceite_diagnostico_realizado = $11,
             taxa_conversao_meta = $12,
             taxa_conversao_realizado = $13,
             ticket_medio_meta = $14,
             ticket_medio_realizado = $15,
             ciclo_dias_meta = $16,
             ciclo_dias_realizado = $17,
             ciclo_1_meta = $18,
             ciclo_1_realizado = $19,
             ciclo_2_meta = $20,
             ciclo_2_realizado = $21,
             previsao_receita = $22,
             previsao_fechamentos = $23,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $24`,
        [
          data.usuario_id || null,
          data.periodo,
          data.ciclo || 'GERAL',
          data.validacoes_radar_meta ?? null,
          data.validacoes_radar_realizado ?? 0,
          data.taxa_agendamento_meta ?? null,
          data.taxa_agendamento_realizado ?? null,
          data.taxa_qualificacao_meta ?? null,
          data.taxa_qualificacao_realizado ?? null,
          data.taxa_aceite_diagnostico_meta ?? null,
          data.taxa_aceite_diagnostico_realizado ?? null,
          data.taxa_conversao_meta ?? null,
          data.taxa_conversao_realizado ?? null,
          data.ticket_medio_meta ?? null,
          data.ticket_medio_realizado ?? null,
          data.ciclo_dias_meta ?? null,
          data.ciclo_dias_realizado ?? null,
          data.ciclo_1_meta ?? null,
          data.ciclo_1_realizado ?? null,
          data.ciclo_2_meta ?? null,
          data.ciclo_2_realizado ?? null,
          data.previsao_receita ?? null,
          data.previsao_fechamentos ?? null,
          recordId,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO kpi_metas
          (id, usuario_id, periodo, ciclo,
           validacoes_radar_meta, validacoes_radar_realizado,
           taxa_agendamento_meta, taxa_agendamento_realizado,
           taxa_qualificacao_meta, taxa_qualificacao_realizado,
           taxa_aceite_diagnostico_meta, taxa_aceite_diagnostico_realizado,
           taxa_conversao_meta, taxa_conversao_realizado,
           ticket_medio_meta, ticket_medio_realizado,
           ciclo_dias_meta, ciclo_dias_realizado,
           ciclo_1_meta, ciclo_1_realizado,
           ciclo_2_meta, ciclo_2_realizado,
           previsao_receita, previsao_fechamentos,
           created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        [
          recordId,
          data.usuario_id || null,
          data.periodo,
          data.ciclo || 'GERAL',
          data.validacoes_radar_meta ?? null,
          data.validacoes_radar_realizado ?? 0,
          data.taxa_agendamento_meta ?? null,
          data.taxa_agendamento_realizado ?? null,
          data.taxa_qualificacao_meta ?? null,
          data.taxa_qualificacao_realizado ?? null,
          data.taxa_aceite_diagnostico_meta ?? null,
          data.taxa_aceite_diagnostico_realizado ?? null,
          data.taxa_conversao_meta ?? null,
          data.taxa_conversao_realizado ?? null,
          data.ticket_medio_meta ?? null,
          data.ticket_medio_realizado ?? null,
          data.ciclo_dias_meta ?? null,
          data.ciclo_dias_realizado ?? null,
          data.ciclo_1_meta ?? null,
          data.ciclo_1_realizado ?? null,
          data.ciclo_2_meta ?? null,
          data.ciclo_2_realizado ?? null,
          data.previsao_receita ?? null,
          data.previsao_fechamentos ?? null,
        ]
      );
    }

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'KPI_INBOUND_ATUALIZADO',
      entidade: 'kpi_metas',
      entidadeId: recordId,
      ipAddress,
    });

    return this.getKpisInbound(user, { usuarioId: data.usuario_id, periodo: data.periodo });
  },

  async getResultadosAnalytics(
    user: AuthenticatedUser,
    filters: { year?: number; month?: number; sellerId?: string }
  ) {
    const year = filters.year || new Date().getFullYear();
    const effectiveSellerId =
      user.role === 'VENDEDOR' ? user.id : filters.sellerId || null;

    const params: any[] = [];
    let whereSeller = '';
    if (effectiveSellerId) {
      params.push(effectiveSellerId);
      whereSeller = `WHERE n.owner_id = $1`;
    }

    // 1. Indicadores globais (Ticket Médio, Conversão, Ciclo Médio de Vendas)
    const summaryRow = await db.queryOne<any>(
      `SELECT
         COUNT(*)::int AS total_negociacoes,
         COUNT(*) FILTER (WHERE n.status = 'GANHO')::int AS total_ganhos,
         COUNT(*) FILTER (WHERE n.status = 'PERDIDO')::int AS total_perdidos,
         COUNT(*) FILTER (WHERE n.status = 'EM_ANDAMENTO')::int AS total_em_andamento,
         COALESCE(SUM(n.valor) FILTER (WHERE n.status = 'GANHO'), 0) AS receita_total_ganha,
         COALESCE(SUM(n.valor) FILTER (WHERE n.status = 'PERDIDO'), 0) AS valor_total_perdido,
         COALESCE(AVG(n.valor) FILTER (WHERE n.status = 'GANHO'), 0) AS ticket_medio,
         COALESCE(
           AVG(EXTRACT(EPOCH FROM (COALESCE(n.closed_date, n.updated_at) - n.created_at)) / 86400)
           FILTER (WHERE n.status = 'GANHO'),
           0
         ) AS ciclo_medio_dias
       FROM negociacoes n
       ${whereSeller}`,
      params
    );

    const ganhos = toNum(summaryRow?.total_ganhos);
    const perdidos = toNum(summaryRow?.total_perdidos);
    const encerrados = ganhos + perdidos;
    const taxaConversao =
      encerrados > 0 ? Number(((ganhos / encerrados) * 100).toFixed(2)) : 0;

    // 2. Funil por etapa (5 etapas fixas)
    const { rows: stages } = await db.query<any>(
      `SELECT id, nome, slug, ordem, cor FROM stages ORDER BY ordem ASC`
    );

    const funilPorEtapa = await Promise.all(
      stages.map(async (st) => {
        const fParams: any[] = [st.id];
        if (effectiveSellerId) fParams.push(effectiveSellerId);
        const row = await db.queryOne<any>(
          `SELECT
             COUNT(*)::int AS quantidade,
             COALESCE(SUM(n.valor), 0) AS valor_total
           FROM negociacoes n
           WHERE n.etapa_id = $1
             ${effectiveSellerId ? 'AND n.owner_id = $2' : ''}`,
          fParams
        );
        return {
          etapa_id: st.id,
          etapa_nome: st.nome,
          ordem: st.ordem,
          cor: st.cor,
          quantidade: toNum(row?.quantidade),
          valor_total: Number(toNum(row?.valor_total).toFixed(2)),
        };
      })
    );

    // 3. Receita por mês & Ganhos vs Perdidos no ano
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];
    const desempenhoPorMes: Array<{
      mes_numero: number;
      mes_nome: string;
      receita_ganha: number;
      valor_perdido: number;
      qtd_ganhos: number;
      qtd_perdidos: number;
    }> = [];

    for (let m = 1; m <= 12; m++) {
      const mStart = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0)).toISOString();
      const mEnd = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999)).toISOString();
      const mParams: any[] = [mStart, mEnd];
      if (effectiveSellerId) mParams.push(effectiveSellerId);

      const mRow = await db.queryOne<any>(
        `SELECT
           COALESCE(SUM(n.valor) FILTER (WHERE n.status = 'GANHO'), 0) AS receita_ganha,
           COALESCE(SUM(n.valor) FILTER (WHERE n.status = 'PERDIDO'), 0) AS valor_perdido,
           COUNT(*) FILTER (WHERE n.status = 'GANHO')::int AS qtd_ganhos,
           COUNT(*) FILTER (WHERE n.status = 'PERDIDO')::int AS qtd_perdidos
         FROM negociacoes n
         WHERE COALESCE(n.closed_date, n.updated_at) >= $1::timestamptz
           AND COALESCE(n.closed_date, n.updated_at) <= $2::timestamptz
           ${effectiveSellerId ? 'AND n.owner_id = $3' : ''}`,
        mParams
      );

      desempenhoPorMes.push({
        mes_numero: m,
        mes_nome: monthNames[m - 1],
        receita_ganha: Number(toNum(mRow?.receita_ganha).toFixed(2)),
        valor_perdido: Number(toNum(mRow?.valor_perdido).toFixed(2)),
        qtd_ganhos: toNum(mRow?.qtd_ganhos),
        qtd_perdidos: toNum(mRow?.qtd_perdidos),
      });
    }

    // 4. Ranking de vendedores (se VENDEDOR, retorna apenas seu próprio registro para preservar privacidade de negociações de outros vendedores)
    const rankingParams: any[] = [];
    let userWhere = `WHERE u.active = true`;
    if (user.role === 'VENDEDOR') {
      rankingParams.push(user.id);
      userWhere += ` AND u.id = $1`;
    }

    const { rows: sellers } = await db.query<any>(
      `SELECT
         u.id,
         u.name,
         u.cargo,
         u.role,
         COUNT(n.id)::int AS total_negocios,
         COUNT(n.id) FILTER (WHERE n.status = 'GANHO')::int AS ganhos,
         COUNT(n.id) FILTER (WHERE n.status = 'PERDIDO')::int AS perdidos,
         COALESCE(SUM(n.valor) FILTER (WHERE n.status = 'GANHO'), 0) AS receita_realizada,
         COALESCE(AVG(n.valor) FILTER (WHERE n.status = 'GANHO'), 0) AS ticket_medio
       FROM users u
       LEFT JOIN negociacoes n ON n.owner_id = u.id
       ${userWhere}
       GROUP BY u.id, u.name, u.cargo, u.role
       ORDER BY receita_realizada DESC, ganhos DESC, u.name ASC`,
      rankingParams
    );

    const rankingVendedores = sellers.map((s, idx) => {
      const sGanhos = toNum(s.ganhos);
      const sPerdidos = toNum(s.perdidos);
      const sEnc = sGanhos + sPerdidos;
      return {
        posicao: idx + 1,
        vendedor_id: s.id,
        nome: s.name,
        cargo: s.cargo,
        role: s.role,
        total_negocios: toNum(s.total_negocios),
        ganhos: sGanhos,
        perdidos: sPerdidos,
        receita_realizada: Number(toNum(s.receita_realizada).toFixed(2)),
        ticket_medio: Number(toNum(s.ticket_medio).toFixed(2)),
        taxa_conversao: sEnc > 0 ? Number(((sGanhos / sEnc) * 100).toFixed(2)) : 0,
      };
    });

    return {
      ano_referencia: year,
      possui_dados: toNum(summaryRow?.total_negociacoes) > 0,
      indicadores: {
        total_negociacoes: toNum(summaryRow?.total_negociacoes),
        total_ganhos: ganhos,
        total_perdidos: perdidos,
        total_em_andamento: toNum(summaryRow?.total_em_andamento),
        receita_total_ganha: Number(toNum(summaryRow?.receita_total_ganha).toFixed(2)),
        valor_total_perdido: Number(toNum(summaryRow?.valor_total_perdido).toFixed(2)),
        ticket_medio: Number(toNum(summaryRow?.ticket_medio).toFixed(2)),
        taxa_conversao: taxaConversao,
        ciclo_medio_vendas_dias: Math.round(toNum(summaryRow?.ciclo_medio_dias)),
      },
      receita_por_mes: desempenhoPorMes,
      ganhos_vs_perdidos: {
        ganhos_quantidade: ganhos,
        perdidos_quantidade: perdidos,
        ganhos_valor: Number(toNum(summaryRow?.receita_total_ganha).toFixed(2)),
        perdidos_valor: Number(toNum(summaryRow?.valor_total_perdido).toFixed(2)),
      },
      funil_por_etapa: funilPorEtapa,
      ranking_vendedores: rankingVendedores,
    };
  },

  async getEquipeOverview(user: AuthenticatedUser) {
    if (user.role !== 'GESTOR') {
      throw new AppError('O módulo Equipe é exclusivo para gestores.', 403, 'FORBIDDEN');
    }

    const { rows: users } = await db.query<any>(
      `SELECT id, name, email, role, cargo, active, (password_hash IS NOT NULL) AS activated, created_at
       FROM users
       ORDER BY CASE WHEN role = 'GESTOR' THEN 0 ELSE 1 END, name ASC`
    );

    const now = new Date();
    const currentYear = now.getFullYear();

    const members = await Promise.all(
      users.map(async (u) => {
        const stats = await db.queryOne<any>(
          `SELECT
             COUNT(*)::int AS quantidade_negocios,
             COUNT(*) FILTER (WHERE status = 'EM_ANDAMENTO')::int AS em_andamento,
             COUNT(*) FILTER (WHERE status = 'GANHO')::int AS ganhos,
             COUNT(*) FILTER (WHERE status = 'PERDIDO')::int AS perdidos,
             COALESCE(SUM(valor) FILTER (WHERE status = 'GANHO'), 0) AS receita_realizada
           FROM negociacoes
           WHERE owner_id = $1`,
          [u.id]
        );

        const metaRow = await db.queryOne<{ total_meta: string }>(
          `SELECT COALESCE(SUM(valor_alvo), 0)::text AS total_meta
           FROM metas
           WHERE vendedor_id = $1 AND ano = $2`,
          [u.id, currentYear]
        );

        // Gráfico de tendência (últimos 6 meses)
        const tendencia: Array<{ mes: string; receita: number }> = [];
        const monthShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
          const mStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
          const mEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)).toISOString();
          const tRow = await db.queryOne<{ receita: string }>(
            `SELECT COALESCE(SUM(valor), 0)::text AS receita
             FROM negociacoes
             WHERE owner_id = $1
               AND status = 'GANHO'
               AND COALESCE(closed_date, updated_at) >= $2::timestamptz
               AND COALESCE(closed_date, updated_at) <= $3::timestamptz`,
            [u.id, mStart, mEnd]
          );
          tendencia.push({
            mes: `${monthShort[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(-2)}`,
            receita: Number(toNum(tRow?.receita).toFixed(2)),
          });
        }

        const ganhos = toNum(stats?.ganhos);
        const perdidos = toNum(stats?.perdidos);
        const enc = ganhos + perdidos;
        const receita = Number(toNum(stats?.receita_realizada).toFixed(2));
        const meta = Number(toNum(metaRow?.total_meta).toFixed(2));

        return {
          id: u.id,
          nome: u.name,
          email: u.email,
          role: u.role,
          cargo: u.cargo,
          active: u.active,
          activated: u.activated,
          receita_realizada: receita,
          meta,
          percentual_meta: meta > 0 ? Number(((receita / meta) * 100).toFixed(2)) : 0,
          taxa_conversao: enc > 0 ? Number(((ganhos / enc) * 100).toFixed(2)) : 0,
          quantidade_negocios: toNum(stats?.quantidade_negocios),
          em_andamento: toNum(stats?.em_andamento),
          ganhos,
          perdidos,
          grafico_tendencia: tendencia,
        };
      })
    );

    const activeSellers = members.filter((m) => m.role === 'VENDEDOR' && m.active);
    const receitaTotalEquipe = Number(
      members.reduce((acc, m) => acc + m.receita_realizada, 0).toFixed(2)
    );
    const metaTotalEquipe = Number(
      members.reduce((acc, m) => acc + m.meta, 0).toFixed(2)
    );
    const percentualEquipe =
      metaTotalEquipe > 0
        ? Number(((receitaTotalEquipe / metaTotalEquipe) * 100).toFixed(2))
        : 0;

    const ranking = [...members]
      .sort((a, b) => b.receita_realizada - a.receita_realizada)
      .map((m, i) => ({ ...m, posicao: i + 1 }));

    return {
      resumo: {
        quantidade_vendedores: activeSellers.length,
        total_integrantes: members.length,
        receita_total_equipe: receitaTotalEquipe,
        meta_total_equipe: metaTotalEquipe,
        percentual_atingido: percentualEquipe,
      },
      integrantes: members,
      ranking,
    };
  },

  async getVendedorDetalhe(user: AuthenticatedUser, sellerId: string) {
    if (user.role !== 'GESTOR') {
      throw new AppError('Apenas gestores podem consultar o painel detalhado da equipe.', 403, 'FORBIDDEN');
    }

    const seller = await db.queryOne<any>(
      `SELECT id, name, email, role, cargo, active, (password_hash IS NOT NULL) AS activated, created_at
       FROM users WHERE id = $1`,
      [sellerId]
    );
    if (!seller) {
      throw new AppError('Integrante não encontrado.', 404, 'USER_NOT_FOUND');
    }

    const { rows: negociacoes } = await db.query<any>(
      `SELECT
         n.*,
         c.empresa AS cliente_empresa,
         s.nome AS etapa_nome
       FROM negociacoes n
       INNER JOIN clientes c ON c.id = n.cliente_id
       INNER JOIN stages s ON s.id = n.etapa_id
       WHERE n.owner_id = $1
       ORDER BY n.updated_at DESC`,
      [sellerId]
    );

    const metas = await this.listMetas(user, { vendedorId: sellerId });

    return {
      vendedor: seller,
      negociacoes: negociacoes.map((n) => ({ ...n, valor: toNum(n.valor) })),
      metas,
    };
  },

  async createVendedor(user: AuthenticatedUser, data: any, ipAddress?: string) {
    if (user.role !== 'GESTOR') {
      throw new AppError('Apenas gestores podem cadastrar integrantes na equipe.', 403, 'FORBIDDEN');
    }

    const exists = await db.queryOne<{ id: string }>(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
      [data.email]
    );
    if (exists) {
      throw new AppError('Já existe um usuário cadastrado com este e-mail.', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const newUserId = crypto.randomUUID();
    const rawInviteToken = generateSecureToken(24);
    const tokenHash = hashTokenSha256(rawInviteToken);
    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000); // 72h para aceite do convite

    await db.withTransaction(async (tx) => {
      // Sem senha inicial previsível (Seção 10: "Não utilizar senhas iniciais previsíveis como quest26XX")
      await tx.query(
        `INSERT INTO users (id, name, email, password_hash, role, cargo, active, created_at, updated_at)
         VALUES ($1, $2, $3, NULL, $4::"UserRole", $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [newUserId, data.name, data.email, data.role || 'VENDEDOR', data.cargo]
      );

      await tx.query(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, purpose, expires_at, created_at)
         VALUES ($1, $2, $3, 'ACCOUNT_ACTIVATION', $4, CURRENT_TIMESTAMP)`,
        [crypto.randomUUID(), newUserId, tokenHash, expiresAt.toISOString()]
      );

      if (data.meta_mensal_opcional && Number(data.meta_mensal_opcional) > 0) {
        const now = new Date();
        const periodo =
          data.periodo_meta_opcional ||
          `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const [anoStr, mesStr] = periodo.split('-');
        await tx.query(
          `INSERT INTO metas
            (id, vendedor_id, tipo, periodo, ano, mes, valor_alvo, observacoes, created_at, updated_at)
           VALUES ($1, $2, 'MENSAL', $3, $4, $5, $6, 'Meta inicial definida no cadastro', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            crypto.randomUUID(),
            newUserId,
            periodo,
            parseInt(anoStr, 10) || now.getFullYear(),
            mesStr ? parseInt(mesStr, 10) : now.getMonth() + 1,
            Number(data.meta_mensal_opcional),
          ]
        );
      }
    });

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'VENDEDOR_CADASTRADO',
      entidade: 'users',
      entidadeId: newUserId,
      detalhes: `Integrante ${data.name} (${data.email}) cadastrado com convite de criação de senha.`,
      ipAddress,
    });

    const createdUser = await db.queryOne(
      `SELECT id, name, email, role, cargo, active, created_at FROM users WHERE id = $1`,
      [newUserId]
    );

    const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
    return {
      usuario: createdUser,
      convite: {
        purpose: 'ACCOUNT_ACTIVATION',
        expires_at: expiresAt.toISOString(),
        invite_token: !smtpConfigured ? rawInviteToken : null,
      },
    };
  },

  async updateVendedor(user: AuthenticatedUser, targetId: string, data: any, ipAddress?: string) {
    if (user.role !== 'GESTOR') {
      throw new AppError('Apenas gestores podem editar contas da equipe.', 403, 'FORBIDDEN');
    }

    const existing = await db.queryOne(`SELECT * FROM users WHERE id = $1`, [targetId]);
    if (!existing) {
      throw new AppError('Usuário não encontrado.', 404, 'USER_NOT_FOUND');
    }

    await db.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           cargo = COALESCE($3, cargo),
           role = COALESCE($4::"UserRole", role),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [data.name ?? null, data.email ?? null, data.cargo ?? null, data.role ?? null, targetId]
    );

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'VENDEDOR_ATUALIZADO',
      entidade: 'users',
      entidadeId: targetId,
      ipAddress,
    });

    return db.queryOne(
      `SELECT id, name, email, role, cargo, active, (password_hash IS NOT NULL) AS activated FROM users WHERE id = $1`,
      [targetId]
    );
  },

  async toggleVendedorStatus(
    user: AuthenticatedUser,
    targetId: string,
    active: boolean,
    ipAddress?: string
  ) {
    if (user.role !== 'GESTOR') {
      throw new AppError('Apenas gestores podem ativar ou desativar contas.', 403, 'FORBIDDEN');
    }
    if (targetId === user.id && !active) {
      throw new AppError('Você não pode desativar sua própria conta de gestor.', 400, 'SELF_DEACTIVATION');
    }

    await db.withTransaction(async (tx) => {
      await tx.query(
        `UPDATE users SET active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [active, targetId]
      );
      if (!active) {
        await tx.query(
          `UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL`,
          [targetId]
        );
      }
    });

    await recordAuditLog({
      usuarioId: user.id,
      acao: active ? 'CONTA_REATIVADA' : 'CONTA_DESATIVADA',
      entidade: 'users',
      entidadeId: targetId,
      ipAddress,
    });

    return db.queryOne(
      `SELECT id, name, email, role, cargo, active, (password_hash IS NOT NULL) AS activated FROM users WHERE id = $1`,
      [targetId]
    );
  },
};

