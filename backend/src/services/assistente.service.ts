import crypto from 'crypto';
import OpenAI from 'openai';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { AuthenticatedUser, recordAuditLog } from '../middlewares/auth.middleware.js';
import { AppError } from '../middlewares/error.middleware.js';
import { gestaoService } from './gestao.service.js';
import { crmService } from './crm.service.js';

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Ferramentas controladas de consulta ao sistema (A IA nunca acessa diretamente o PostgreSQL;
 * todas as ferramentas validam o perfil RBAC do usuário autenticado).
 */
export const assistenteTools = {
  async consultarPlaybookQuest(termo?: string) {
    const params: any[] = [];
    let where = '';
    if (termo && termo.trim().length > 2) {
      params.push(`%${termo.trim()}%`);
      where = `WHERE titulo ILIKE $1 OR subtitulo ILIKE $1 OR conteudo ILIKE $1 OR secao_titulo ILIKE $1`;
    }
    const { rows } = await db.query<any>(
      `SELECT secao_numero, secao_titulo, categoria, titulo, subtitulo, conteudo, criterios_avanco, responsaveis
       FROM playbook_conteudos
       ${where}
       ORDER BY secao_numero ASC, ordem ASC
       LIMIT 10`,
      params
    );
    return rows;
  },

  async consultarNegociacoesAutorizadas(user: AuthenticatedUser) {
    const pipeline = await crmService.getPipeline(user);
    // Retorna apenas campos necessários para fundamentar orientação comercial (sem dados desnecessários)
    return {
      resumo: pipeline.resumo,
      negociacoes_recentes: pipeline.negociacoes.slice(0, 12).map((n: any) => ({
        nome: n.nome,
        empresa: n.cliente_empresa,
        etapa: n.etapa_nome,
        valor_brl: n.valor,
        probabilidade: n.probabilidade,
        status: n.status,
        dias_na_etapa: n.tempo_na_etapa_dias,
        parado_mais_15_dias: n.parado_mais_15_dias,
        forecast_score: n.forecast_score,
        responsavel: n.owner_nome,
      })),
    };
  },

  async consultarMetasEResultadosAutorizados(user: AuthenticatedUser) {
    const overview = await gestaoService.getOverviewDashboard(user, {});
    const metas = await gestaoService.listMetas(user);
    return {
      kpis_atuais: overview.kpis,
      metas_ativas: metas.slice(0, 8).map((m: any) => ({
        periodo: m.periodo,
        tipo: m.tipo,
        vendedor: m.vendedor_nome || 'Equipe Quest',
        valor_alvo_brl: m.valor_alvo,
        valor_realizado_brl: m.valor_realizado,
        percentual_atingido: m.percentual_atingido,
        semaforo: m.cor_semaforo,
      })),
    };
  },
};

export const assistenteService = {
  async listConversas(user: AuthenticatedUser) {
    const { rows } = await db.query<any>(
      `SELECT
         c.*,
         (SELECT COUNT(*)::int FROM assistente_mensagens am WHERE am.conversa_id = c.id) AS total_mensagens
       FROM assistente_conversas c
       WHERE c.usuario_id = $1 AND c.arquivada = false
       ORDER BY c.updated_at DESC`,
      [user.id]
    );
    return rows.map((r) => ({
      ...r,
      custo_estimado_usd: toNum(r.custo_estimado_usd),
    }));
  },

  async createConversa(user: AuthenticatedUser, titulo?: string) {
    const id = crypto.randomUUID();
    const safeTitle = (titulo || 'Consulta ao Assistente Comercial Quest').trim();

    await db.query(
      `INSERT INTO assistente_conversas (id, usuario_id, titulo, total_tokens, custo_estimado_usd, arquivada, created_at, updated_at)
       VALUES ($1, $2, $3, 0, 0, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, user.id, safeTitle]
    );

    return db.queryOne(`SELECT * FROM assistente_conversas WHERE id = $1`, [id]);
  },

  async getConversaById(user: AuthenticatedUser, conversaId: string) {
    const conversa = await db.queryOne<any>(
      `SELECT * FROM assistente_conversas WHERE id = $1`,
      [conversaId]
    );
    if (!conversa) {
      throw new AppError('Conversa não encontrada.', 404, 'CONVERSA_NOT_FOUND');
    }

    // Histórico estritamente privado por usuário (Seção 13)
    if (conversa.usuario_id !== user.id) {
      throw new AppError(
        'Acesso negado. O histórico do Assistente Comercial Quest é privado por usuário.',
        403,
        'FORBIDDEN'
      );
    }

    const { rows: mensagens } = await db.query<any>(
      `SELECT * FROM assistente_mensagens WHERE conversa_id = $1 ORDER BY created_at ASC`,
      [conversaId]
    );

    return {
      ...conversa,
      custo_estimado_usd: toNum(conversa.custo_estimado_usd),
      mensagens,
    };
  },

  async deleteConversa(user: AuthenticatedUser, conversaId: string) {
    const conversa = await db.queryOne<any>(
      `SELECT id, usuario_id FROM assistente_conversas WHERE id = $1`,
      [conversaId]
    );
    if (!conversa) {
      throw new AppError('Conversa não encontrada.', 404, 'CONVERSA_NOT_FOUND');
    }
    if (conversa.usuario_id !== user.id) {
      throw new AppError('Acesso negado.', 403, 'FORBIDDEN');
    }

    await db.query(`DELETE FROM assistente_conversas WHERE id = $1`, [conversaId]);
    return { deleted: true };
  },

  async checkUserDailyTokenLimit(userId: string) {
    const row = await db.queryOne<{ tokens_hoje: string }>(
      `SELECT COALESCE(SUM(am.prompt_tokens + am.completion_tokens), 0)::text AS tokens_hoje
       FROM assistente_mensagens am
       INNER JOIN assistente_conversas ac ON ac.id = am.conversa_id
       WHERE ac.usuario_id = $1
         AND am.created_at >= CURRENT_DATE`,
      [userId]
    );

    const usedToday = parseInt(row?.tokens_hoje || '0', 10);
    if (usedToday >= env.AI_DAILY_TOKEN_LIMIT_PER_USER) {
      throw new AppError(
        `Limite diário de utilização de tokens (${env.AI_DAILY_TOKEN_LIMIT_PER_USER}) atingido para sua conta hoje.`,
        429,
        'DAILY_TOKEN_LIMIT_EXCEEDED'
      );
    }
    return usedToday;
  },

  async processUserMessage(
    user: AuthenticatedUser,
    conversaId: string,
    mensagemUsuario: string,
    onChunk?: (chunkText: string) => void
  ) {
    const conversa = await this.getConversaById(user, conversaId);
    await this.checkUserDailyTokenLimit(user.id);

    // 1. Persiste mensagem do usuário
    const userMsgId = crypto.randomUUID();
    await db.query(
      `INSERT INTO assistente_mensagens (id, conversa_id, role, conteudo, prompt_tokens, completion_tokens, created_at)
       VALUES ($1, $2, 'user', $3, 0, 0, CURRENT_TIMESTAMP)`,
      [userMsgId, conversaId, mensagemUsuario]
    );

    // 2. Recupera contexto controlado (Playbook + Negociações Autorizadas + Metas Autorizadas)
    const ferramentasUsadas: string[] = [
      'consultarPlaybookQuest',
      'consultarNegociacoesAutorizadas',
      'consultarMetasEResultadosAutorizados',
    ];

    const [playbookSnippets, dealsCtx, metasCtx] = await Promise.all([
      assistenteTools.consultarPlaybookQuest(),
      assistenteTools.consultarNegociacoesAutorizadas(user),
      assistenteTools.consultarMetasEResultadosAutorizados(user),
    ]);

    let respostaFinal = '';
    let promptTokens = Math.ceil(mensagemUsuario.length / 4) + 280;
    let completionTokens = 0;

    const systemPrompt = `Você é o **Assistente Comercial Quest**, especialista oficial em vendas B2B, Inbound, Consultoria Comercial, Advertising e Upselling da **Quest Comunicação Total**.
Usuário autenticado: ${user.name} (${user.cargo} — Perfil: ${user.role}).

DIRETRIZES OBRIGATÓRIAS:
1. Fundamente suas respostas no Playbook de Vendas Quest (5 etapas do Pipeline CRM: Prospecção, Qualificação, Proposta, Negociação, Fechamento; e 7 etapas do Pipeline Inbound: ICP & Sourcing até Fechamento & Kickoff).
2. Respeite os rituais oficiais da Quest:
   - Diário: Stand-up das 9h (3 perguntas) e Regra de Ouro (contato com lead novo em até 12h).
   - Semanal: WBR de pipeline (atenção a negócios parados > 15 dias) e Pitch Scoring.
   - Mensal: Forecast Meeting com 7-Point Scorecard (elegibilidade mínima score >= 6), Revisão de Metas e Feedback 360.
   - Trimestral: Planejamento Comercial e PDI.
3. Utilize exclusivamente os dados autorizados abaixo para responder sobre negociações, pipeline e metas. Nunca invente números financeiros.
4. Responda em português do Brasil, de forma executiva, estruturada e acionável.

DADOS AUTORIZADOS DO CRM PARA ESTE USUÁRIO:
- Resumo do Pipeline: ${JSON.stringify(dealsCtx.resumo)}
- Negociações Autorizadas: ${JSON.stringify(dealsCtx.negociacoes_recentes)}
- KPIs e Metas Autorizadas: ${JSON.stringify(metasCtx)}
- Estrutura Playbook Inbound: ${JSON.stringify(
      playbookSnippets.map((p: any) => ({
        secao: p.secao_titulo,
        titulo: p.titulo,
        criterios_avanco: p.criterios_avanco,
        conteudo: p.conteudo,
      }))
    )}`;

    let usedOpenAI = false;

    if (
      env.NODE_ENV !== 'test' &&
      env.OPENAI_API_KEY &&
      env.OPENAI_API_KEY.trim().length > 10
    ) {
      try {
        const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
        const historyMessages = conversa.mensagens.slice(-8).map((m: any) => ({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.conteudo,
        }));

        if (onChunk) {
          const stream = await openai.chat.completions.create({
            model: env.OPENAI_MODEL,
            max_tokens: env.AI_MAX_TOKENS_PER_RESPONSE,
            temperature: 0.3,
            stream: true,
            messages: [
              { role: 'system', content: systemPrompt },
              ...historyMessages,
              { role: 'user', content: mensagemUsuario },
            ],
          });

          for await (const part of stream) {
            const delta = part.choices[0]?.delta?.content || '';
            if (delta) {
              respostaFinal += delta;
              onChunk(delta);
            }
          }
          completionTokens = Math.ceil(respostaFinal.length / 4);
          usedOpenAI = true;
        } else {
          const completion = await openai.chat.completions.create({
            model: env.OPENAI_MODEL,
            max_tokens: env.AI_MAX_TOKENS_PER_RESPONSE,
            temperature: 0.3,
            messages: [
              { role: 'system', content: systemPrompt },
              ...historyMessages,
              { role: 'user', content: mensagemUsuario },
            ],
          });

          respostaFinal =
            completion.choices[0]?.message?.content ||
            'Não foi possível gerar uma resposta no momento.';
          promptTokens = completion.usage?.prompt_tokens ?? promptTokens;
          completionTokens =
            completion.usage?.completion_tokens ?? Math.ceil(respostaFinal.length / 4);
          usedOpenAI = true;
        }
      } catch {
        usedOpenAI = false;
      }
    }

    if (!usedOpenAI) {
      // Modo fundamentado nas ferramentas internas do backend quando OPENAI_API_KEY não está configurada ou indisponível
      const brl = (v: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

      const paradas = dealsCtx.negociacoes_recentes.filter((n: any) => n.parado_mais_15_dias);
      const elegiveis = dealsCtx.negociacoes_recentes.filter(
        (n: any) => n.forecast_score !== null && n.forecast_score >= 6
      );

      respostaFinal =
        `### Orientação do Assistente Comercial Quest\n\n` +
        `Olá, **${user.name}** (${user.cargo}). Consultei as ferramentas autorizadas do **Playbook de Vendas Quest** para fundamentar sua análise:\n\n` +
        `#### 1. Diagnóstico do seu Pipeline e Metas Autorizadas\n` +
        `- **Receita Realizada no Mês:** ${brl(metasCtx.kpis_atuais.receita_no_mes)} (Meta: ${brl(metasCtx.kpis_atuais.meta_vendas)} — **${metasCtx.kpis_atuais.percentual_meta_atingido}%** atingido)\n` +
        `- **Negociações Ativas em Andamento:** ${dealsCtx.resumo.em_andamento} oportunidade(s) somando **${brl(dealsCtx.resumo.valor_pipeline_ativo)}**\n` +
        `- **Taxa de Conversão Atual:** ${metasCtx.kpis_atuais.taxa_conversao}%\n` +
        `- **Alertas WBR (>15 dias parado):** ${paradas.length} negociação(ões)\n` +
        `- **Elegíveis ao Forecast (7-Point Scorecard ≥ 6):** ${elegiveis.length} negociação(ões)\n\n` +
        `#### 2. Diretrizes do Playbook Quest Aplicáveis\n` +
        `- **Pipeline CRM (5 Etapas):** *1. Prospecção → 2. Qualificação → 3. Proposta → 4. Negociação → 5. Fechamento*.\n` +
        `- **Pipeline Inbound (7 Etapas):** *1. ICP & Sourcing → 2. Primeiro Contato (Regra de Ouro 12h) → 3. Qualificação & Descoberta → 4. Diagnóstico Consultivo → 5. Proposta (Pitch dos 4 Atos) → 6. Negociação (7-Point Scorecard) → 7. Fechamento & Kickoff*.\n` +
        `- **Próximo Passo Recomendado:** Priorize os contatos pendentes da **Regra de Ouro (12h)**, atualize o **7-Point Scorecard** das oportunidades em *Proposta/Negociação* e registre a próxima atividade com data definida no card do Kanban.`;

      if (onChunk) {
        onChunk(respostaFinal);
      }
      completionTokens = Math.ceil(respostaFinal.length / 4);
    }

    const assistantMsgId = crypto.randomUUID();
    const totalTokensDelta = promptTokens + completionTokens;
    // Estimativa de custo baseada em gpt-4o-mini ($0.15 / 1M input, $0.60 / 1M output)
    const custoDeltaUsd = (promptTokens * 0.00000015) + (completionTokens * 0.0000006);

    await db.withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO assistente_mensagens
          (id, conversa_id, role, conteudo, prompt_tokens, completion_tokens, ferramentas_usadas, created_at)
         VALUES ($1, $2, 'assistant', $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [
          assistantMsgId,
          conversaId,
          respostaFinal,
          promptTokens,
          completionTokens,
          ferramentasUsadas.join(','),
        ]
      );

      // Atualiza título da conversa na primeira pergunta se ainda for o padrão
      const shouldUpdateTitle =
        conversa.mensagens.length === 0 &&
        conversa.titulo === 'Consulta ao Assistente Comercial Quest';
      const novoTitulo = shouldUpdateTitle
        ? mensagemUsuario.slice(0, 70)
        : conversa.titulo;

      await tx.query(
        `UPDATE assistente_conversas
         SET titulo = $1,
             total_tokens = total_tokens + $2,
             custo_estimado_usd = custo_estimado_usd + $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [novoTitulo, totalTokensDelta, custoDeltaUsd, conversaId]
      );
    });

    await recordAuditLog({
      usuarioId: user.id,
      acao: 'ASSISTENTE_IA_CONSULTA',
      entidade: 'assistente_conversas',
      entidadeId: conversaId,
      detalhes: `Tokens: ${totalTokensDelta}`,
    });

    return {
      conversa_id: conversaId,
      mensagem_usuario_id: userMsgId,
      mensagem_assistente: {
        id: assistantMsgId,
        conversa_id: conversaId,
        role: 'assistant',
        conteudo: respostaFinal,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        ferramentas_usadas: ferramentasUsadas,
        created_at: new Date().toISOString(),
      },
    };
  },
};
