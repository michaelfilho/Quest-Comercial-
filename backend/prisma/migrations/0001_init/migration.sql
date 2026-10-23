-- =============================================================================
-- PLAYBOOK DE VENDAS QUEST — MIGRATION 0001_INIT (PostgreSQL 16)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('GESTOR', 'VENDEDOR');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NegociacaoStatus" AS ENUM ('EM_ANDAMENTO', 'GANHO', 'PERDIDO');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MetaTipo" AS ENUM ('MENSAL', 'ANUAL', 'INDICADOR_COMERCIAL', 'CICLO');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RitualFrequencia" AS ENUM ('DIARIO', 'SEMANAL', 'MENSAL', 'TRIMESTRAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 1. users
CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'VENDEDOR',
  "cargo" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_email_key" UNIQUE ("email")
);
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_role_active_idx" ON "users"("role", "active");

-- 2. sessions
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_token_hash_key" UNIQUE ("token_hash"),
  CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions"("expires_at");

-- 3. password_reset_tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'PASSWORD_RESET',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_tokens_token_hash_key" UNIQUE ("token_hash"),
  CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- 4. stages
CREATE TABLE IF NOT EXISTS "stages" (
  "id" UUID NOT NULL,
  "nome" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "ordem" INTEGER NOT NULL,
  "probabilidade_padrao" INTEGER NOT NULL DEFAULT 20,
  "cor" TEXT NOT NULL DEFAULT '#FF5A00',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stages_nome_key" UNIQUE ("nome"),
  CONSTRAINT "stages_slug_key" UNIQUE ("slug"),
  CONSTRAINT "stages_ordem_key" UNIQUE ("ordem")
);
CREATE INDEX IF NOT EXISTS "stages_ordem_idx" ON "stages"("ordem");

-- 5. metas
CREATE TABLE IF NOT EXISTS "metas" (
  "id" UUID NOT NULL,
  "vendedor_id" UUID,
  "tipo" "MetaTipo" NOT NULL DEFAULT 'MENSAL',
  "periodo" TEXT NOT NULL,
  "ano" INTEGER NOT NULL,
  "mes" INTEGER,
  "ciclo" TEXT,
  "indicador_nome" TEXT,
  "valor_alvo" DECIMAL(15, 2) NOT NULL,
  "observacoes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "metas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "metas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "metas_vendedor_id_periodo_idx" ON "metas"("vendedor_id", "periodo");
CREATE INDEX IF NOT EXISTS "metas_ano_mes_idx" ON "metas"("ano", "mes");
CREATE INDEX IF NOT EXISTS "metas_tipo_idx" ON "metas"("tipo");

-- 6. kpi_metas
CREATE TABLE IF NOT EXISTS "kpi_metas" (
  "id" UUID NOT NULL,
  "usuario_id" UUID,
  "periodo" TEXT NOT NULL,
  "ciclo" TEXT NOT NULL DEFAULT 'GERAL',
  "validacoes_radar_meta" INTEGER,
  "validacoes_radar_realizado" INTEGER NOT NULL DEFAULT 0,
  "taxa_agendamento_meta" DECIMAL(5, 2),
  "taxa_agendamento_realizado" DECIMAL(5, 2),
  "taxa_qualificacao_meta" DECIMAL(5, 2),
  "taxa_qualificacao_realizado" DECIMAL(5, 2),
  "taxa_aceite_diagnostico_meta" DECIMAL(5, 2),
  "taxa_aceite_diagnostico_realizado" DECIMAL(5, 2),
  "taxa_conversao_meta" DECIMAL(5, 2),
  "taxa_conversao_realizado" DECIMAL(5, 2),
  "ticket_medio_meta" DECIMAL(15, 2),
  "ticket_medio_realizado" DECIMAL(15, 2),
  "ciclo_dias_meta" INTEGER,
  "ciclo_dias_realizado" INTEGER,
  "ciclo_1_meta" DECIMAL(15, 2),
  "ciclo_1_realizado" DECIMAL(15, 2),
  "ciclo_2_meta" DECIMAL(15, 2),
  "ciclo_2_realizado" DECIMAL(15, 2),
  "previsao_receita" DECIMAL(15, 2),
  "previsao_fechamentos" INTEGER,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kpi_metas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "kpi_metas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "kpi_metas_usuario_id_periodo_ciclo_idx" ON "kpi_metas"("usuario_id", "periodo", "ciclo");

-- 7. clientes
CREATE TABLE IF NOT EXISTS "clientes" (
  "id" UUID NOT NULL,
  "nome" TEXT NOT NULL,
  "empresa" TEXT NOT NULL,
  "segmento" TEXT,
  "contato" TEXT,
  "email" TEXT,
  "telefone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ATIVO',
  "origem" TEXT DEFAULT 'INBOUND',
  "responsavel_id" UUID NOT NULL,
  "observacoes" TEXT,
  "first_contact_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clientes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clientes_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "clientes_responsavel_id_idx" ON "clientes"("responsavel_id");
CREATE INDEX IF NOT EXISTS "clientes_empresa_idx" ON "clientes"("empresa");
CREATE INDEX IF NOT EXISTS "clientes_status_idx" ON "clientes"("status");
CREATE INDEX IF NOT EXISTS "clientes_created_at_idx" ON "clientes"("created_at");

-- 8. negociacoes
CREATE TABLE IF NOT EXISTS "negociacoes" (
  "id" UUID NOT NULL,
  "nome" TEXT NOT NULL,
  "cliente_id" UUID NOT NULL,
  "owner_id" UUID NOT NULL,
  "etapa_id" UUID NOT NULL,
  "valor" DECIMAL(15, 2) NOT NULL,
  "probabilidade" INTEGER NOT NULL DEFAULT 20,
  "status" "NegociacaoStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
  "motivo_perda" TEXT,
  "expected_close_date" TIMESTAMPTZ(6),
  "closed_date" TIMESTAMPTZ(6),
  "stage_changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "forecast_score" INTEGER,
  "produto" TEXT DEFAULT 'INBOUND_CONSULTORIA',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "negociacoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "negociacoes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "negociacoes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "negociacoes_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "negociacoes_owner_id_status_idx" ON "negociacoes"("owner_id", "status");
CREATE INDEX IF NOT EXISTS "negociacoes_etapa_id_idx" ON "negociacoes"("etapa_id");
CREATE INDEX IF NOT EXISTS "negociacoes_cliente_id_idx" ON "negociacoes"("cliente_id");
CREATE INDEX IF NOT EXISTS "negociacoes_closed_date_idx" ON "negociacoes"("closed_date");
CREATE INDEX IF NOT EXISTS "negociacoes_expected_close_date_idx" ON "negociacoes"("expected_close_date");
CREATE INDEX IF NOT EXISTS "negociacoes_stage_changed_at_idx" ON "negociacoes"("stage_changed_at");

-- 9. negociacao_atividades
CREATE TABLE IF NOT EXISTS "negociacao_atividades" (
  "id" UUID NOT NULL,
  "negociacao_id" UUID NOT NULL,
  "usuario_id" UUID NOT NULL,
  "tipo" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "descricao" TEXT,
  "realizada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "proxima_acao_em" TIMESTAMPTZ(6),
  "concluida" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "negociacao_atividades_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "negociacao_atividades_negociacao_id_fkey" FOREIGN KEY ("negociacao_id") REFERENCES "negociacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "negociacao_atividades_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "negociacao_atividades_negociacao_id_realizada_em_idx" ON "negociacao_atividades"("negociacao_id", "realizada_em");
CREATE INDEX IF NOT EXISTS "negociacao_atividades_usuario_id_idx" ON "negociacao_atividades"("usuario_id");

-- 10. negociacao_historico
CREATE TABLE IF NOT EXISTS "negociacao_historico" (
  "id" UUID NOT NULL,
  "negociacao_id" UUID NOT NULL,
  "usuario_id" UUID NOT NULL,
  "etapa_anterior_id" UUID,
  "etapa_nova_id" UUID,
  "status_anterior" TEXT,
  "status_novo" TEXT,
  "valor_anterior" DECIMAL(15, 2),
  "valor_novo" DECIMAL(15, 2),
  "acao" TEXT NOT NULL,
  "detalhes" TEXT,
  "tempo_na_etapa_segundos" INTEGER,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "negociacao_historico_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "negociacao_historico_negociacao_id_fkey" FOREIGN KEY ("negociacao_id") REFERENCES "negociacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "negociacao_historico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "negociacao_historico_etapa_anterior_id_fkey" FOREIGN KEY ("etapa_anterior_id") REFERENCES "stages"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "negociacao_historico_etapa_nova_id_fkey" FOREIGN KEY ("etapa_nova_id") REFERENCES "stages"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "negociacao_historico_negociacao_id_created_at_idx" ON "negociacao_historico"("negociacao_id", "created_at");

-- 11. rituais
CREATE TABLE IF NOT EXISTS "rituais" (
  "id" UUID NOT NULL,
  "codigo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "frequencia" "RitualFrequencia" NOT NULL,
  "descricao" TEXT NOT NULL,
  "regras_alerta" TEXT,
  "horario_padrao" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "ordem" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rituais_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rituais_codigo_key" UNIQUE ("codigo")
);
CREATE INDEX IF NOT EXISTS "rituais_frequencia_ordem_idx" ON "rituais"("frequencia", "ordem");

-- 12. ritual_execucoes
CREATE TABLE IF NOT EXISTS "ritual_execucoes" (
  "id" UUID NOT NULL,
  "ritual_id" UUID NOT NULL,
  "responsavel_id" UUID NOT NULL,
  "data_execucao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'CONCLUIDO',
  "observacoes" TEXT,
  "respostas_acompanhamento" TEXT,
  "pitch_score" INTEGER,
  "forecast_score" INTEGER,
  "negociacao_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ritual_execucoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ritual_execucoes_ritual_id_fkey" FOREIGN KEY ("ritual_id") REFERENCES "rituais"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ritual_execucoes_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ritual_execucoes_negociacao_id_fkey" FOREIGN KEY ("negociacao_id") REFERENCES "negociacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ritual_execucoes_ritual_id_data_execucao_idx" ON "ritual_execucoes"("ritual_id", "data_execucao");
CREATE INDEX IF NOT EXISTS "ritual_execucoes_responsavel_id_idx" ON "ritual_execucoes"("responsavel_id");

-- 13. assistente_conversas
CREATE TABLE IF NOT EXISTS "assistente_conversas" (
  "id" UUID NOT NULL,
  "usuario_id" UUID NOT NULL,
  "titulo" TEXT NOT NULL,
  "total_tokens" INTEGER NOT NULL DEFAULT 0,
  "custo_estimado_usd" DECIMAL(10, 6) NOT NULL DEFAULT 0,
  "arquivada" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assistente_conversas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assistente_conversas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "assistente_conversas_usuario_id_updated_at_idx" ON "assistente_conversas"("usuario_id", "updated_at");

-- 14. assistente_mensagens
CREATE TABLE IF NOT EXISTS "assistente_mensagens" (
  "id" UUID NOT NULL,
  "conversa_id" UUID NOT NULL,
  "role" TEXT NOT NULL,
  "conteudo" TEXT NOT NULL,
  "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
  "completion_tokens" INTEGER NOT NULL DEFAULT 0,
  "ferramentas_usadas" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assistente_mensagens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assistente_mensagens_conversa_id_fkey" FOREIGN KEY ("conversa_id") REFERENCES "assistente_conversas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "assistente_mensagens_conversa_id_created_at_idx" ON "assistente_mensagens"("conversa_id", "created_at");

-- 15. audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID NOT NULL,
  "usuario_id" UUID,
  "acao" TEXT NOT NULL,
  "entidade" TEXT NOT NULL,
  "entidade_id" TEXT,
  "detalhes" TEXT,
  "ip_address" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "audit_logs_usuario_id_created_at_idx" ON "audit_logs"("usuario_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_entidade_acao_idx" ON "audit_logs"("entidade", "acao");

-- 16. playbook_conteudos
CREATE TABLE IF NOT EXISTS "playbook_conteudos" (
  "id" UUID NOT NULL,
  "secao_numero" INTEGER NOT NULL,
  "secao_slug" TEXT NOT NULL,
  "secao_titulo" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "subtitulo" TEXT,
  "conteudo" TEXT NOT NULL,
  "etapa_ordem" INTEGER,
  "criterios_avanco" TEXT,
  "responsaveis" TEXT,
  "copiavel" BOOLEAN NOT NULL DEFAULT false,
  "oficial_importado" BOOLEAN NOT NULL DEFAULT false,
  "ordem" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "playbook_conteudos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "playbook_conteudos_secao_numero_ordem_idx" ON "playbook_conteudos"("secao_numero", "ordem");

-- 17. webhook_logs
CREATE TABLE IF NOT EXISTS "webhook_logs" (
  "id" UUID NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "direcao" TEXT NOT NULL DEFAULT 'INBOUND',
  "evento" TEXT NOT NULL,
  "origem" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "payload_resumo" TEXT,
  "erro" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "webhook_logs_idempotency_key_key" UNIQUE ("idempotency_key")
);
CREATE INDEX IF NOT EXISTS "webhook_logs_evento_created_at_idx" ON "webhook_logs"("evento", "created_at");

