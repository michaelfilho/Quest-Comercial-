import { Request, Response, NextFunction } from 'express';
import { conteudoService } from '../services/conteudo.service.js';
import { assistenteService } from '../services/assistente.service.js';
import { webhookService } from '../integrations/webhook.service.js';
import {
  conversaCreateSchema,
  mensagemSendSchema,
  playbookConteudoUpdateSchema,
  ritualExecucaoCreateSchema,
  webhookInboundSchema,
} from '../validators/conteudo.validator.js';

export const conteudoController = {
  async getRituais(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await conteudoService.getRituaisAndAlerts(req.user!);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },

  async createRitualExecucao(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = ritualExecucaoCreateSchema.parse(req.body);
      const execucao = await conteudoService.createRitualExecucao(
        req.user!,
        req.params.id,
        parsed,
        req.ip
      );
      res.status(201).json({ execucao });
    } catch (err) {
      next(err);
    }
  },

  async getPlaybookInbound(_req: Request, res: Response, next: NextFunction) {
    try {
      const playbook = await conteudoService.getPlaybookInbound();
      res.status(200).json(playbook);
    } catch (err) {
      next(err);
    }
  },

  async updatePlaybookConteudo(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = playbookConteudoUpdateSchema.parse(req.body);
      const bloco = await conteudoService.updatePlaybookConteudo(
        req.user!,
        req.params.id,
        parsed,
        req.ip
      );
      res.status(200).json({ bloco });
    } catch (err) {
      next(err);
    }
  },

  async listConversas(req: Request, res: Response, next: NextFunction) {
    try {
      const conversas = await assistenteService.listConversas(req.user!);
      res.status(200).json({ conversas });
    } catch (err) {
      next(err);
    }
  },

  async createConversa(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = conversaCreateSchema.parse(req.body || {});
      const conversa = await assistenteService.createConversa(req.user!, parsed.titulo);
      res.status(201).json({ conversa });
    } catch (err) {
      next(err);
    }
  },

  async getConversa(req: Request, res: Response, next: NextFunction) {
    try {
      const conversa = await assistenteService.getConversaById(req.user!, req.params.id);
      res.status(200).json({ conversa });
    } catch (err) {
      next(err);
    }
  },

  async deleteConversa(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await assistenteService.deleteConversa(req.user!, req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async sendMensagem(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = mensagemSendSchema.parse(req.body);
      const wantsStream =
        parsed.stream === true ||
        req.headers.accept?.includes('text/event-stream');

      if (wantsStream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const result = await assistenteService.processUserMessage(
          req.user!,
          req.params.id,
          parsed.mensagem,
          (chunk) => {
            res.write(`data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`);
          }
        );

        res.write(
          `data: ${JSON.stringify({ type: 'done', message: result.mensagem_assistente })}\n\n`
        );
        res.end();
        return;
      }

      const result = await assistenteService.processUserMessage(
        req.user!,
        req.params.id,
        parsed.mensagem
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async handleInboundWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = webhookInboundSchema.parse(req.body);
      const rawBody = JSON.stringify(req.body);
      const result = await webhookService.processInboundWebhook({
        idempotencyKey: req.headers['x-idempotency-key'] as string | undefined,
        signature: req.headers['x-quest-signature'] as string | undefined,
        secretHeader: req.headers['x-webhook-secret'] as string | undefined,
        rawBody,
        payload: parsed,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async listWebhookLogs(_req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await webhookService.listWebhookLogs();
      res.status(200).json({ logs });
    } catch (err) {
      next(err);
    }
  },
};

