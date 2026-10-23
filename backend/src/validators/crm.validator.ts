import { z } from 'zod';

// 🔒 SEGURANÇA [VULN-5 / Lei 2 & Lei 3]: Schemas estritos (.strict()) contra Mass Assignment e limites (.max()) contra Storage DoS
export const clienteSchema = z
  .object({
    nome: z.string().trim().min(2, 'Informe o nome do cliente/contato principal.').max(160),
    empresa: z.string().trim().min(2, 'Informe o nome da empresa.').max(180),
    segmento: z.string().trim().max(120).optional().nullable(),
    contato: z.string().trim().max(160).optional().nullable(),
    email: z.string().trim().max(254).email('E-mail inválido.').optional().or(z.literal('')).nullable(),
    telefone: z.string().trim().max(40).optional().nullable(),
    status: z.enum(['ATIVO', 'PROSPECT', 'INATIVO']).default('ATIVO'),
    origem: z.string().trim().max(80).optional().nullable(),
    responsavel_id: z.string().uuid('ID do responsável inválido.').optional(),
    observacoes: z.string().trim().max(2000).optional().nullable(),
    first_contact_at: z.string().max(64).optional().nullable(),
  })
  .strict();

export const negociacaoCreateSchema = z
  .object({
    nome: z.string().trim().min(2, 'Informe o nome da negociação.').max(200),
    cliente_id: z.string().uuid('Selecione um cliente válido.'),
    owner_id: z.string().uuid('Selecione um responsável válido.').optional(),
    etapa_id: z.string().uuid('Selecione uma etapa válida.').optional(),
    valor: z.coerce.number().min(0, 'O valor da oportunidade não pode ser negativo.').max(1_000_000_000),
    probabilidade: z.coerce.number().int().min(0).max(100).default(20),
    status: z.enum(['EM_ANDAMENTO', 'GANHO', 'PERDIDO']).default('EM_ANDAMENTO'),
    motivo_perda: z.string().trim().max(1000).optional().nullable(),
    expected_close_date: z.string().max(64).optional().nullable(),
    forecast_score: z.coerce.number().int().min(0).max(7).optional().nullable(),
    produto: z.string().trim().max(120).optional().nullable(),
  })
  .strict();

export const negociacaoUpdateSchema = negociacaoCreateSchema.partial().strict();

export const moveStageSchema = z
  .object({
    etapa_id: z.string().uuid('Etapa de destino inválida.'),
    probabilidade: z.coerce.number().int().min(0).max(100).optional(),
    detalhes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export const updateStatusSchema = z
  .object({
    status: z.enum(['EM_ANDAMENTO', 'GANHO', 'PERDIDO']),
    motivo_perda: z.string().trim().max(1000).optional().nullable(),
    closed_date: z.string().max(64).optional().nullable(),
  })
  .strict();

export const atividadeCreateSchema = z
  .object({
    tipo: z.enum(['LIGACAO', 'EMAIL', 'WHATSAPP', 'REUNIAO', 'DIAGNOSTICO', 'PROPOSTA', 'NOTA']),
    titulo: z.string().trim().min(2, 'Informe o título da atividade.').max(200),
    descricao: z.string().trim().max(2000).optional().nullable(),
    realizada_em: z.string().max(64).optional().nullable(),
    proxima_acao_em: z.string().max(64).optional().nullable(),
    concluida: z.boolean().default(true),
  })
  .strict();
