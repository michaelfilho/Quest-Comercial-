# Playbook de Vendas Quest — Sistema Comercial e Inteligência de Vendas

Plataforma corporativa Full-Stack desenvolvida para a **Quest Comunicação Total**, seguindo a identidade visual oficial **QUEST 2026** (`#FF5A00`, `#111111`, `#FFFFFF`, `#F5F5F5`, `#333333`, tipografia `Inter`).

---

## 1. Stack Tecnológica Implementada

- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, Lucide React, TanStack Query, React Router, Recharts, `@dnd-kit` (Kanban Drag-and-Drop).
- **Backend:** Node.js + TypeScript, Express, Zod, Argon2id (`@noble/hashes/argon2`), Cookies `HttpOnly`, RBAC Server-Side, Rate Limiting, Logs Estruturados (`pino`), SDK Oficial OpenAI.
- **Banco de Dados:** PostgreSQL 16 (Schema Prisma validado em `backend/prisma/schema.prisma`, Migrations SQL versionadas em `backend/prisma/migrations/0001_init/migration.sql`, suporte a `pg.Pool` para servidor externo/Docker e `@electric-sql/pglite` PostgreSQL 16 embarcado para execução local sem necessidade de Docker ativo).
- **Infraestrutura:** Docker, Docker Compose (`postgres:16-alpine`, `backend`, `frontend` Nginx), Health Checks (`/api/v1/health` e `/healthz`), pronto para deploy em **Coolify** ou **VPS Hostinger**.

---

## 2. Estrutura do Projeto

```text
playbook-quest/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── modules/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── contexts/
│   │   ├── types/
│   │   ├── lib/
│   │   └── assets/
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── validators/
│   │   ├── integrations/
│   │   ├── config/
│   │   └── jobs/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/0001_init/migration.sql
│   │   └── seed.ts
│   ├── tests/
│   └── Dockerfile
├── docs/
│   └── ARCHITECTURE.md
├── tests/
│   └── e2e/playbook.spec.ts
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 3. Contas Iniciais (Sem Senhas Fixas no Código)

O seed inicial (`npm run db:seed`) cria os 4 usuários oficiais da Quest sem senhas fixas:

1. **André Maciel** — `andre.maciel@questcomunicacao.com.br` — **Gestor**
2. **Tiago Hilário** — `tiago.hilario@questcomunicacao.com.br` — **Vendas Inbound / Consultoria**
3. **Katia Gebran** — `katia.gebran@questcomunicacao.com.br` — **Vendas Advertising**
4. **Debora Nigro** — `debora.nigro@questcomunicacao.com.br` — **Vendas Ad/Upselling**

Para ativar qualquer uma das contas no primeiro acesso, clique no usuário na tela de Login (ou em **Esqueci minha senha / 1º Acesso**), gere o token seguro de ativação com expiração e defina sua senha criptografada com **Argon2id**.

---

## 4. Como Executar Localmente

```bash
# 1. Instalar dependências (já instaladas neste ambiente)
npm install --prefix backend
npm install --prefix frontend

# 2. Executar seed inicial seguro
npm run db:seed

# 3. Iniciar Backend (porta 3001) e Frontend (porta 5173)
npm run dev:backend
npm run dev:frontend
```

---

## 5. Qualidade, Typecheck, Testes e Build

```bash
# Typecheck completo (Backend + Frontend)
npm run typecheck

# Testes Automatizados (Vitest Backend PostgreSQL + Vitest Frontend)
npm test

# Build de Produção (Backend + Frontend)
npm run build
```

---

## 6. Deploy em Produção (Coolify / VPS Hostinger)

1. Copie `.env.example` para `.env` e preencha `POSTGRES_PASSWORD`, `SESSION_SECRET`, `OPENAI_API_KEY` e `WEBHOOK_SHARED_SECRET`.
2. Execute:
   ```bash
   docker compose up -d --build
   ```
3. Verifique os health checks:
   - Backend API: `http://seu-dominio:3001/api/v1/health`
   - Aplicação Web: `http://seu-dominio:8080/healthz`

