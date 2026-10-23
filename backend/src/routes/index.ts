import { Router } from 'express';
import { db, getDatabaseEngineMode } from '../config/database.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import {
  aiRateLimiter,
  apiRateLimiter,
  authRateLimiter,
} from '../middlewares/rateLimit.middleware.js';
import { authController } from '../controllers/auth.controller.js';
import { crmController } from '../controllers/crm.controller.js';
import { gestaoController } from '../controllers/gestao.controller.js';
import { conteudoController } from '../controllers/conteudo.controller.js';

export const apiRouter = Router();

apiRouter.use(apiRateLimiter);

// Health Check (Seção 1 — Infraestrutura)
apiRouter.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      service: 'quest-playbook-backend',
      database: 'connected',
      engine: getDatabaseEngineMode(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    // 🔒 SEGURANÇA [VULN-6 / Lei 9 & Lei 14]: Não expõe mensagem de erro interna do banco em endpoint público
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
    });
  }
});

// ============================================================================
// MÓDULO AUTENTICAÇÃO E PERFIS (Seção 4)
// ============================================================================
apiRouter.post('/auth/login', authRateLimiter, authController.login);
apiRouter.post('/auth/logout', requireAuth, authController.logout);
apiRouter.get('/auth/me', requireAuth, authController.me);
apiRouter.post('/auth/forgot-password', authRateLimiter, authController.forgotPassword);
apiRouter.post('/auth/reset-password', authRateLimiter, authController.resetPassword);
apiRouter.post('/auth/change-password', requireAuth, authController.changePassword);
apiRouter.get('/auth/initial-accounts', authController.initialAccounts);

// ============================================================================
// MÓDULO VISÃO GERAL (Seção 6)
// ============================================================================
apiRouter.get('/dashboard/overview', requireAuth, gestaoController.getOverview);

// ============================================================================
// MÓDULO PLAYBOOK — PIPELINE COMERCIAL E CLIENTES (Seção 7)
// ============================================================================
apiRouter.get('/stages', requireAuth, crmController.listStages);
apiRouter.get('/clientes', requireAuth, crmController.listClientes);
apiRouter.post('/clientes', requireAuth, crmController.createCliente);
apiRouter.put('/clientes/:id', requireAuth, crmController.updateCliente);
apiRouter.delete('/clientes/:id', requireAuth, crmController.deleteCliente);

apiRouter.get('/pipeline', requireAuth, crmController.getPipeline);
apiRouter.get('/negociacoes/:id', requireAuth, crmController.getNegociacao);
apiRouter.post('/negociacoes', requireAuth, crmController.createNegociacao);
apiRouter.put('/negociacoes/:id', requireAuth, crmController.updateNegociacao);
apiRouter.patch('/negociacoes/:id/stage', requireAuth, crmController.moveStage);
apiRouter.patch('/negociacoes/:id/status', requireAuth, crmController.updateStatus);
apiRouter.post('/negociacoes/:id/atividades', requireAuth, crmController.addAtividade);
apiRouter.delete('/negociacoes/:id', requireAuth, crmController.deleteNegociacao);

// ============================================================================
// MÓDULO METAS E KPIS DO FUNIL INBOUND + CONSULTORIA (Seção 8)
// ============================================================================
apiRouter.get('/metas/kpis-inbound', requireAuth, gestaoController.getKpisInbound);
apiRouter.put(
  '/metas/kpis-inbound',
  requireAuth,
  requireRole('GESTOR'),
  gestaoController.upsertKpisInbound
);

apiRouter.get('/metas', requireAuth, gestaoController.listMetas);
apiRouter.post('/metas', requireAuth, requireRole('GESTOR'), gestaoController.createMeta);
apiRouter.put('/metas/:id', requireAuth, requireRole('GESTOR'), gestaoController.updateMeta);
apiRouter.delete('/metas/:id', requireAuth, requireRole('GESTOR'), gestaoController.deleteMeta);

// ============================================================================
// MÓDULO RESULTADOS (Seção 9)
// ============================================================================
apiRouter.get('/resultados/analytics', requireAuth, gestaoController.getResultados);

// ============================================================================
// MÓDULO EQUIPE — SOMENTE GESTORES (Seção 10)
// ============================================================================
apiRouter.get('/equipe', requireAuth, requireRole('GESTOR'), gestaoController.getEquipe);
apiRouter.get(
  '/equipe/:id',
  requireAuth,
  requireRole('GESTOR'),
  gestaoController.getVendedorDetalhe
);
apiRouter.post('/equipe', requireAuth, requireRole('GESTOR'), gestaoController.createVendedor);
apiRouter.put('/equipe/:id', requireAuth, requireRole('GESTOR'), gestaoController.updateVendedor);
apiRouter.patch(
  '/equipe/:id/status',
  requireAuth,
  requireRole('GESTOR'),
  gestaoController.toggleVendedorStatus
);

// ============================================================================
// MÓDULO ROTINAS E RITUAIS (Seção 11)
// ============================================================================
apiRouter.get('/rituais', requireAuth, conteudoController.getRituais);
apiRouter.post('/rituais/:id/execucoes', requireAuth, conteudoController.createRitualExecucao);

// ============================================================================
// MÓDULO PLAYBOOK INBOUND (Seção 12)
// ============================================================================
apiRouter.get('/playbook-inbound', requireAuth, conteudoController.getPlaybookInbound);
apiRouter.put(
  '/playbook-inbound/:id',
  requireAuth,
  requireRole('GESTOR'),
  conteudoController.updatePlaybookConteudo
);

// ============================================================================
// MÓDULO ASSISTENTE COMERCIAL IA (Seção 13)
// ============================================================================
apiRouter.get('/assistente/conversas', requireAuth, conteudoController.listConversas);
apiRouter.post('/assistente/conversas', requireAuth, conteudoController.createConversa);
apiRouter.get('/assistente/conversas/:id', requireAuth, conteudoController.getConversa);
apiRouter.delete('/assistente/conversas/:id', requireAuth, conteudoController.deleteConversa);
apiRouter.post(
  '/assistente/conversas/:id/mensagens',
  requireAuth,
  aiRateLimiter,
  conteudoController.sendMensagem
);

// ============================================================================
// MÓDULO INTEGRAÇÕES E WEBHOOKS — n8n / Radar Quest (Seção 15)
// ============================================================================
apiRouter.post('/integrations/webhooks/inbound', conteudoController.handleInboundWebhook);
apiRouter.get(
  '/integrations/webhooks/logs',
  requireAuth,
  requireRole('GESTOR'),
  conteudoController.listWebhookLogs
);
