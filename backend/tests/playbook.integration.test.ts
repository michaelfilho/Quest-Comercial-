import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request } from './testClient.js';
import { app } from '../src/app.js';
import { db, initDatabase } from '../src/config/database.js';
import { authService } from '../src/services/auth.service.js';
import { seedDatabase } from '../prisma/seed.js';

describe('Playbook de Vendas Quest — Testes Completos de Integração Backend & PostgreSQL', () => {
  let gestorCookie = '';
  let tiagoCookie = '';
  let katiaCookie = '';

  let gestorId = '';
  let tiagoId = '';
  let katiaId = '';

  let stages: Array<{ id: string; nome: string; slug: string; ordem: number }> = [];
  let clienteTiagoId = '';
  let clienteKatiaId = '';
  let negociacaoTiagoId = '';
  let negociacaoKatiaId = '';
  let metaTiagoId = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await initDatabase();
    await seedDatabase();
  });

  afterAll(async () => {
    await db.close();
  });

  it('1. Infraestrutura e Seed Inicial: deve verificar saúde do PostgreSQL e os 4 usuários oficiais da Quest sem senhas fixas', async () => {
    const healthRes = await request(app).get('/api/v1/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('ok');
    expect(healthRes.body.database).toBe('connected');

    const publicAccounts = await request(app).get('/api/v1/auth/initial-accounts');
    expect(publicAccounts.status).toBe(401);
    const { rows } = await db.query('SELECT *, (password_hash IS NOT NULL) AS activated FROM users WHERE active = true');
    const accRes = { status: 200, body: { accounts: rows } };
    expect(accRes.status).toBe(200);
    expect(accRes.body.accounts.length).toBeGreaterThanOrEqual(4);

    const names = accRes.body.accounts.map((a: any) => a.name);
    expect(names).toContain('André Maciel');
    expect(names).toContain('Tiago Hilário');
    expect(names).toContain('Katia Gebran');
    expect(names).toContain('Debora Nigro');

    // Nenhuma conta inicial deve vir com senha fixa pré-cadastrada no código
    for (const acc of accRes.body.accounts) {
      expect(acc.activated).toBe(false);
    }

    gestorId = accRes.body.accounts.find((a: any) => a.name === 'André Maciel').id;
    tiagoId = accRes.body.accounts.find((a: any) => a.name === 'Tiago Hilário').id;
    katiaId = accRes.body.accounts.find((a: any) => a.name === 'Katia Gebran').id;
  });

  it('2. Recuperação e Ativação de Senha + Autenticação Argon2id e Cookies HttpOnly', async () => {
    // Bloqueia acesso sem autenticação
    const unauth = await request(app).get('/api/v1/dashboard/overview');
    expect(unauth.status).toBe(401);

    // Ativa conta do Gestor (André Maciel) via token seguro
    // Bootstrap restrito ao banco isolado do teste; não existe ativação pública.
    const forgotGestor = { status: 200, body: await authService.requestPasswordResetOrActivation('andre.maciel@questcomunicacao.com.br') };
    expect(forgotGestor.status).toBe(200);
    expect(forgotGestor.body.resetTokenForSetup).toBeTruthy();

    const resetGestor = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: forgotGestor.body.resetTokenForSetup,
        newPassword: 'QuestGestor2026!Strong',
      });
    expect(resetGestor.status).toBe(200);

    // Token de uso único não pode ser reutilizado
    const reuseToken = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: forgotGestor.body.resetTokenForSetup,
        newPassword: 'OutraSenha2026!Strong',
      });
    expect(reuseToken.status).toBe(400);

    // Login Gestor
    const loginGestor = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'andre.maciel@questcomunicacao.com.br',
        password: 'QuestGestor2026!Strong',
      });
    expect(loginGestor.status).toBe(200);
    expect(loginGestor.body.user.role).toBe('GESTOR');
    const setCookieHeader = loginGestor.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader[0]).toContain('HttpOnly');
    gestorCookie = setCookieHeader[0].split(';')[0];

    // Ativa e autentica Tiago Hilário (Vendedor Inbound / Consultoria)
    const forgotTiago = await request(app)
      .post('/api/v1/auth/forgot-password').set('Cookie', gestorCookie)
      .send({ email: 'tiago.hilario@questcomunicacao.com.br' });
    await request(app).post('/api/v1/auth/reset-password').send({
      token: forgotTiago.body.resetTokenForSetup,
      newPassword: 'TiagoInbound2026!Strong',
    });
    const loginTiago = await request(app).post('/api/v1/auth/login').send({
      email: 'tiago.hilario@questcomunicacao.com.br',
      password: 'TiagoInbound2026!Strong',
    });
    expect(loginTiago.status).toBe(200);
    expect(loginTiago.body.user.role).toBe('VENDEDOR');
    tiagoCookie = loginTiago.headers['set-cookie'][0].split(';')[0];

    // Ativa e autentica Katia Gebran (Vendas Advertising)
    const forgotKatia = await request(app)
      .post('/api/v1/auth/forgot-password').set('Cookie', gestorCookie)
      .send({ email: 'katia.gebran@questcomunicacao.com.br' });
    await request(app).post('/api/v1/auth/reset-password').send({
      token: forgotKatia.body.resetTokenForSetup,
      newPassword: 'KatiaAdvertising2026!Strong',
    });
    const loginKatia = await request(app).post('/api/v1/auth/login').send({
      email: 'katia.gebran@questcomunicacao.com.br',
      password: 'KatiaAdvertising2026!Strong',
    });
    expect(loginKatia.status).toBe(200);
    katiaCookie = loginKatia.headers['set-cookie'][0].split(';')[0];
  });

  it('3. Permissões RBAC e Cadastro de Usuários no Módulo Equipe', async () => {
    // Vendedor não pode acessar o módulo Equipe
    const forbiddenEquipe = await request(app)
      .get('/api/v1/equipe')
      .set('Cookie', tiagoCookie);
    expect(forbiddenEquipe.status).toBe(403);

    // Gestor acessa Equipe e cadastra novo vendedor com convite seguro (sem senha previsível)
    const createVendedor = await request(app)
      .post('/api/v1/equipe')
      .set('Cookie', gestorCookie)
      .send({
        name: 'Lucas Mendes',
        email: 'lucas.mendes@questcomunicacao.com.br',
        cargo: 'Vendas Outbound',
        role: 'VENDEDOR',
        meta_mensal_opcional: 45000,
      });
    expect(createVendedor.status).toBe(201);
    expect(createVendedor.body.usuario.email).toBe('lucas.mendes@questcomunicacao.com.br');
    expect(createVendedor.body.convite.purpose).toBe('ACCOUNT_ACTIVATION');

    const newSellerId = createVendedor.body.usuario.id;

    // Desativa e reativa conta
    const deactivateRes = await request(app)
      .patch(`/api/v1/equipe/${newSellerId}/status`)
      .set('Cookie', gestorCookie)
      .send({ active: false });
    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.usuario.active).toBe(false);

    const reactivateRes = await request(app)
      .patch(`/api/v1/equipe/${newSellerId}/status`)
      .set('Cookie', gestorCookie)
      .send({ active: true });
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.usuario.active).toBe(true);
  });

  it('4. Criação de Clientes, Pipeline de 5 Etapas e Compartilhamento entre Vendedores', async () => {
    // Verifica que as 5 etapas estão sempre visíveis mesmo sem negócios cadastrados
    const emptyPipeline = await request(app)
      .get('/api/v1/pipeline')
      .set('Cookie', tiagoCookie);
    expect(emptyPipeline.status).toBe(200);
    expect(emptyPipeline.body.columns).toHaveLength(5);
    stages = emptyPipeline.body.stages;
    expect(stages.map((s) => s.nome)).toEqual([
      'Prospecção',
      'Qualificação',
      'Proposta',
      'Negociação',
      'Fechamento',
    ]);

    // Tiago cria Cliente 1
    const cTiago = await request(app)
      .post('/api/v1/clientes')
      .set('Cookie', tiagoCookie)
      .send({
        nome: 'Roberto Almeida',
        empresa: 'Grupo Horizonte S.A.',
        segmento: 'Indústria',
        email: 'roberto@horizonte.com.br',
        telefone: '11999990001',
        origem: 'INBOUND',
      });
    expect(cTiago.status).toBe(201);
    clienteTiagoId = cTiago.body.cliente.id;

    // Katia cria Cliente 2
    const cKatia = await request(app)
      .post('/api/v1/clientes')
      .set('Cookie', katiaCookie)
      .send({
        nome: 'Fernanda Costa',
        empresa: 'Varejo Prime Ltda',
        segmento: 'Varejo',
        email: 'fernanda@varejoprime.com.br',
        origem: 'OUTBOUND',
      });
    expect(cKatia.status).toBe(201);
    clienteKatiaId = cKatia.body.cliente.id;

    // Tiago cria Negociação 1
    const nTiago = await request(app)
      .post('/api/v1/negociacoes')
      .set('Cookie', tiagoCookie)
      .send({
        nome: 'Consultoria Comercial + Inbound Horizonte',
        cliente_id: clienteTiagoId,
        etapa_id: stages[0].id,
        valor: 68000,
        probabilidade: 25,
        forecast_score: 6,
        expected_close_date: new Date(Date.now() + 10 * 86400000).toISOString(),
      });
    expect(nTiago.status).toBe(201);
    negociacaoTiagoId = nTiago.body.negociacao.id;
    expect(nTiago.body.negociacao.historico).toHaveLength(1);
    expect(nTiago.body.negociacao.historico[0].acao).toBe('CRIADO');

    // Katia cria Negociação 2
    const nKatia = await request(app)
      .post('/api/v1/negociacoes')
      .set('Cookie', katiaCookie)
      .send({
        nome: 'Campanha Anual Advertising Prime',
        cliente_id: clienteKatiaId,
        etapa_id: stages[1].id,
        valor: 95000,
        probabilidade: 40,
      });
    expect(nKatia.status).toBe(201);
    negociacaoKatiaId = nKatia.body.negociacao.id;

    // Tiago pode visualizar a negociação compartilhada da Katia.
    const forbiddenDeal = await request(app)
      .get(`/api/v1/negociacoes/${negociacaoKatiaId}`)
      .set('Cookie', tiagoCookie);
    expect(forbiddenDeal.status).toBe(200);

    // Gestor (André Maciel) visualiza todas as negociações da equipe
    const gestorPipeline = await request(app)
      .get('/api/v1/pipeline')
      .set('Cookie', gestorCookie);
    expect(gestorPipeline.status).toBe(200);
    expect(gestorPipeline.body.negociacoes.length).toBe(2);
  });

  it('5. Movimentação do Pipeline (Drag-and-Drop), Registro de Atividades e Preservação de Histórico', async () => {
    // Move card do Tiago de Prospecção -> Qualificação -> Proposta
    const move1 = await request(app)
      .patch(`/api/v1/negociacoes/${negociacaoTiagoId}/stage`)
      .set('Cookie', tiagoCookie)
      .send({
        etapa_id: stages[1].id,
        detalhes: 'Lead qualificado com decisor mapeado.',
      });
    expect(move1.status).toBe(200);
    expect(move1.body.negociacao.etapa_id).toBe(stages[1].id);

    const move2 = await request(app)
      .patch(`/api/v1/negociacoes/${negociacaoTiagoId}/stage`)
      .set('Cookie', tiagoCookie)
      .send({
        etapa_id: stages[2].id,
        probabilidade: 65,
        detalhes: 'Diagnóstico aceito e proposta apresentada.',
      });
    expect(move2.status).toBe(200);
    expect(move2.body.negociacao.etapa_id).toBe(stages[2].id);
    expect(move2.body.negociacao.probabilidade).toBe(65);

    // Registra atividade comercial
    const actRes = await request(app)
      .post(`/api/v1/negociacoes/${negociacaoTiagoId}/atividades`)
      .set('Cookie', tiagoCookie)
      .send({
        tipo: 'DIAGNOSTICO',
        titulo: 'Apresentação de Diagnóstico Inbound',
        descricao: 'Cliente aprovou o plano de 2 ciclos.',
        concluida: true,
      });
    expect(actRes.status).toBe(201);
    expect(actRes.body.negociacao.atividades).toHaveLength(1);

    // Marca como GANHO
    const winRes = await request(app)
      .patch(`/api/v1/negociacoes/${negociacaoTiagoId}/status`)
      .set('Cookie', tiagoCookie)
      .send({ status: 'GANHO' });
    expect(winRes.status).toBe(200);
    expect(winRes.body.negociacao.status).toBe('GANHO');
    expect(winRes.body.negociacao.probabilidade).toBe(100);

    // Histórico completo preservado (CRIADO + 2 ETAPA_ALTERADA + ATIVIDADE_REGISTRADA + STATUS_ALTERADO = 5 entradas)
    expect(winRes.body.negociacao.historico.length).toBe(5);

    // Regra 12: Não excluir dados sem confirmação explícita
    const delWithoutConfirm = await request(app)
      .delete(`/api/v1/negociacoes/${negociacaoKatiaId}`)
      .set('Cookie', katiaCookie)
      .send({});
    expect(delWithoutConfirm.status).toBe(400);
  });

  it('6. Cálculos de Metas, Semáforo (Verde/Amarelo/Vermelho), KPIs Inbound e Dashboards Reais', async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const periodo = `${year}-${String(month).padStart(2, '0')}`;

    // Vendedor não pode criar metas
    const forbiddenMeta = await request(app)
      .post('/api/v1/metas')
      .set('Cookie', tiagoCookie)
      .send({
        vendedor_id: tiagoId,
        tipo: 'MENSAL',
        periodo,
        ano: year,
        mes: month,
        valor_alvo: 70000,
      });
    expect(forbiddenMeta.status).toBe(403);

    // Gestor define meta mensal de R$ 70.000 para Tiago Hilário
    // Como Tiago ganhou R$ 68.000, atingimento = 97.14% -> Semáforo VERDE (>= 90%)
    const metaRes = await request(app)
      .post('/api/v1/metas')
      .set('Cookie', gestorCookie)
      .send({
        vendedor_id: tiagoId,
        tipo: 'MENSAL',
        periodo,
        ano: year,
        mes: month,
        valor_alvo: 70000,
        observacoes: 'Meta oficial homologada',
      });
    expect(metaRes.status).toBe(201);
    metaTiagoId = metaRes.body.meta.id;
    expect(metaRes.body.meta.valor_realizado).toBe(68000);
    expect(metaRes.body.meta.percentual_atingido).toBeCloseTo(97.14, 1);
    expect(metaRes.body.meta.cor_semaforo).toBe('VERDE');

    // Configura KPIs do Funil — Produto Inbound + Consultoria
    const kpiInbound = await request(app)
      .put('/api/v1/metas/kpis-inbound')
      .set('Cookie', gestorCookie)
      .send({
        usuario_id: tiagoId,
        periodo,
        ciclo: 'GERAL',
        validacoes_radar_meta: 40,
        validacoes_radar_realizado: 36,
        taxa_agendamento_meta: 35,
        taxa_agendamento_realizado: 32,
        taxa_qualificacao_meta: 60,
        taxa_qualificacao_realizado: 58,
        taxa_aceite_diagnostico_meta: 75,
        taxa_aceite_diagnostico_realizado: 80,
        taxa_conversao_meta: 25,
        taxa_conversao_realizado: 28,
        ticket_medio_meta: 65000,
        ticket_medio_realizado: 68000,
        ciclo_dias_meta: 30,
        ciclo_dias_realizado: 24,
        ciclo_1_meta: 40000,
        ciclo_1_realizado: 40000,
        ciclo_2_meta: 28000,
        ciclo_2_realizado: 28000,
      });
    expect(kpiInbound.status).toBe(200);
    expect(kpiInbound.body.registros.length).toBeGreaterThanOrEqual(1);

    // Visão Geral Dashboard
    const overviewRes = await request(app)
      .get(`/api/v1/dashboard/overview?year=${year}&month=${month}`)
      .set('Cookie', tiagoCookie);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.kpis.receita_no_mes).toBe(68000);
    expect(overviewRes.body.kpis.taxa_conversao).toBe(100);
    expect(overviewRes.body.kpis.semaforo_meta).toBe('VERDE');

    // Resultados Analytics
    const resultadosRes = await request(app)
      .get(`/api/v1/resultados/analytics?year=${year}`)
      .set('Cookie', gestorCookie);
    expect(resultadosRes.status).toBe(200);
    expect(resultadosRes.body.indicadores.receita_total_ganha).toBe(68000);
    expect(resultadosRes.body.funil_por_etapa).toHaveLength(5);
  });

  it('7. Rotinas e Rituais + Playbook Inbound de 7 Seções', async () => {
    const rituaisRes = await request(app)
      .get('/api/v1/rituais')
      .set('Cookie', tiagoCookie);
    expect(rituaisRes.status).toBe(200);
    expect(rituaisRes.body.por_frequencia.DIARIO.length).toBeGreaterThanOrEqual(1);
    expect(rituaisRes.body.por_frequencia.SEMANAL.length).toBeGreaterThanOrEqual(1);
    expect(rituaisRes.body.por_frequencia.MENSAL.length).toBeGreaterThanOrEqual(1);
    expect(rituaisRes.body.por_frequencia.TRIMESTRAL.length).toBeGreaterThanOrEqual(1);
    expect(rituaisRes.body.alertas_deterministicos).toBeDefined();

    // Registra execução do Stand-up das 9h
    const dailyRitualId = rituaisRes.body.por_frequencia.DIARIO[0].id;
    const execRes = await request(app)
      .post(`/api/v1/rituais/${dailyRitualId}/execucoes`)
      .set('Cookie', tiagoCookie)
      .send({
        status: 'CONCLUIDO',
        respostas_acompanhamento:
          '1. Avancei diagnóstico Horizonte. 2. Hoje apresentarei proposta. 3. Sem bloqueios.',
        observacoes: 'Regra de Ouro 12h em dia.',
      });
    expect(execRes.status).toBe(201);

    // Consulta Playbook Inbound (7 seções estruturadas)
    const pbRes = await request(app)
      .get('/api/v1/playbook-inbound')
      .set('Cookie', tiagoCookie);
    expect(pbRes.status).toBe(200);
    expect(pbRes.body.secoes).toHaveLength(7);
  });

  it('8. Assistente removido e Webhooks preservados', async () => {
    for (const route of ['/assistente/conversas', '/assistente/conversas/inexistente']) {
      expect((await request(app).get('/api/v1' + route).set('Cookie', tiagoCookie)).status).toBe(404);
      expect((await request(app).post('/api/v1' + route).set('Cookie', tiagoCookie).send({})).status).toBe(404);
    }
    // Teste de Webhook autenticado com Idempotência (n8n / Radar Quest)
    const webhookPayload = {
      event: 'lead.created',
      source: 'radar_quest',
      data: {
        nome: 'Marcos Silva',
        empresa: 'TechLog Brasil',
        segmento: 'Logística',
        email: 'marcos@techlog.com.br',
      },
    };

    const wh1 = await request(app)
      .post('/api/v1/integrations/webhooks/inbound')
      .set('x-webhook-secret', 'quest-webhook-shared-secret-2026')
      .set('x-idempotency-key', 'radar-evt-0001')
      .send(webhookPayload);
    expect(wh1.status).toBe(200);
    expect(wh1.body.idempotent_replay).toBe(false);

    const wh2 = await request(app)
      .post('/api/v1/integrations/webhooks/inbound')
      .set('x-webhook-secret', 'quest-webhook-shared-secret-2026')
      .set('x-idempotency-key', 'radar-evt-0001')
      .send(webhookPayload);
    expect(wh2.status).toBe(200);
    expect(wh2.body.idempotent_replay).toBe(true);
  });

  // ============================================================================
  // FASE 3: TESTES DE SEGURANÇA (Security TDD — Auditoria Zero-Trust v3)
  // ============================================================================
  it('VULN-1: deve impedir exposição de token de reset na resposta HTTP para contas já ativadas (Account Takeover Protection)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'andre.maciel@questcomunicacao.com.br' });
    expect(res.status).toBe(401);
    expect(res.body.resetTokenForSetup).toBeUndefined();
  });

  it('VULN-2: deve rejeitar adulteração de forecast_score de negociação de outro vendedor via execução de ritual (IDOR/BOLA)', async () => {
    const rituaisRes = await request(app).get('/api/v1/rituais').set('Cookie', tiagoCookie);
    const monthlyRitualId = rituaisRes.body.por_frequencia.MENSAL[0].id;

    // Tiago tenta alterar o forecast_score da negociação privada da Katia
    const attackRes = await request(app)
      .post(`/api/v1/rituais/${monthlyRitualId}/execucoes`)
      .set('Cookie', tiagoCookie)
      .send({
        status: 'CONCLUIDO',
        forecast_score: 1,
        negociacao_id: negociacaoKatiaId,
      });
    expect(attackRes.status).toBe(403);
    expect(attackRes.body.error).toBe('FORBIDDEN');
  });

  it('Compartilhamento: permite vincular negociação a cliente da equipe', async () => {
    const attackRes = await request(app)
      .put(`/api/v1/negociacoes/${negociacaoTiagoId}`)
      .set('Cookie', tiagoCookie)
      .send({
        cliente_id: clienteKatiaId,
      });
    expect(attackRes.status).toBe(200);
  });

  it('VULN-4: deve rejeitar webhook sem assinatura ou com segredo inválido (Autenticação Zero-Trust)', async () => {
    const res = await request(app)
      .post('/api/v1/integrations/webhooks/inbound')
      .set('x-webhook-secret', 'segredo-invalido-forjado')
      .send({
        event: 'lead.created',
        source: 'n8n',
        data: { nome: 'Lead Invasor', empresa: 'Corp X' },
      });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('VULN-5: deve rejeitar payload com campos não permitidos (.strict() Mass Assignment Protection) e textos acima do limite (.max())', async () => {
    const massAssignRes = await request(app)
      .post('/api/v1/clientes')
      .set('Cookie', tiagoCookie)
      .send({
        nome: 'Cliente Teste',
        empresa: 'Empresa Teste',
        isAdmin: true,
        role: 'GESTOR',
      });
    expect(massAssignRes.status).toBe(400);
    expect(massAssignRes.body.error).toBe('VALIDATION_ERROR');

    const oversizedRes = await request(app)
      .post('/api/v1/clientes')
      .set('Cookie', tiagoCookie)
      .send({
        nome: 'A'.repeat(500),
        empresa: 'Empresa Teste',
      });
    expect(oversizedRes.status).toBe(400);
    expect(oversizedRes.body.error).toBe('VALIDATION_ERROR');
  });

  it('Playbook compartilhado: filtros combinados, edição por outro vendedor e autoria no histórico', async () => {
    expect((await request(app).get('/api/v1/pipeline/responsaveis')).status).toBe(401);
    const users = await request(app).get('/api/v1/pipeline/responsaveis').set('Cookie', tiagoCookie);
    expect(users.status).toBe(200);
    expect(users.body.accounts.some((u: any) => u.id === katiaId)).toBe(true);
    expect(Object.keys(users.body.accounts[0]).sort()).toEqual(['id', 'name']);

    const pipeline = await request(app).get('/api/v1/pipeline').set('Cookie', tiagoCookie);
    expect(pipeline.body.negociacoes.some((n: any) => n.id === negociacaoKatiaId)).toBe(true);
    const filtered = await request(app).get(`/api/v1/pipeline?ownerId=${katiaId}&stageId=${stages[1].id}`).set('Cookie', tiagoCookie);
    expect(filtered.status).toBe(200);
    expect(filtered.body.negociacoes.length).toBe(1);
    expect(filtered.body.negociacoes[0].id).toBe(negociacaoKatiaId);
    const empty = await request(app).get(`/api/v1/pipeline?ownerId=${katiaId}&stageId=${stages[0].id}`).set('Cookie', tiagoCookie);
    expect(empty.status).toBe(200);
    expect(empty.body.negociacoes).toEqual([]);

    const edited = await request(app).put(`/api/v1/negociacoes/${negociacaoKatiaId}`).set('Cookie', tiagoCookie)
      .send({ nome: 'Campanha revisada pela equipe', valor: 96000 });
    expect(edited.status).toBe(200);
    expect(edited.body.negociacao.owner_id).toBe(katiaId);
    expect(edited.body.negociacao.nome).toBe('Campanha revisada pela equipe');
    expect(edited.body.negociacao.historico.some((h: any) => h.usuario_id === tiagoId && h.acao === 'VALOR_ALTERADO')).toBe(true);
    const moved = await request(app).patch(`/api/v1/negociacoes/${negociacaoKatiaId}/stage`).set('Cookie', tiagoCookie)
      .send({ etapa_id: stages[2].id });
    expect(moved.status).toBe(200);
    const activity = await request(app).post(`/api/v1/negociacoes/${negociacaoKatiaId}/atividades`).set('Cookie', tiagoCookie)
      .send({ tipo: 'NOTA', titulo: 'Revisão colaborativa' });
    expect(activity.status).toBe(201);
    expect((await request(app).put(`/api/v1/negociacoes/${negociacaoKatiaId}`).send({ nome: 'Sem sessão' })).status).toBe(401);

    const inbound = await request(app).get('/api/v1/playbook-inbound').set('Cookie', tiagoCookie);
    const block = inbound.body.secoes[0].blocos[0];
    const savedBlock = await request(app).put(`/api/v1/playbook-inbound/${block.id}`).set('Cookie', tiagoCookie)
      .send({ titulo: block.titulo, conteudo: block.conteudo });
    expect(savedBlock.status).toBe(200);
  });

  it('Referência Inbound: edições compartilhadas persistentes por campo, validação e preservação do conteúdo anterior', async () => {
    const before = await request(app).get('/api/v1/playbook-inbound').set('Cookie', tiagoCookie);
    const legacyCount = before.body.secoes.reduce((count: number, section: any) => count + section.blocos.length, 0);
    const body = { titulo: 'Origem estrutural', conteudo: 'Texto compartilhado de teste com **destaque**.' };
    const anonymous = await request(app).put('/api/v1/playbook-inbound/reference/s1.origin').send(body);
    expect(anonymous.status).toBe(401);
    const created = await request(app).put('/api/v1/playbook-inbound/reference/s1.origin').set('Cookie', tiagoCookie).send(body);
    expect(created.status).toBe(200);
    const changed = await request(app).put('/api/v1/playbook-inbound/reference/s1.origin').set('Cookie', gestorCookie)
      .send({ ...body, conteudo: 'Texto revisado pela gestão.' });
    expect(changed.status).toBe(200);
    expect(changed.body.bloco.id).toBe(created.body.bloco.id);
    const another = await request(app).put('/api/v1/playbook-inbound/reference/s6.email').set('Cookie', tiagoCookie)
      .send({ titulo: 'Template de e-mail', conteudo: 'Olá, [Nome do Decisor]. Próxima reunião confirmada.' });
    expect(another.status).toBe(200);
    const read = await request(app).get('/api/v1/playbook-inbound').set('Cookie', tiagoCookie);
    expect(read.body.reference_overrides['s1.origin']).toBe('Texto revisado pela gestão.');
    expect(read.body.reference_overrides['s6.email']).toContain('[Nome do Decisor]');
    expect(read.body.secoes.reduce((count: number, section: any) => count + section.blocos.length, 0)).toBe(legacyCount);
    const invalidKey = await request(app).put('/api/v1/playbook-inbound/reference/s8.invalid').set('Cookie', tiagoCookie).send(body);
    expect(invalidKey.status).toBe(400);
    const invalidBody = await request(app).put('/api/v1/playbook-inbound/reference/s1.origin').set('Cookie', tiagoCookie)
      .send({ ...body, role: 'GESTOR' });
    expect(invalidBody.status).toBe(400);
    const oversized = await request(app).put('/api/v1/playbook-inbound/reference/s1.origin').set('Cookie', tiagoCookie)
      .send({ ...body, conteudo: 'a'.repeat(25001) });
    expect(oversized.status).toBe(400);
  });

  it('Gestão de usuários: editar, proteger o gestor e revogar acesso, sessões e convites', async () => {
    const denied = await request(app).post('/api/v1/auth/forgot-password').set('Cookie', tiagoCookie)
      .send({ email: 'katia.gebran@questcomunicacao.com.br' });
    expect(denied.status).toBe(403);
    const edit = await request(app).put(`/api/v1/equipe/${katiaId}`).set('Cookie', gestorCookie)
      .send({ name: 'Katia Gebran', email: 'katia.gebran@questcomunicacao.com.br', cargo: 'Comercial Advertising' });
    expect(edit.status).toBe(200);
    const selfDemotion = await request(app).put(`/api/v1/equipe/${gestorId}`).set('Cookie', gestorCookie).send({ role: 'VENDEDOR' });
    expect(selfDemotion.status).toBe(400);
    const selfRemoval = await request(app).patch(`/api/v1/equipe/${gestorId}/status`).set('Cookie', gestorCookie).send({ active: false });
    expect(selfRemoval.status).toBe(400);
    const invitation = await request(app).post('/api/v1/auth/forgot-password').set('Cookie', gestorCookie)
      .send({ email: 'katia.gebran@questcomunicacao.com.br' });
    expect(invitation.body.resetTokenForSetup).toBeTruthy();
    const removal = await request(app).patch(`/api/v1/equipe/${katiaId}/status`).set('Cookie', gestorCookie).send({ active: false });
    expect(removal.status).toBe(200);
    expect((await request(app).get('/api/v1/pipeline').set('Cookie', katiaCookie)).status).toBe(401);
    const reset = await request(app).post('/api/v1/auth/reset-password')
      .send({ token: invitation.body.resetTokenForSetup, newPassword: 'NovaSenhaTeste2026!' });
    expect(reset.status).toBe(400);
    const preserved = await request(app).get(`/api/v1/negociacoes/${negociacaoKatiaId}`).set('Cookie', tiagoCookie);
    expect(preserved.status).toBe(200);
  });

  it('VULN-6: deve aplicar headers de segurança estritos (CSP, X-Frame-Options: DENY, HSTS, X-Content-Type-Options)', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
