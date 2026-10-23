import { Request, Response, NextFunction } from 'express';
import { crmService } from '../services/crm.service.js';
import {
  atividadeCreateSchema,
  clienteSchema,
  moveStageSchema,
  negociacaoCreateSchema,
  negociacaoUpdateSchema,
  updateStatusSchema,
} from '../validators/crm.validator.js';

export const crmController = {
  async listStages(_req: Request, res: Response, next: NextFunction) {
    try {
      const stages = await crmService.listStages();
      res.status(200).json({ stages });
    } catch (err) {
      next(err);
    }
  },

  async listClientes(req: Request, res: Response, next: NextFunction) {
    try {
      const clientes = await crmService.listClientes(req.user!, {
        search: req.query.search as string | undefined,
        responsavelId: req.query.responsavelId as string | undefined,
      });
      res.status(200).json({ clientes });
    } catch (err) {
      next(err);
    }
  },

  async createCliente(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = clienteSchema.parse(req.body);
      const cliente = await crmService.createCliente(req.user!, parsed, req.ip);
      res.status(201).json({ cliente });
    } catch (err) {
      next(err);
    }
  },

  async updateCliente(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = clienteSchema.partial().parse(req.body);
      const cliente = await crmService.updateCliente(req.user!, req.params.id, parsed, req.ip);
      res.status(200).json({ cliente });
    } catch (err) {
      next(err);
    }
  },

  async deleteCliente(req: Request, res: Response, next: NextFunction) {
    try {
      const confirm = req.body?.confirm === true || req.query?.confirm === 'true';
      const result = await crmService.deleteCliente(req.user!, req.params.id, confirm, req.ip);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async getPipeline(req: Request, res: Response, next: NextFunction) {
    try {
      const pipeline = await crmService.getPipeline(req.user!, {
        ownerId: req.query.ownerId as string | undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
      });
      res.status(200).json(pipeline);
    } catch (err) {
      next(err);
    }
  },

  async getNegociacao(req: Request, res: Response, next: NextFunction) {
    try {
      const negociacao = await crmService.getNegociacaoById(req.user!, req.params.id);
      res.status(200).json({ negociacao });
    } catch (err) {
      next(err);
    }
  },

  async createNegociacao(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = negociacaoCreateSchema.parse(req.body);
      const negociacao = await crmService.createNegociacao(req.user!, parsed, req.ip);
      res.status(201).json({ negociacao });
    } catch (err) {
      next(err);
    }
  },

  async updateNegociacao(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = negociacaoUpdateSchema.parse(req.body);
      const negociacao = await crmService.updateNegociacao(
        req.user!,
        req.params.id,
        parsed,
        req.ip
      );
      res.status(200).json({ negociacao });
    } catch (err) {
      next(err);
    }
  },

  async moveStage(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = moveStageSchema.parse(req.body);
      const negociacao = await crmService.moveStage(req.user!, req.params.id, parsed, req.ip);
      res.status(200).json({ negociacao });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateStatusSchema.parse(req.body);
      const negociacao = await crmService.updateStatus(req.user!, req.params.id, parsed, req.ip);
      res.status(200).json({ negociacao });
    } catch (err) {
      next(err);
    }
  },

  async addAtividade(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = atividadeCreateSchema.parse(req.body);
      const negociacao = await crmService.addAtividade(
        req.user!,
        req.params.id,
        parsed,
        req.ip
      );
      res.status(201).json({ negociacao });
    } catch (err) {
      next(err);
    }
  },

  async deleteNegociacao(req: Request, res: Response, next: NextFunction) {
    try {
      const confirm = req.body?.confirm === true || req.query?.confirm === 'true';
      const result = await crmService.deleteNegociacao(req.user!, req.params.id, confirm, req.ip);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};

