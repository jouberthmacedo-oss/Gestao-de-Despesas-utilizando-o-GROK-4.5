# deManage

Gestão de despesas mensais.

## Estrutura

```
deManage/
  frontend/   # React + Vite + TypeScript
  backend/    # Express + TypeScript
```

## Desenvolvimento

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

App em `http://localhost:5180`

### Backend

```bash
cd backend
pnpm install
cp .env.example .env
pnpm dev
```

API em `http://localhost:8888` (`GET /health`)

## Fase 1

- UI dark neon (Dashboard, Perfil, Despesas, Entradas)
- Dados locais via Zustand + localStorage
- Login e registro usam a API de autenticação aceita no upstream

## Dados financeiros locais

- O financeiro ainda usa Zustand/localStorage, na chave canônica `demanage-finance-v2`.
- A fonte de salário local é uma entrada recorrente; o campo `User.salary` do Prisma permanece preservado e desconectado até a implementação do CRUD financeiro.
- A chave legada `demanage-finance` é importada apenas quando a chave canônica não contém um estado utilizável, sem reintroduzir dados de demonstração.

## Docs para agents

- [`AGENTS.md`](./AGENTS.md) — visão geral do projeto
- [`plans.md`](./plans.md) — roadmap de features (agents consultam sempre)
- [`CODING_STYLE.md`](./CODING_STYLE.md) — aspas simples + ponto e vírgula

```bash
cd frontend && pnpm format
cd backend && pnpm format
```
