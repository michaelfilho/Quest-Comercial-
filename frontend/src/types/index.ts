export type UserRole = 'GESTOR' | 'VENDEDOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  cargo: string;
  active: boolean;
  activated?: boolean;
}

export interface Stage {
  id: string;
  nome: string;
  slug: string;
  ordem: number;
  probabilidade_padrao: number;
  cor: string;
}

export interface Cliente {
  id: string;
  nome: string;
  empresa: string;
  segmento?: string | null;
  contato?: string | null;
  email?: string | null;
  telefone?: string | null;
  status: 'ATIVO' | 'PROSPECT' | 'INATIVO';
  origem?: string | null;
  responsavel_id: string;
  responsavel_nome?: string;
  observacoes?: string | null;
  first_contact_at?: string | null;
  total_negociacoes?: number;
  created_at: string;
}

export type NegociacaoStatus = 'EM_ANDAMENTO' | 'GANHO' | 'PERDIDO';

export interface NegociacaoAtividade {
  id: string;
  negociacao_id: string;
  usuario_id: string;
  usuario_nome?: string;
  tipo: string;
  titulo: string;
  descricao?: string | null;
  realizada_em: string;
  proxima_acao_em?: string | null;
  concluida: boolean;
  created_at: string;
}

export interface NegociacaoHistorico {
  id: string;
  negociacao_id: string;
  usuario_id: string;
  usuario_nome?: string;
  etapa_anterior_id?: string | null;
  etapa_nova_id?: string | null;
  etapa_anterior_nome?: string | null;
  etapa_nova_nome?: string | null;
  status_anterior?: string | null;
  status_novo?: string | null;
  valor_anterior?: number | null;
  valor_novo?: number | null;
  acao: string;
  detalhes?: string | null;
  tempo_na_etapa_segundos?: number | null;
  created_at: string;
}

export interface Negociacao {
  id: string;
  nome: string;
  cliente_id: string;
  cliente_nome?: string;
  cliente_empresa?: string;
  cliente_segmento?: string;
  owner_id: string;
  owner_nome?: string;
  owner_cargo?: string;
  etapa_id: string;
  etapa_nome?: string;
  etapa_slug?: string;
  etapa_ordem?: number;
  valor: number;
  probabilidade: number;
  status: NegociacaoStatus;
  motivo_perda?: string | null;
  expected_close_date?: string | null;
  closed_date?: string | null;
  stage_changed_at: string;
  last_activity_at: string;
  forecast_score?: number | null;
  produto?: string | null;
  tempo_na_etapa_segundos: number;
  tempo_na_etapa_dias: number;
  parado_mais_15_dias?: boolean;
  total_atividades?: number;
  atividades?: NegociacaoAtividade[];
  historico?: NegociacaoHistorico[];
  created_at: string;
  updated_at: string;
}

export interface PipelineColumn extends Stage {
  quantidade: number;
  valor_total: number;
  valor_ponderado: number;
  negociacoes: Negociacao[];
}

export interface Meta {
  id: string;
  vendedor_id?: string | null;
  vendedor_nome?: string | null;
  vendedor_cargo?: string | null;
  tipo: 'MENSAL' | 'ANUAL' | 'INDICADOR_COMERCIAL' | 'CICLO';
  periodo: string;
  ano: number;
  mes?: number | null;
  ciclo?: string | null;
  indicador_nome?: string | null;
  valor_alvo: number;
  valor_realizado: number;
  percentual_atingido: number;
  valor_restante: number;
  projecao_atingimento: number;
  cor_semaforo: 'VERDE' | 'AMARELO' | 'VERMELHO';
  observacoes?: string | null;
}

