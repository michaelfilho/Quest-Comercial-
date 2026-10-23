import crypto from 'crypto';
import { db, initDatabase } from '../src/config/database.js';
import { logger } from '../src/config/logger.js';

export async function seedDatabase(): Promise<void> {
  await initDatabase();

  // 1. Seed dos 4 usuários oficiais da Quest (SEM credenciais/senhas fixas no código — Seção 4 e 10)
  const initialUsers = [
    {
      name: 'André Maciel',
      email: 'andre.maciel@questcomunicacao.com.br',
      role: 'GESTOR',
      cargo: 'Gestor Comercial',
    },
    {
      name: 'Tiago Hilário',
      email: 'tiago.hilario@questcomunicacao.com.br',
      role: 'VENDEDOR',
      cargo: 'Vendas Inbound / Consultoria',
    },
    {
      name: 'Katia Gebran',
      email: 'katia.gebran@questcomunicacao.com.br',
      role: 'VENDEDOR',
      cargo: 'Vendas Advertising',
    },
    {
      name: 'Debora Nigro',
      email: 'debora.nigro@questcomunicacao.com.br',
      role: 'VENDEDOR',
      cargo: 'Vendas Ad/Upselling',
    },
  ];

  for (const u of initialUsers) {
    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [u.email]
    );
    if (!existing) {
      await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, cargo, active, created_at, updated_at)
         VALUES ($1, $2, $3, NULL, $4::"UserRole", $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [crypto.randomUUID(), u.name, u.email, u.role, u.cargo]
      );
    }
  }

  // 2. Seed das 5 etapas obrigatórias do Pipeline Comercial (Seção 7)
  const initialStages = [
    { nome: 'Prospecção', slug: 'prospeccao', ordem: 1, probabilidade_padrao: 15, cor: '#64748B' },
    { nome: 'Qualificação', slug: 'qualificacao', ordem: 2, probabilidade_padrao: 30, cor: '#3B82F6' },
    { nome: 'Proposta', slug: 'proposta', ordem: 3, probabilidade_padrao: 55, cor: '#F59E0B' },
    { nome: 'Negociação', slug: 'negociacao', ordem: 4, probabilidade_padrao: 75, cor: '#FF5A00' },
    { nome: 'Fechamento', slug: 'fechamento', ordem: 5, probabilidade_padrao: 95, cor: '#10B981' },
  ];

  for (const st of initialStages) {
    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM stages WHERE slug = $1 OR ordem = $2',
      [st.slug, st.ordem]
    );
    if (!existing) {
      await db.query(
        `INSERT INTO stages (id, nome, slug, ordem, probabilidade_padrao, cor, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [crypto.randomUUID(), st.nome, st.slug, st.ordem, st.probabilidade_padrao, st.cor]
      );
    }
  }

  // 3. Seed dos Rituais Comerciais Oficiais por Frequência (Seção 11)
  const initialRituais = [
    {
      codigo: 'DAILY_STANDUP_9H',
      nome: 'Stand-up Diário das 9h & Regra de Ouro (12h)',
      frequencia: 'DIARIO',
      descricao:
        'Reunião diária às 09h00 com as três perguntas de acompanhamento (1. O que avancei ontem? 2. O que farei hoje para destravar oportunidades? 3. Tenho algum bloqueio?) e verificação da Regra de Ouro: contato com lead novo em até 12 horas.',
      regras_alerta: 'LEAD_12H',
      horario_padrao: '09:00',
      ordem: 1,
    },
    {
      codigo: 'WEEKLY_WBR_PIPELINE',
      nome: 'WBR de Pipeline Semanal & Pitch Scoring',
      frequencia: 'SEMANAL',
      descricao:
        'Weekly Business Review de pipeline: identificação obrigatória de negócios parados há mais de 15 dias, avaliação de Pitch Scoring e definição de próximos passos acionáveis.',
      regras_alerta: 'STALLED_15D',
      horario_padrao: 'Segunda-feira 10:00',
      ordem: 1,
    },
    {
      codigo: 'MONTHLY_FORECAST_7POINT',
      nome: 'Forecast Meeting & 7-Point Scorecard',
      frequencia: 'MENSAL',
      descricao:
        'Reunião mensal de Forecast utilizando o 7-Point Scorecard. Apenas negociações com score mínimo igual ou superior a 6 são elegíveis para compor o Forecast oficial do mês.',
      regras_alerta: 'FORECAST_SCORE_6',
      horario_padrao: '1ª Semana do Mês',
      ordem: 1,
    },
    {
      codigo: 'MONTHLY_METAS_FEEDBACK360',
      nome: 'Revisão Mensal de Metas & Feedback 360',
      frequencia: 'MENSAL',
      descricao:
        'Análise mensal de atingimento de metas individuais e da equipe, indicadores de funil e rodada estruturada de Feedback 360.',
      regras_alerta: null,
      horario_padrao: 'Última Semana do Mês',
      ordem: 2,
    },
    {
      codigo: 'QUARTERLY_PLANEJAMENTO_PDI',
      nome: 'Planejamento Comercial Trimestral & PDI',
      frequencia: 'TRIMESTRAL',
      descricao:
        'Planejamento estratégico comercial do trimestre e revisão/acompanhamento do Plano de Desenvolvimento Individual (PDI) de cada integrante da equipe.',
      regras_alerta: null,
      horario_padrao: 'Início do Trimestre',
      ordem: 1,
    },
  ];

  for (const r of initialRituais) {
    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM rituais WHERE codigo = $1',
      [r.codigo]
    );
    if (!existing) {
      await db.query(
        `INSERT INTO rituais (id, codigo, nome, frequencia, descricao, regras_alerta, horario_padrao, ativo, ordem, created_at)
         VALUES ($1, $2, $3, $4::"RitualFrequencia", $5, $6, $7, true, $8, CURRENT_TIMESTAMP)`,
        [
          crypto.randomUUID(),
          r.codigo,
          r.nome,
          r.frequencia,
          r.descricao,
          r.regras_alerta,
          r.horario_padrao,
          r.ordem,
        ]
      );
    }
  }

  // 4. Seed estrutural das 7 Seções do Playbook Inbound (Seção 12 + Regra 9: sem inventar textos oficiais; pronto para importação literal do Playbook Inbound Rev03)
  const existingPlaybook = await db.queryOne<{ count: string }>(
    'SELECT COUNT(*)::text as count FROM playbook_conteudos'
  );
  if (!existingPlaybook || parseInt(existingPlaybook.count, 10) === 0) {
    const playbookBlocks = [
      // Seção 1: Visão Geral (Cliente, Consultoria Comercial, Quest)
      {
        secao_numero: 1,
        secao_slug: 'visao-geral',
        secao_titulo: '1. Visão Geral',
        categoria: 'PILAR_CLIENTE',
        titulo: 'Cliente',
        subtitulo: 'Visão Geral — Perspectiva do Cliente',
        conteudo:
          '[Estrutura oficial Playbook Inbound Rev03 — Bloco Cliente. Utilize o botão "Editar / Importar Texto Oficial Rev03" (perfil Gestor) para colar o texto literal do documento-mestre quando disponibilizado.]',
        etapa_ordem: null,
        criterios_avanco: null,
        responsaveis: 'Equipe Comercial Quest',
        copiavel: false,
        ordem: 1,
      },
      {
        secao_numero: 1,
        secao_slug: 'visao-geral',
        secao_titulo: '1. Visão Geral',
        categoria: 'PILAR_CONSULTORIA',
        titulo: 'Consultoria Comercial',
        subtitulo: 'Visão Geral — Papel da Consultoria Comercial',
        conteudo:
          '[Estrutura oficial Playbook Inbound Rev03 — Bloco Consultoria Comercial. Aguardando importação literal do documento Playbook Inbound Rev03 pelo Gestor.]',
        etapa_ordem: null,
        criterios_avanco: null,
        responsaveis: 'Vendas Inbound / Consultoria',
        copiavel: false,
        ordem: 2,
      },
      {
        secao_numero: 1,
        secao_slug: 'visao-geral',
        secao_titulo: '1. Visão Geral',
        categoria: 'PILAR_QUEST',
        titulo: 'Quest Comunicação Total',
        subtitulo: 'Visão Geral — Posicionamento e Entrega Quest',
        conteudo:
          '[Estrutura oficial Playbook Inbound Rev03 — Bloco Quest. Aguardando importação literal do documento Playbook Inbound Rev03 pelo Gestor.]',
        etapa_ordem: null,
        criterios_avanco: null,
        responsaveis: 'Quest Comunicação Total',
        copiavel: false,
        ordem: 3,
      },
      // Seção 2: Persona e Gatilhos
      {
        secao_numero: 2,
        secao_slug: 'persona-e-gatilhos',
        secao_titulo: '2. Persona e Gatilhos',
        categoria: 'PERSONA_GATILHOS',
        titulo: 'Perfil de Decisor (ICP) e Gatilhos de Compra',
        subtitulo: 'Mapeamento de dores, sinais de momento e critérios de priorização',
        conteudo:
          '[Estrutura oficial Playbook Inbound Rev03 — Persona e Gatilhos. Insira aqui os perfis de decisores, dores latentes e gatilhos de passagem mapeados no documento oficial Rev03.]',
        etapa_ordem: null,
        criterios_avanco: 'Identificação de perfil aderente ao ICP e pelo menos um gatilho ativo.',
        responsaveis: 'Tiago Hilário / Gestor Comercial',
        copiavel: false,
        ordem: 1,
      },
      // Seção 3: Pipeline Inbound de 7 Etapas (ICP & Sourcing até Fechamento & Kickoff)
      {
        secao_numero: 3,
        secao_slug: 'pipeline-inbound-7-etapas',
        secao_titulo: '3. Pipeline Inbound de Sete Etapas',
        categoria: 'ETAPA_INBOUND',
        titulo: 'Etapa 1 — ICP & Sourcing (Validação Radar)',
        subtitulo: 'Início do funil Inbound & Consultoria',
        conteudo:
          '[Etapa 1 do Pipeline Inbound de 7 etapas — ICP & Sourcing. Documento-mestre: Playbook Inbound Rev03.]',
        etapa_ordem: 1,
        criterios_avanco: 'Empresa validada nos critérios de ICP no Radar Quest e dados de contato verificados.',
        responsaveis: 'Sourcing / Vendas Inbound',
        copiavel: false,
        ordem: 1,
      },
      {
        secao_numero: 3,
        secao_slug: 'pipeline-inbound-7-etapas',
        secao_titulo: '3. Pipeline Inbound de Sete Etapas',
        categoria: 'ETAPA_INBOUND',
        titulo: 'Etapa 2 — Primeiro Contato & Abordagem (Regra 12h)',
        subtitulo: 'Atendimento em até 12 horas e abertura de relacionamento',
        conteudo:
          '[Etapa 2 do Pipeline Inbound de 7 etapas — Primeiro Contato & Abordagem. Documento-mestre: Playbook Inbound Rev03.]',
        etapa_ordem: 2,
        criterios_avanco: 'Contato efetivo realizado em até 12h e interesse no agendamento confirmado.',
        responsaveis: 'Tiago Hilário — Vendas Inbound / Consultoria',
        copiavel: false,
        ordem: 2,
      },
      {
        secao_numero: 3,
        secao_slug: 'pipeline-inbound-7-etapas',
        secao_titulo: '3. Pipeline Inbound de Sete Etapas',
        categoria: 'ETAPA_INBOUND',
        titulo: 'Etapa 3 — Qualificação & Descoberta',
        subtitulo: 'Levantamento de cenário, desafios e capacidade de investimento',
        conteudo:
          '[Etapa 3 do Pipeline Inbound de 7 etapas — Qualificação & Descoberta. Documento-mestre: Playbook Inbound Rev03.]',
        etapa_ordem: 3,
        criterios_avanco: 'Perguntas de qualificação respondidas, dor validada e decisor envolvido.',
        responsaveis: 'Tiago Hilário — Vendas Inbound / Consultoria',
        copiavel: false,
        ordem: 3,
      },
      {
        secao_numero: 3,
        secao_slug: 'pipeline-inbound-7-etapas',
        secao_titulo: '3. Pipeline Inbound de Sete Etapas',
        categoria: 'ETAPA_INBOUND',
        titulo: 'Etapa 4 — Diagnóstico Consultivo',
        subtitulo: 'Apresentação de diagnóstico e aceite de aprofundamento',
        conteudo:
          '[Etapa 4 do Pipeline Inbound de 7 etapas — Diagnóstico Consultivo. Documento-mestre: Playbook Inbound Rev03.]',
        etapa_ordem: 4,
        criterios_avanco: 'Taxa de aceite de diagnóstico confirmada e escopo técnico alinhado.',
        responsaveis: 'Tiago Hilário — Vendas Inbound / Consultoria',
        copiavel: false,
        ordem: 4,
      },
      {
        secao_numero: 3,
        secao_slug: 'pipeline-inbound-7-etapas',
        secao_titulo: '3. Pipeline Inbound de Sete Etapas',
        categoria: 'ETAPA_INBOUND',
        titulo: 'Etapa 5 — Construção & Apresentação de Proposta',
        subtitulo: 'Condução do Pitch dos Quatro Atos e entrega de valor',
        conteudo:
          '[Etapa 5 do Pipeline Inbound de 7 etapas — Proposta Comercial. Documento-mestre: Playbook Inbound Rev03.]',
        etapa_ordem: 5,
        criterios_avanco: 'Proposta apresentada ao Vivo aos decisores com data de retorno agendada.',
        responsaveis: 'Tiago Hilário / André Maciel',
        copiavel: false,
        ordem: 5,
      },
      {
        secao_numero: 3,
        secao_slug: 'pipeline-inbound-7-etapas',
        secao_titulo: '3. Pipeline Inbound de Sete Etapas',
        categoria: 'ETAPA_INBOUND',
        titulo: 'Etapa 6 — Negociação & Contorno de Objeções',
        subtitulo: 'Alinhamento de condições comerciais, escopo e 7-Point Scorecard',
        conteudo:
          '[Etapa 6 do Pipeline Inbound de 7 etapas — Negociação. Documento-mestre: Playbook Inbound Rev03.]',
        etapa_ordem: 6,
        criterios_avanco: 'Condições comerciais aprovadas e minuta validada.',
        responsaveis: 'Tiago Hilário / André Maciel',
        copiavel: false,
        ordem: 6,
      },
      {
        secao_numero: 3,
        secao_slug: 'pipeline-inbound-7-etapas',
        secao_titulo: '3. Pipeline Inbound de Sete Etapas',
        categoria: 'ETAPA_INBOUND',
        titulo: 'Etapa 7 — Fechamento & Kickoff',
        subtitulo: 'Assinatura de contrato e passagem de bastão para operações',
        conteudo:
          '[Etapa 7 do Pipeline Inbound de 7 etapas — Fechamento & Kickoff. Documento-mestre: Playbook Inbound Rev03.]',
        etapa_ordem: 7,
        criterios_avanco: 'Contrato assinado, negócio marcado como GANHO no CRM e reunião de Kickoff agendada.',
        responsaveis: 'Vendas Inbound + Operações Quest',
        copiavel: false,
        ordem: 7,
      },
      // Seção 4: Mapa de Evolução
      {
        secao_numero: 4,
        secao_slug: 'mapa-de-evolucao',
        secao_titulo: '4. Mapa de Evolução',
        categoria: 'MAPA_EVOLUCAO',
        titulo: 'Jornada de Maturidade e Evolução do Cliente (Ciclo 1, Ciclo 2 e Upselling)',
        subtitulo: 'Transição entre Consultoria, Inbound e expansão de escopo',
        conteudo:
          '[Estrutura oficial Playbook Inbound Rev03 — Mapa de Evolução. Descreve a progressão de Ciclo 1, Ciclo 2 e expansão de conta na Quest Comunicação Total. Aguardando importação literal do documento Rev03.]',
        etapa_ordem: null,
        criterios_avanco: 'Conclusão dos entregáveis do Ciclo 1 e validação de expansão para o Ciclo 2.',
        responsaveis: 'Vendas Inbound / Consultoria & Upselling',
        copiavel: false,
        ordem: 1,
      },
      // Seção 5: Script Comercial Completo
      {
        secao_numero: 5,
        secao_slug: 'script-comercial-completo',
        secao_titulo: '5. Script Comercial Completo',
        categoria: 'PERGUNTAS_QUALIFICACAO',
        titulo: 'Perguntas de Qualificação',
        subtitulo: 'Roteiro oficial para diagnóstico e qualificação de leads Inbound',
        conteudo:
          '[Insira aqui as Perguntas de Qualificação literais do documento Playbook Inbound Rev03. Botão Copiar habilitado para uso imediato pelos vendedores durante chamadas.]',
        etapa_ordem: null,
        criterios_avanco: null,
        responsaveis: 'Vendas Inbound / Consultoria',
        copiavel: true,
        ordem: 1,
      },
      {
        secao_numero: 5,
        secao_slug: 'script-comercial-completo',
        secao_titulo: '5. Script Comercial Completo',
        categoria: 'PITCH_QUATRO_ATOS',
        titulo: 'Pitch dos Quatro Atos',
        subtitulo: 'Ato 1: Contexto | Ato 2: Diagnóstico | Ato 3: Solução Quest | Ato 4: Próximo Passo',
        conteudo:
          '[Insira aqui o roteiro literal do Pitch dos Quatro Atos conforme o Playbook Inbound Rev03.]',
        etapa_ordem: null,
        criterios_avanco: null,
        responsaveis: 'Vendas Inbound / Consultoria',
        copiavel: true,
        ordem: 2,
      },
      {
        secao_numero: 5,
        secao_slug: 'script-comercial-completo',
        secao_titulo: '5. Script Comercial Completo',
        categoria: 'OBJECOES_COMERCIAIS',
        titulo: 'Matriz de Objeções Comerciais',
        subtitulo: 'Respostas oficiais para objeções de preço, timing, concorrente e prioridade',
        conteudo:
          '[Insira aqui as objeções comerciais e argumentos oficiais do Playbook Inbound Rev03.]',
        etapa_ordem: null,
        criterios_avanco: null,
        responsaveis: 'Equipe Comercial Quest',
        copiavel: true,
        ordem: 3,
      },
      {
        secao_numero: 5,
        secao_slug: 'script-comercial-completo',
        secao_titulo: '5. Script Comercial Completo',
        categoria: 'TECNICAS_FECHAMENTO',
        titulo: 'Técnicas de Fechamento',
        subtitulo: 'Abordagens de comprometimento e decisão',
        conteudo:
          '[Insira aqui as Técnicas de Fechamento oficiais do documento Playbook Inbound Rev03.]',
        etapa_ordem: null,
        criterios_avanco: null,
        responsaveis: 'Equipe Comercial Quest',
        copiavel: true,
        ordem: 4,
      },
      // Seção 6: Templates de Follow-up (E-mail e WhatsApp)
      {
        secao_numero: 6,
        secao_slug: 'templates-de-follow-up',
        secao_titulo: '6. Templates de Follow-up',
        categoria: 'TEMPLATE_EMAIL',
        titulo: 'Templates Oficiais de E-mail (Abordagem, Pós-Diagnóstico e Proposta)',
        subtitulo: 'Modelos prontos para copiar com 1 clique',
        conteudo:
          '[Insira aqui os Templates de E-mail literais do documento Playbook Inbound Rev03.]',
        etapa_ordem: null,
        criterios_avanco: null,
        responsaveis: 'Vendas Inbound / Consultoria',
        copiavel: true,
        ordem: 1,
      },
      {
        secao_numero: 6,
        secao_slug: 'templates-de-follow-up',
        secao_titulo: '6. Templates de Follow-up',
        categoria: 'TEMPLATE_WHATSAPP',
        titulo: 'Templates Oficiais de WhatsApp (1º Contato 12h, Lembrete de Reunião e Follow-up)',
        subtitulo: 'Mensagens rápidas para copiar com 1 clique',
        conteudo:
          '[Insira aqui os Templates de WhatsApp literais do documento Playbook Inbound Rev03.]',
        etapa_ordem: null,
        criterios_avanco: null,
        responsaveis: 'Vendas Inbound / Consultoria',
        copiavel: true,
        ordem: 2,
      },
      // Seção 7: Anexos
      {
        secao_numero: 7,
        secao_slug: 'anexos',
        secao_titulo: '7. Anexos',
        categoria: 'ANEXOS_CHECKLISTS',
        titulo: 'Anexos, Checklists Operacionais e Materiais de Apoio (Rev03)',
        subtitulo: 'Documentos complementares do Playbook Inbound Quest',
        conteudo:
          '[Insira aqui os links, checklists de passagem de bastão e anexos oficiais do Playbook Inbound Rev03.]',
        etapa_ordem: null,
        criterios_avanco: null,
        responsaveis: 'Gestão Comercial Quest',
        copiavel: false,
        ordem: 1,
      },
    ];

    for (const b of playbookBlocks) {
      await db.query(
        `INSERT INTO playbook_conteudos
          (id, secao_numero, secao_slug, secao_titulo, categoria, titulo, subtitulo, conteudo, etapa_ordem, criterios_avanco, responsaveis, copiavel, oficial_importado, ordem, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, $13, CURRENT_TIMESTAMP)`,
        [
          crypto.randomUUID(),
          b.secao_numero,
          b.secao_slug,
          b.secao_titulo,
          b.categoria,
          b.titulo,
          b.subtitulo,
          b.conteudo,
          b.etapa_ordem,
          b.criterios_avanco,
          b.responsaveis,
          b.copiavel,
          b.ordem,
        ]
      );
    }
  }

  logger.info('Seed seguro concluído: 4 usuários iniciais, 5 etapas do pipeline, rituais e estrutura Playbook Inbound.');
}

// Execução direta via CLI: npm run db:seed
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then(async () => {
      await db.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Erro ao executar seed:', err);
      await db.close();
      process.exit(1);
    });
}

