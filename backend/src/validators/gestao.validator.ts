import { z } from 'zod';

// 🔒 SEGURANÇA [VULN-5 / Lei 2 & Lei 3]: Schemas estritos (.strict()) e limites máximos (.max())
export const metaCreateSchema = z
  .object({
    vendedor_id: z.string().uuid().optional().nullable(),
    tipo: z.enum(['MENSAL', 'ANUAL', 'INDICADOR_COMERCIAL', 'CICLO']).default('MENSAL'),
    periodo: z.string().trim().min(4, 'Informe o período (ex: 2026-10 ou 2026).').max(32),
    ano: z.coerce.number().int().min(2020).max(2100),
    mes: z.coerce.number().int().min(1).max(12).optional().nullable(),
    ciclo: z.string().trim().max(64).optional().nullable(),
    indicador_nome: z.string().trim().max(120).optional().nullable(),
    valor_alvo: z.coerce.number().positive('O valor-alvo da meta deve ser maior que zero.').max(1_000_000_000),
    observacoes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export const metaUpdateSchema = metaCreateSchema.partial().strict();

export const kpiMetaUpsertSchema = z
  .object({
    id: z.string().uuid().optional().nullable(),
    usuario_id: z.string().uuid().optional().nullable(),
    periodo: z.string().trim().min(4, 'Informe o período de referência.').max(32),
    ciclo: z.string().trim().max(64).default('GERAL'),
    validacoes_radar_meta: z.coerce.number().int().min(0).max(1_000_000).optional().nullable(),
    validacoes_radar_realizado: z.coerce.number().int().min(0).max(1_000_000).default(0),
    taxa_agendamento_meta: z.coerce.number().min(0).max(100).optional().nullable(),
    taxa_agendamento_realizado: z.coerce.number().min(0).max(100).optional().nullable(),
    taxa_qualificacao_meta: z.coerce.number().min(0).max(100).optional().nullable(),
    taxa_qualificacao_realizado: z.coerce.number().min(0).max(100).optional().nullable(),
    taxa_aceite_diagnostico_meta: z.coerce.number().min(0).max(100).optional().nullable(),
    taxa_aceite_diagnostico_realizado: z.coerce.number().min(0).max(100).optional().nullable(),
    taxa_conversao_meta: z.coerce.number().min(0).max(100).optional().nullable(),
    taxa_conversao_realizado: z.coerce.number().min(0).max(100).optional().nullable(),
    ticket_medio_meta: z.coerce.number().min(0).max(1_000_000_000).optional().nullable(),
    ticket_medio_realizado: z.coerce.number().min(0).max(1_000_000_000).optional().nullable(),
    ciclo_dias_meta: z.coerce.number().int().min(0).max(3650).optional().nullable(),
    ciclo_dias_realizado: z.coerce.number().int().min(0).max(3650).optional().nullable(),
    ciclo_1_meta: z.coerce.number().min(0).max(1_000_000_000).optional().nullable(),
    ciclo_1_realizado: z.coerce.number().min(0).max(1_000_000_000).optional().nullable(),
    ciclo_2_meta: z.coerce.number().min(0).max(1_000_000_000).optional().nullable(),
    ciclo_2_realizado: z.coerce.number().min(0).max(1_000_000_000).optional().nullable(),
    previsao_receita: z.coerce.number().min(0).max(1_000_000_000).optional().nullable(),
    previsao_fechamentos: z.coerce.number().int().min(0).max(100_000).optional().nullable(),
  })
  .strict();

export const vendedorCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe o nome completo.').max(140),
    email: z.string().trim().max(254).email('Informe um e-mail válido.'),
    cargo: z.string().trim().min(2, 'Informe o cargo comercial.').max(140),
    role: z.enum(['GESTOR', 'VENDEDOR']).default('VENDEDOR'),
    meta_mensal_opcional: z.coerce.number().positive().max(1_000_000_000).optional().nullable(),
    periodo_meta_opcional: z.string().trim().max(32).optional().nullable(),
  })
  .strict();

export const vendedorUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(140).optional(),
    email: z.string().trim().max(254).email().optional(),
    cargo: z.string().trim().min(2).max(140).optional(),
    role: z.enum(['GESTOR', 'VENDEDOR']).optional(),
  })
  .strict();

export const vendedorStatusSchema = z
  .object({
    active: z.boolean(),
  })
  .strict();
