import { z } from 'zod';

export const ritualExecucaoCreateSchema = z.object({
  status: z.enum(['CONCLUIDO', 'EM_ANDAMENTO', 'PENDENTE', 'ATRASADO']).default('CONCLUIDO'),
  data_execucao: z.string().optional().nullable(),
  observacoes: z.string().trim().optional().nullable(),
  respostas_acompanhamento: z.string().trim().optional().nullable(),
  pitch_score: z.coerce.number().int().min(0).max(10).optional().nullable(),
  forecast_score: z.coerce.number().int().min(0).max(7).optional().nullable(),
  negociacao_id: z.string().uuid().optional().nullable(),
});

export const playbookConteudoUpdateSchema = z.object({
  titulo: z.string().trim().min(2),
  subtitulo: z.string().trim().optional().nullable(),
  conteudo: z.string().trim().min(1),
  criterios_avanco: z.string().trim().optional().nullable(),
  responsaveis: z.string().trim().optional().nullable(),
  copiavel: z.boolean().optional(),
  oficial_importado: z.boolean().optional(),
});

export const conversaCreateSchema = z.object({
  titulo: z.string().trim().min(2).max(120).default('Nova consulta comercial'),
});

export const mensagemSendSchema = z.object({
  mensagem: z.string().trim().min(1, 'Digite uma mensagem para o Assistente Comercial Quest.').max(4000),
  stream: z.boolean().optional().default(false),
});

export const webhookInboundSchema = z.object({
  event: z.enum([
    'lead.created',
    'lead.assigned',
    'negotiation.created',
    'negotiation.stage_changed',
    'negotiation.won',
    'negotiation.lost',
    'goal.updated',
  ]),
  source: z.string().trim().default('n8n'),
  data: z.record(z.any()),
});

