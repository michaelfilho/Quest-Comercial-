import { Request, Response, NextFunction } from 'express';
import { gestaoService } from '../services/gestao.service.js';
import {
  kpiMetaUpsertSchema,
  metaCreateSchema,
  metaUpdateSchema,
  vendedorCreateSchema,
  vendedorStatusSchema,
  vendedorUpdateSchema,
} from '../validators/gestao.validator.js';

export const gestaoController = {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const overview = await gestaoService.getOverviewDashboard(req.user!, {
        month: req.query.month ? parseInt(req.query.month as string, 10) : undefined,
        year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        sellerId: req.query.sellerId as string | undefined,
      });
      res.status(200).json(overview);
    } catch (err) {
      next(err);
    }
  },

  async listMetas(req: Request, res: Response, next: NextFunction) {
    try {
      const metas = await gestaoService.listMetas(req.user!, {
        ano: req.query.ano ? parseInt(req.query.ano as string, 10) : undefined,
        mes: req.query.mes ? parseInt(req.query.mes as string, 10) : undefined,
        vendedorId: req.query.vendedorId as string | undefined,
        tipo: req.query.tipo as string | undefined,
      });
      res.status(200).json({ metas });
    } catch (err) {
      next(err);
    }
  },

  async createMeta(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = metaCreateSchema.parse(req.body);
      const meta = await gestaoService.createMeta(req.user!, parsed, req.ip);
      res.status(201).json({ meta });
    } catch (err) {
      next(err);
    }
  },

  async updateMeta(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = metaUpdateSchema.parse(req.body);
      const meta = await gestaoService.updateMeta(req.user!, req.params.id, parsed, req.ip);
      res.status(200).json({ meta });
    } catch (err) {
      next(err);
    }
  },

  async deleteMeta(req: Request, res: Response, next: NextFunction) {
    try {
      const confirm = req.body?.confirm === true || req.query?.confirm === 'true';
      const result = await gestaoService.deleteMeta(req.user!, req.params.id, confirm, req.ip);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async getKpisInbound(req: Request, res: Response, next: NextFunction) {
    try {
      const kpis = await gestaoService.getKpisInbound(req.user!, {
        usuarioId: req.query.usuarioId as string | undefined,
        periodo: req.query.periodo as string | undefined,
        ciclo: req.query.ciclo as string | undefined,
      });
      res.status(200).json(kpis);
    } catch (err) {
      next(err);
    }
  },

  async upsertKpisInbound(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = kpiMetaUpsertSchema.parse(req.body);
      const kpis = await gestaoService.upsertKpisInbound(req.user!, parsed, req.ip);
      res.status(200).json(kpis);
    } catch (err) {
      next(err);
    }
  },

  async getResultados(req: Request, res: Response, next: NextFunction) {
    try {
      const resultados = await gestaoService.getResultadosAnalytics(req.user!, {
        year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
        month: req.query.month ? parseInt(req.query.month as string, 10) : undefined,
        sellerId: req.query.sellerId as string | undefined,
      });
      res.status(200).json(resultados);
    } catch (err) {
      next(err);
    }
  },

  async getEquipe(req: Request, res: Response, next: NextFunction) {
    try {
      const equipe = await gestaoService.getEquipeOverview(req.user!);
      res.status(200).json(equipe);
    } catch (err) {
      next(err);
    }
  },

  async getVendedorDetalhe(req: Request, res: Response, next: NextFunction) {
    try {
      const detalhe = await gestaoService.getVendedorDetalhe(req.user!, req.params.id);
      res.status(200).json(detalhe);
    } catch (err) {
      next(err);
    }
  },

  async createVendedor(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = vendedorCreateSchema.parse(req.body);
      const result = await gestaoService.createVendedor(req.user!, parsed, req.ip);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async updateVendedor(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = vendedorUpdateSchema.parse(req.body);
      const usuario = await gestaoService.updateVendedor(
        req.user!,
        req.params.id,
        parsed,
        req.ip
      );
      res.status(200).json({ usuario });
    } catch (err) {
      next(err);
    }
  },

  async toggleVendedorStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = vendedorStatusSchema.parse(req.body);
      const usuario = await gestaoService.toggleVendedorStatus(
        req.user!,
        req.params.id,
        parsed.active,
        req.ip
      );
      res.status(200).json({ usuario });
    } catch (err) {
      next(err);
    }
  },
};

