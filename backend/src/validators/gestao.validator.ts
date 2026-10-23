import { z } from 'zod';

export const metaCreateSchema = z.object({
  vendedor_id: z.string().uuid().optional().nullable(),
  tipo: z.enum(['MENSAL', 'ANUAL', 'INDICADOR_COMERCIAL', 'CICLO']).default('MENSAL'),
  periodo: z.string().trim().min(4, 'Informe o período (ex: 2026-10 ou 2026).'),
  ano: z.coerce.number().int().min(2020).max(2100),
  mes: z.coerce.number().int().min(1).max(12).optional().nullable(),
  ciclo: z.string().trim().optional().nullable(),
  indicador_nome: z.string().trim().optional().nullable(),
  valor_alvo: z.coerce.number().positive('O valor-alvo da meta deve ser maior que zero.'),
  observacoes: z.string().trim().optional().nullable(),
});

export const metaUpdateSchema = metaCreateSchema.partial();

export const kpiMetaUpsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  usuario_id: z.string().uuid().optional().nullable(),
  periodo: z.string().trim().min(4, 'Informe o período de referência.'),
  ciclo: z.string().trim().default('GERAL'),
  validacoes_radar_meta: z.coerce.number().int().min(0).optional().nullable(),
  validacoes_radar_realizado: z.coerce.number().int().min(0).default(0),
  taxa_agendamento_meta: z.coerce.number().min(0).max(100).optional().nullable(),
  taxa_agendamento_realizado: z.coerce.number().min(0).max(100).optional().nullable(),
  taxa_qualificacao_meta: z.coerce.number().min(0).max(100).optional().nullable(),
  taxa_qualificacao_realizado: z.coerce.number().min(0).max(100).optional().nullable(),
  taxa_aceite_diagnostico_meta: z.coerce.number().min(0).max(100).optional().nullable(),
  taxa_aceite_diagnostico_realizado: z.coerce.number().min(0).max(100).optional().nullable(),
  taxa_conversao_meta: z.coerce.number().min(0).max(100).optional().nullable(),
  taxa_conversao_realizado: z.coerce.number().min(0).max(100).optional().nullable(),
  ticket_medio_meta: z.coerce.number().min(0).optional().nullable(),
  ticket_medio_realizado: z.coerce.number().min(0).optional().nullable(),
  ciclo_dias_meta: z.coerce.number().int().min(0).optional().nullable(),
  ciclo_dias_realizado: z.coerce.number().int().min(0).optional().nullable(),
  ciclo_1_meta: z.coerce.number().min(0).optional().nullable(),
  ciclo_1_realizado: z.coerce.number().min(0).optional().nullable(),
  ciclo_2_meta: z.coerce.number().min(0).optional().nullable(),
  ciclo_2_realizado: z.coerce.number().min(0).optional().nullable(),
  previsao_receita: z.coerce.number().min(0).optional().nullable(),
  previsao_fechamentos: z.coerce.number().int().min(0).optional().nullable(),
});

export const vendedorCreateSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
  cargo: z.string().trim().min(2, 'Informe o cargo comercial.'),
  role: z.enum(['GESTOR', 'VENDEDOR']).default('VENDEDOR'),
  meta_mensal_opcional: z.coerce.number().positive().optional().nullable(),
  periodo_meta_opcional: z.string().trim().optional().nullable(),
});

export const vendedorUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  cargo: z.string().trim().min(2).optional(),
  role: z.enum(['GESTOR', 'VENDEDOR']).optional(),
});

export const vendedorStatusSchema = z.object({
  active: z.boolean(),
});

