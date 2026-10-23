import { z } from 'zod';

// 🔒 SEGURANÇA [VULN-5 / Lei 2 & Lei 3]: Schemas estritos (.strict()) e limites máximos (.max())
export const ritualExecucaoCreateSchema = z
  .object({
    status: z.enum(['CONCLUIDO', 'EM_ANDAMENTO', 'PENDENTE', 'ATRASADO']).default('CONCLUIDO'),
    data_execucao: z.string().max(64).optional().nullable(),
    observacoes: z.string().trim().max(2000).optional().nullable(),
    respostas_acompanhamento: z.string().trim().max(4000).optional().nullable(),
    pitch_score: z.coerce.number().int().min(0).max(10).optional().nullable(),
    forecast_score: z.coerce.number().int().min(0).max(7).optional().nullable(),
    negociacao_id: z.string().uuid().optional().nullable(),
  })
  .strict();

export const playbookConteudoUpdateSchema = z
  .object({
    titulo: z.string().trim().min(2).max(200),
    subtitulo: z.string().trim().max(300).optional().nullable(),
    conteudo: z.string().trim().min(1).max(25000),
    criterios_avanco: z.string().trim().max(2000).optional().nullable(),
    responsaveis: z.string().trim().max(300).optional().nullable(),
    copiavel: z.boolean().optional(),
    oficial_importado: z.boolean().optional(),
  })
  .strict();

export const conversaCreateSchema = z
  .object({
    titulo: z.string().trim().min(2).max(120).default('Nova consulta comercial'),
  })
  .strict();

export const mensagemSendSchema = z
  .object({
    mensagem: z
      .string()
      .trim()
      .min(1, 'Digite uma mensagem para o Assistente Comercial Quest.')
      .max(4000, 'A mensagem excede o limite máximo de 4000 caracteres.'),
    stream: z.boolean().optional().default(false),
  })
  .strict();

export const webhookInboundSchema = z
  .object({
    event: z.enum([
      'lead.created',
      'lead.assigned',
      'negotiation.created',
      'negotiation.stage_changed',
      'negotiation.won',
      'negotiation.lost',
      'goal.updated',
    ]),
    source: z.string().trim().max(80).default('n8n'),
    data: z.record(z.string().max(80), z.union([z.string().max(2000), z.number(), z.boolean(), z.null()])),
  })
  .strict();
