import { z } from 'zod';

export const clienteSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do cliente/contato principal.'),
  empresa: z.string().trim().min(2, 'Informe o nome da empresa.'),
  segmento: z.string().trim().optional().nullable(),
  contato: z.string().trim().optional().nullable(),
  email: z.string().trim().email('E-mail inválido.').optional().or(z.literal('')).nullable(),
  telefone: z.string().trim().optional().nullable(),
  status: z.enum(['ATIVO', 'PROSPECT', 'INATIVO']).default('ATIVO'),
  origem: z.string().trim().optional().nullable(),
  responsavel_id: z.string().uuid('ID do responsável inválido.').optional(),
  observacoes: z.string().trim().optional().nullable(),
  first_contact_at: z.string().optional().nullable(),
});

export const negociacaoCreateSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome da negociação.'),
  cliente_id: z.string().uuid('Selecione um cliente válido.'),
  owner_id: z.string().uuid('Selecione um responsável válido.').optional(),
  etapa_id: z.string().uuid('Selecione uma etapa válida.').optional(),
  valor: z.coerce.number().min(0, 'O valor da oportunidade não pode ser negativo.'),
  probabilidade: z.coerce.number().int().min(0).max(100).default(20),
  status: z.enum(['EM_ANDAMENTO', 'GANHO', 'PERDIDO']).default('EM_ANDAMENTO'),
  motivo_perda: z.string().trim().optional().nullable(),
  expected_close_date: z.string().optional().nullable(),
  forecast_score: z.coerce.number().int().min(0).max(7).optional().nullable(),
  produto: z.string().trim().optional().nullable(),
});

export const negociacaoUpdateSchema = negociacaoCreateSchema.partial();

export const moveStageSchema = z.object({
  etapa_id: z.string().uuid('Etapa de destino inválida.'),
  probabilidade: z.coerce.number().int().min(0).max(100).optional(),
  detalhes: z.string().trim().optional().nullable(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['EM_ANDAMENTO', 'GANHO', 'PERDIDO']),
  motivo_perda: z.string().trim().optional().nullable(),
  closed_date: z.string().optional().nullable(),
});

export const atividadeCreateSchema = z.object({
  tipo: z.enum(['LIGACAO', 'EMAIL', 'WHATSAPP', 'REUNIAO', 'DIAGNOSTICO', 'PROPOSTA', 'NOTA']),
  titulo: z.string().trim().min(2, 'Informe o título da atividade.'),
  descricao: z.string().trim().optional().nullable(),
  realizada_em: z.string().optional().nullable(),
  proxima_acao_em: z.string().optional().nullable(),
  concluida: z.boolean().default(true),
});

