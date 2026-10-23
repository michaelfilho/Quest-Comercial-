# Arquitetura Técnica e Especificação de Engenharia — Playbook de Vendas Quest

**Cliente:** Quest Comunicação Total  
**Sistema:** Playbook de Vendas Quest (CRM, Automação Comercial, BI e Inteligência de Vendas)  
**Identidade Visual:** QUEST 2026 (`#FF5A00`, `#111111`, `#FFFFFF`, `#F5F5F5`, `#333333`, Tipografia `Inter`)

---

## 1. Arquitetura Técnica em Três Camadas

O sistema foi projetado em arquitetura desacoplada de três camadas estritas, garantindo segurança, auditabilidade e preparação para implantação em VPS própria (Coolify / Hostinger VPS):

```
[ Cliente Web: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + TanStack Query ]
                                       │
                        HTTPS + Cookies HttpOnly (SameSite)
                                       ▼
[ API Backend: Node.js + Express + TypeScript + Zod + RBAC + Rate Limiting + Pino ]
          ├── Módulos de Domínio (Auth, CRM, Pipeline, Metas, Resultados, Equipe, Rituais, Playbook)
          ├── Camada de IA (OpenAI SDK Server-Side + Tool Calling Controlado + RAG Playbook)
          └── Camada de Integrações (Webhooks HMAC + Idempotência para n8n / Radar Quest)
                                       │
                         Protocolo SQL / Driver PostgreSQL
                                       ▼
[ Persistência: PostgreSQL 16 (Migrations Versionadas Prisma + Índices + Constraints FK) ]
```

### Princípios Arquiteturais
- **Zero Acesso Direto do Frontend ao Banco:** O frontend comunica-se exclusivamente com `/api/v1/*` via requisições autenticadas por cookie `HttpOnly`.
- **Cálculos Determinísticos Server-Side:** Todos os KPIs, taxas de conversão, projeções de metas, rankings, alertas de rituais (Regra de Ouro 12h, negócios parados >15 dias, elegibilidade de forecast $\ge 6$) são processados no backend sobre dados reais do PostgreSQL.
- **Segurança por Padrão:**
  - Senhas com hash **Argon2id** (parâmetros recomendados OWASP).
  - Sessões persistidas na tabela `sessions` com hash SHA-256 do token e entregues via cookie `HttpOnly`, `Secure` (em produção) e `SameSite=Lax`.
  - Controle de Acesso Baseado em Papéis (**RBAC**): `GESTOR` e `VENDEDOR` validados em middleware e no nível de query SQL (isolamento estrito por `owner_id` / `vendedor_id` para vendedores).
  - Sem senhas fixas no código: os 4 usuários iniciais (**André Maciel**, **Tiago Hilário**, **Katia Gebran**, **Debora Nigro**) são criados no seed sem senha estática e ativados via fluxo seguro de token de ativação/definição de senha (`password_reset_tokens`).
- **Portabilidade de Banco PostgreSQL:**
  - Definido em `backend/prisma/schema.prisma` (`provider = "postgresql"`) com migrations SQL versionadas em `backend/prisma/migrations/0001_init/migration.sql`.
  - Em VPS/Docker Compose, conecta-se ao container `postgres:16-alpine` via `pg.Pool`.
  - Em ambientes locais sem Docker instalado, inicializa automaticamente uma instância PostgreSQL 16 real embarcada (`@electric-sql/pglite`) persistida em disco (`./backend/data/pgdata`), executando as mesmas migrations SQL, tipos `DECIMAL(15,2)`, `TIMESTAMPTZ`, constraints e índices.

---

## 2. Identificação de Ambiguidades, Dependências e Informações Faltantes

Durante a análise da especificação e do diretório de trabalho, foram identificados os seguintes pontos e tomadas as respectivas decisões arquiteturais alinhadas às **14 Regras Obrigatórias**:

| Item / Dependência | Status no Repositório | Decisão Arquitetural Adotada |
| :--- | :--- | :--- |
| **1. Documento `Playbook Inbound Rev03`** | Não anexado na pasta inicial | Em cumprimento à **Regra 9** (*"Não inventar conteúdo oficial do playbook"*), o módulo **Playbook Inbound** possui as 7 seções obrigatórias estruturadas no banco (`playbook_conteudos`), com navegação scroll-spy, botões de cópia e editor/importador para Gestores inserirem o texto literal oficial do `Playbook Inbound Rev03` sem textos fictícios inventados. |
| **2. Planilha de Metas / KPIs do Tiago Hilário** | Não anexada na pasta inicial | Em cumprimento à **Seção 8** (*"Não inventar metas do Tiago Hilário. Deixar os campos preparados para cadastrar os dados reais da planilha"*), nenhuma meta fictícia foi gerada para Tiago Hilário. A tabela `kpi_metas` e a interface **KPIs do Funil — Produto Inbound + Consultoria** estão prontas e configuráveis pelo Gestor. |
| **3. Protótipos Visuais Anexados** | Nenhum arquivo de imagem anexado | Aplicado rigorosamente o **Design System Oficial QUEST 2026** (Seção 2): Laranja `#FF5A00`, Preto `#111111`, Branco `#FFFFFF`, Cinza Claro `#F5F5F5`, Cinza Escuro `#333333` e fonte `Inter`. |
| **4. Credenciais Externas (`OPENAI_API_KEY`, `SMTP_*`, `n8n`)** | Variáveis de ambiente externas | Configuradas exclusivamente no backend (`.env`). Quando `OPENAI_API_KEY` não estiver definida no ambiente local, o endpoint de IA informa claramente o status de configuração e executa as ferramentas internas autorizadas de consulta ao Playbook e CRM de forma determinística e auditável, mantendo suporte completo a streaming SSE com a API oficial da OpenAI assim que a chave for configurada. |
| **5. Ativação Inicial sem Senha Fixa e sem SMTP Configurado** | Requisito de Segurança (Seções 4 e 10) | O seed cria as 4 contas oficiais sem senha fixa. Na tela de login, a opção **"Primeiro Acesso / Esqueci minha senha"** gera um token criptográfico de uso único com expiração na tabela `password_reset_tokens` (e em ambiente de desenvolvimento/homologação sem SMTP ativo, disponibiliza o link seguro de ativação no log/resposta controlada de homologação para permitir a ativação imediata pelo administrador). |

---

## 3. Modelo de Dados Completo (PostgreSQL)

Todas as 15 entidades exigidas na Seção 14 (+ 2 tabelas de suporte para conteúdo do Playbook e logs de Webhooks) estão modeladas com chaves primárias UUID, chaves estrangeiras com integridade referencial, tipos `DECIMAL(15,2)` para moeda (BRL) e índices de performance:

1. **`users`**: `id`, `name`, `email` (UNIQUE), `password_hash` (nullable até ativação), `role` (`GESTOR` | `VENDEDOR`), `cargo`, `active`, `created_at`, `updated_at`.
2. **`sessions`**: `id`, `user_id` (FK `users`), `token_hash` (UNIQUE), `ip_address`, `user_agent`, `expires_at`, `revoked_at`, `created_at`.
3. **`password_reset_tokens`**: `id`, `user_id` (FK `users`), `token_hash` (UNIQUE), `purpose` (`ACCOUNT_ACTIVATION` | `PASSWORD_RESET`), `expires_at`, `used_at`, `created_at`.
4. **`stages`**: `id`, `nome` (UNIQUE), `slug` (UNIQUE), `ordem` (1 a 5: *Prospecção, Qualificação, Proposta, Negociação, Fechamento*), `probabilidade_padrao`, `cor`, `created_at`.
5. **`metas`**: `id`, `vendedor_id` (FK `users`, nullable para meta global da equipe), `tipo` (`MENSAL`, `ANUAL`, `INDICADOR_COMERCIAL`, `CICLO`), `periodo` (`YYYY-MM` ou `YYYY`), `ano`, `mes`, `ciclo`, `indicador_nome`, `valor_alvo` (`DECIMAL(15,2)`), `observacoes`, `created_at`, `updated_at`.
6. **`kpi_metas`**: `id`, `usuario_id` (FK `users`), `periodo`, `ciclo` (`GERAL`, `CICLO_1`, `CICLO_2`), `validacoes_radar_meta`, `validacoes_radar_realizado`, `taxa_agendamento_meta`, `taxa_agendamento_realizado`, `taxa_qualificacao_meta`, `taxa_qualificacao_realizado`, `taxa_aceite_diagnostico_meta`, `taxa_aceite_diagnostico_realizado`, `taxa_conversao_meta`, `taxa_conversao_realizado`, `ticket_medio_meta`, `ticket_medio_realizado`, `ciclo_dias_meta`, `ciclo_dias_realizado`, `ciclo_1_meta`, `ciclo_1_realizado`, `ciclo_2_meta`, `ciclo_2_realizado`, `previsao_receita`, `previsao_fechamentos`, `created_at`, `updated_at`.
7. **`clientes`**: `id`, `nome`, `empresa`, `segmento`, `contato`, `email`, `telefone`, `status`, `origem`, `responsavel_id` (FK `users`), `observacoes`, `first_contact_at`, `created_at`, `updated_at`.
8. **`negociacoes`**: `id`, `nome`, `cliente_id` (FK `clientes`), `owner_id` (FK `users`), `etapa_id` (FK `stages`), `valor` (`DECIMAL(15,2)`), `probabilidade` (`INT`), `status` (`EM_ANDAMENTO`, `GANHO`, `PERDIDO`), `motivo_perda`, `expected_close_date`, `closed_date`, `stage_changed_at`, `last_activity_at`, `forecast_score` (0..7), `produto`, `created_at`, `updated_at`.
9. **`negociacao_atividades`**: `id`, `negociacao_id` (FK `negociacoes`), `usuario_id` (FK `users`), `tipo`, `titulo`, `descricao`, `realizada_em`, `proxima_acao_em`, `concluida`, `created_at`.
10. **`negociacao_historico`**: `id`, `negociacao_id` (FK `negociacoes`), `usuario_id` (FK `users`), `etapa_anterior_id`, `etapa_nova_id`, `status_anterior`, `status_novo`, `valor_anterior`, `valor_novo`, `acao`, `detalhes`, `tempo_na_etapa_segundos`, `created_at`.
11. **`rituais`**: `id`, `codigo` (UNIQUE), `nome`, `frequencia` (`DIARIO`, `SEMANAL`, `MENSAL`, `TRIMESTRAL`), `descricao`, `regras_alerta`, `horario_padrao`, `ativo`, `ordem`, `created_at`.
12. **`ritual_execucoes`**: `id`, `ritual_id` (FK `rituais`), `responsavel_id` (FK `users`), `data_execucao`, `status`, `observacoes`, `respostas_acompanhamento`, `pitch_score`, `forecast_score`, `negociacao_id`, `created_at`, `updated_at`.
13. **`assistente_conversas`**: `id`, `usuario_id` (FK `users`), `titulo`, `total_tokens`, `custo_estimado_usd`, `arquivada`, `created_at`, `updated_at`.
14. **`assistente_mensagens`**: `id`, `conversa_id` (FK `assistente_conversas`), `role` (`user`, `assistant`, `system`, `tool`), `conteudo`, `prompt_tokens`, `completion_tokens`, `ferramentas_usadas`, `created_at`.
15. **`audit_logs`**: `id`, `usuario_id` (FK `users`), `acao`, `entidade`, `entidade_id`, `detalhes`, `ip_address`, `created_at`.
16. **`playbook_conteudos`** (Suporte Seção 12): `id`, `secao_numero` (1..7), `secao_slug`, `secao_titulo`, `categoria`, `titulo`, `subtitulo`, `conteudo`, `etapa_ordem`, `criterios_avanco`, `responsaveis`, `copiavel`, `oficial_importado`, `ordem`, `updated_by`, `updated_at`.
17. **`webhook_logs`** (Suporte Seção 15): `id`, `idempotency_key` (UNIQUE), `direcao` (`INBOUND` | `OUTBOUND`), `evento`, `origem`, `status`, `payload_resumo`, `erro`, `created_at`.

---

## 4. Fórmulas Oficiais dos KPIs (Backend)

1. **Receita no Período (BRL):**
   $$\text{Receita} = \sum \text{valor das negociações com } \text{status} = \text{'GANHO'} \text{ e } \text{closed\_date} \in [\text{início}, \text{fim}]$$
2. **Negócios em Andamento (Quantidade e Pipeline Ativo):**
   $$\text{Em Andamento} = \text{COUNT}(\text{negociações com } \text{status} = \text{'EM\_ANDAMENTO'})$$
3. **Taxa de Conversão (%):**
   $$\text{Taxa de Conversão} = \frac{\text{Negociações Ganhas no Período}}{\text{Negociações Ganhas} + \text{Negociações Perdidas no Período}} \times 100$$
   *(Quando o denominador é 0, retorna `0%` sem divisão por zero).*
4. **Percentual de Meta Atingido (%):**
   $$\text{Atingimento} = \frac{\text{Valor Realizado}}{\text{Valor Alvo}} \times 100$$
   - Semáforo (Seção 8): **Verde** ($\ge 90\%$), **Amarelo** ($50\%$ a $89,99\%$), **Vermelho** ($< 50\%$).
5. **Projeção de Atingimento Linear no Mês (BRL):**
   $$\text{Projeção} = \left(\frac{\text{Receita Realizada até Hoje}}{\text{Dia Atual do Mês}}\right) \times \text{Total de Dias do Mês}$$
6. **Ticket Médio (BRL):**
   $$\text{Ticket Médio} = \frac{\text{Receita de Negociações Ganhas}}{\text{Quantidade de Negociações Ganhas}}$$
7. **Ciclo Médio de Vendas (Dias):**
   $$\text{Ciclo Médio} = \text{MÉDIA}\left(\text{closed\_date} - \text{created\_at}\right) \text{ das negociações ganhas}$$
8. **Alertas Determinísticos de Rituais (Seção 11):**
   - **Regra de Ouro (Diário):** Leads/Clientes criados há mais de 12 horas sem `first_contact_at` e sem atividade registrada.
   - **WBR Pipeline (Semanal):** Negociações `EM_ANDAMENTO` com `stage_changed_at` ou `last_activity_at` anterior a 15 dias.
   - **Forecast Meeting (Mensal):** Elegibilidade de forecast somente para negociações com `forecast_score >= 6` no *7-Point Scorecard*.

---

## 5. Endpoints Principais da API REST (`/api/v1`)

- **Saúde & Infraestrutura:**
  - `GET /api/v1/health` — Status do servidor, banco de dados PostgreSQL e uptime.
- **Autenticação & Segurança:**
  - `POST /api/v1/auth/login` — Login com e-mail e senha (cria sessão HttpOnly).
  - `POST /api/v1/auth/logout` — Revoga sessão e limpa cookie.
  - `GET /api/v1/auth/me` — Usuário autenticado e permissões.
  - `POST /api/v1/auth/forgot-password` — Solicita token de ativação/recuperação de senha (`password_reset_tokens`).
  - `POST /api/v1/auth/reset-password` — Define nova senha com token válido (Argon2id).
  - `POST /api/v1/auth/change-password` — Alteração de senha pelo usuário logado.
  - `GET /api/v1/auth/initial-accounts` — Lista status de ativação das contas iniciais (sem expor credenciais) para facilitar o primeiro acesso.
- **Visão Geral & Resultados (BI):**
  - `GET /api/v1/dashboard/overview` — KPIs, evolução mensal, negócios por status, progresso de metas e comparativo de períodos (filtros: `month`, `year`, `startDate`, `endDate`, `sellerId`).
  - `GET /api/v1/resultados/analytics` — Receita por mês, ganhos vs. perdidos, funil por etapa, ranking de vendedores, ticket médio, taxa de conversão e ciclo médio.
- **Playbook — Pipeline Comercial & Clientes (CRM):**
  - `GET /api/v1/clientes` | `POST /api/v1/clientes` | `PUT /api/v1/clientes/:id` | `DELETE /api/v1/clientes/:id`
  - `GET /api/v1/pipeline` — Lista as 5 etapas fixas + negociações autorizadas com cálculo de tempo na etapa.
  - `POST /api/v1/negociacoes` — Cria negociação + registro inicial em `negociacao_historico`.
  - `GET /api/v1/negociacoes/:id` — Detalhes completos + atividades + histórico de movimentações.
  - `PUT /api/v1/negociacoes/:id` — Atualiza dados, valor, probabilidade, `forecast_score` e previsão.
  - `PATCH /api/v1/negociacoes/:id/stage` — Move card no Kanban (drag-and-drop) preservando histórico e registrando `tempo_na_etapa_segundos`.
  - `PATCH /api/v1/negociacoes/:id/status` — Marca como `GANHO`, `PERDIDO` ou `EM_ANDAMENTO`.
  - `POST /api/v1/negociacoes/:id/atividades` — Registra atividade comercial e atualiza `last_activity_at` e `first_contact_at`.
  - `DELETE /api/v1/negociacoes/:id` — Exclui negociação mediante confirmação explícita (`confirm: true`).
- **Metas & KPIs do Funil Inbound + Consultoria:**
  - `GET /api/v1/metas` | `POST /api/v1/metas` (Gestor) | `PUT /api/v1/metas/:id` (Gestor) | `DELETE /api/v1/metas/:id` (Gestor)
  - `GET /api/v1/metas/kpis-inbound` | `PUT /api/v1/metas/kpis-inbound` (Gestor) — Gestão dos KPIs do Funil Inbound + Consultoria (Validações no Radar, Agendamento, Qualificação, Aceite de Diagnóstico, Conversão, Ticket Médio, Ciclo Médio, Ciclo 1 e Ciclo 2).
- **Equipe (Exclusivo Gestores):**
  - `GET /api/v1/equipe` — Resumo da equipe, ranking e cards individuais com tendência.
  - `GET /api/v1/equipe/:id` — Painel detalhado individual do vendedor.
  - `POST /api/v1/equipe` — Cadastro de vendedor com geração de convite seguro de criação de senha.
  - `PUT /api/v1/equipe/:id` — Edição de dados e cargo.
  - `PATCH /api/v1/equipe/:id/status` — Ativação/desativação de conta (revoga sessões ativas ao desativar).
- **Rotinas e Rituais:**
  - `GET /api/v1/rituais` — Rituais agrupados por frequência (`DIARIO`, `SEMANAL`, `MENSAL`, `TRIMESTRAL`) + execuções + alertas determinísticos ativos em tempo real (Regra 12h, >15 dias parados, Forecast 7-Point Scorecard $\ge 6$).
  - `POST /api/v1/rituais/:id/execucoes` — Registra execução de ritual com observações, respostas das 3 perguntas, Pitch Score ou 7-Point Scorecard.
- **Playbook Inbound (Documentação Interativa):**
  - `GET /api/v1/playbook-inbound` — Retorna as 7 seções estruturadas.
  - `PUT /api/v1/playbook-inbound/:id` (Gestor) — Atualiza/importa conteúdo oficial do documento-mestre `Playbook Inbound Rev03`.
- **Assistente Comercial Quest (IA):**
  - `GET /api/v1/assistente/conversas` | `POST /api/v1/assistente/conversas` | `GET /api/v1/assistente/conversas/:id` | `DELETE /api/v1/assistente/conversas/:id`
  - `POST /api/v1/assistente/conversas/:id/mensagens` — Envia mensagem com suporte a streaming SSE (`text/event-stream`) ou JSON, controle de tokens/custos e ferramentas seguras de consulta ao Playbook, negociações e metas autorizadas.
- **Integrações & Webhooks (n8n / Radar Quest):**
  - `POST /api/v1/integrations/webhooks/inbound` — Recebe eventos autenticados por `x-quest-signature` / token com chave de idempotência (`x-idempotency-key`).
  - `GET /api/v1/integrations/webhooks/logs` (Gestor) — Histórico auditável de eventos.

