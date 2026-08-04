# plans.md — Roadmap deManage

Checklist vivo das features. Agents devem **sempre** ler este arquivo e seguir a etapa que o usuário pedir.

## Como usar (agents)

1. Ler este arquivo no início da conversa / tarefa.
2. Confirmar com o usuário **qual etapa** ele quer fazer agora (não pular prioridades sem combinar).
3. Prefixo **`[HUMAN]`**: a IA **não implementa** — só orienta o usuário.
4. Ao concluir uma feature (implementada ou confirmada pelo humano):
   - Marcar `- [x]` (não apagar o item).
   - Pode riscar o título se ajudar a leitura: `~~texto~~`.
5. Não implementar backlog P2+ sem o usuário pedir explicitamente.

### Status

| Marcação | Significado |
|----------|-------------|
| `- [ ]` | Pendente |
| `- [x]` | Concluída |
| `[HUMAN]` | Só orientação; humano executa |

---

## P0 — Dados (maior prioridade)

### Schema e banco

- [x] **Prisma schema** — `backend/prisma/schema.prisma` com models `User`, `Card`, `Expense`, `Entry` + `DATABASE_URL` no `backend/.env.example`. PostgreSQL; IDs `uuid()`; timestamps; relações com `userId`.

  Detalhe dos models:
  - **User**: `id`, `name`, `email` (unique), `passwordHash`, `notes?`, relations
  - **Card**: `id`, `userId`, `name`, `limit?`, `closingDay?`, `dueDay?`
  - **Expense**: `id`, `userId`, `cardId?`, `name`, `amount`, `category` (assinatura\|parcela\|divida\|outro), `frequency` (mensal), `dueDay?`, `notes?`
  - **Entry**: `id`, `userId`, `name`, `amount`, `type` (salario\|freelance\|outro), `frequency` (mensal\|unica), `date?`

- [x] **`[HUMAN]` Docker / DB** — Subir PostgreSQL (Docker Compose ou outro), configurar `DATABASE_URL`, rodar `prisma migrate` / `generate` quando quiser. **IA só orienta**; não sobe o DB sozinha.

---

## P1 — Frontend

- [ ] **`[HUMAN]` Renovar o frontend** — Redesign / polish visual do app. **IA NÃO conclui esta tarefa.** Orientar o usuário com:
  - Arquivos-chave: `frontend/src/global.css`, `components/layout/`, `pages/`
  - Estilo alvo: dark `#0b0b0b`, CTA branco, gráficos neon âmbar/verde
  - Seguir `CODING_STYLE.md`
  - Entregar checklist e parar — o humano faz as mudanças

---

## P2+ — Backlog (não fazer sem pedido explícito)

- [x] ~~Auth / login real~~ — JWT em cookie httpOnly; `POST /auth/register|login|logout`, `GET /auth/me`; telas `/login` e `/register` (shadcn Field/Card); rotas do app protegidas. Financeiro ainda no Zustand/localStorage.
- [x] **Financeiro: salário recorrente como fonte única** — salário local recorrente, migração segura do campo legado do Prisma e payload autenticado sem salário.
- [x] **Financeiro: histórico mensal por calendário** — limites explícitos de recorrência, datas date-only e snapshots legados como fallback.
- [x] **Financeiro: faturas de cartão** — ciclos de fechamento/vencimento, totais por status e limite derivado.
- [x] **Financeiro: compras parceladas** — divisão exata em centavos, grupos estáveis e parcelas por ciclo.
- [x] **Financeiro: status de liquidação** — estados por ocorrência mensal/parcela com timestamps derivados.
- [x] **Financeiro: orçamentos mensais** — limite por categoria, uso planejado/pago e períodos sem sobreposição.
- [x] **Financeiro: metas de economia** — contribuições auditáveis, conclusão, edição e arquivamento.
- [x] ~~API CRUD Express + Prisma para cartões, despesas e entradas~~ — `GET`, `POST`, `PATCH` e `DELETE`; autenticação obrigatória, isolamento por `userId`, validação de payload, vínculo de cartão por proprietário e serialização de valores `Decimal`.
- [x] **Frontend: clientes de API e hooks preparados** — clientes e hooks React Query para cartões, despesas e entradas foram criados usando o cliente autenticado existente. Ainda não estão conectados às páginas.
- [x] **Dashboard: comprometimento dos cartões** — gráfico radial por cartão usando despesas ativas, liquidações e limites do estado financeiro atual.
- [ ] **Frontend: trocar Zustand/localStorage pela API** — migrar as telas e o estado financeiro sem perda de dados, mantendo compatibilidade com a persistência versão 4 e isolando os dados por usuário.
- [ ] **Perfil do usuário na API** — definir e implementar atualização persistente de nome/notas e demais campos de perfil além dos endpoints de autenticação.
- [ ] Seed / histórico mensal no DB (gráficos do dashboard)
