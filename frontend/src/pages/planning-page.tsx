import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { InstallmentFormDialog } from '@/components/expenses/installment-form-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EXPENSE_CATEGORY_LABELS } from '@/data/labels';
import {
  getMonthKey,
  getNextMonthKey,
  getPreviousMonthKey,
  getTodayDateString,
} from '@/lib/finance-calculations';
import {
  getBudgetUsage,
  getCardInvoices,
  getGoalProgress,
} from '@/lib/finance-planning';
import {
  formatCurrency,
  formatMonthLabel,
  formatPercent,
  parseCurrencyInput,
} from '@/lib/format';
import { useFinanceStore } from '@/stores/finance-store';
import type { ExpenseCategory } from '@/types/finance';

export function PlanningPage() {
  const cards = useFinanceStore((state) => state.profile.cards);
  const expenses = useFinanceStore((state) => state.expenses);
  const settlements = useFinanceStore((state) => state.settlements);
  const budgets = useFinanceStore((state) => state.budgets);
  const goals = useFinanceStore((state) => state.goals);
  const contributions = useFinanceStore((state) => state.contributions);
  const addBudget = useFinanceStore((state) => state.addBudget);
  const removeBudget = useFinanceStore((state) => state.removeBudget);
  const addGoal = useFinanceStore((state) => state.addGoal);
  const updateGoal = useFinanceStore((state) => state.updateGoal);
  const archiveGoal = useFinanceStore((state) => state.archiveGoal);
  const addContribution = useFinanceStore((state) => state.addContribution);
  const removeContribution = useFinanceStore(
    (state) => state.removeContribution,
  );
  const setExpenseStatus = useFinanceStore((state) => state.setExpenseStatus);
  const currentMonth = getMonthKey();
  const [installmentsOpen, setInstallmentsOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    category: 'assinatura' as ExpenseCategory,
    limit: '',
    startMonth: currentMonth,
    endMonth: '',
  });
  const [goalForm, setGoalForm] = useState({
    name: '',
    target: '',
    targetDate: '',
  });
  const [contributionForm, setContributionForm] = useState({
    goalId: '',
    amount: '',
    date: getTodayDateString(),
    note: '',
  });
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editGoalForm, setEditGoalForm] = useState({
    name: '',
    target: '',
    targetDate: '',
  });

  const invoiceStart = getPreviousMonthKey(getPreviousMonthKey(currentMonth));
  const invoiceEnd = getNextMonthKey(currentMonth);
  const invoices = useMemo(
    () =>
      cards.flatMap((card) =>
        getCardInvoices(card, expenses, settlements, invoiceStart, invoiceEnd),
      ),
    [cards, expenses, settlements, invoiceEnd, invoiceStart],
  );
  const visibleGoals = goals.filter(
    (goal) => showArchived || goal.status !== 'archived',
  );

  function handleBudgetSubmit(event: React.FormEvent) {
    event.preventDefault();
    const limit = parseCurrencyInput(budgetForm.limit);
    addBudget({
      category: budgetForm.category,
      monthlyLimit: limit,
      startMonth: budgetForm.startMonth,
      endMonth: budgetForm.endMonth || undefined,
    });
    setBudgetForm((current) => ({ ...current, limit: '' }));
    toast.success('Orçamento salvo');
  }

  function handleGoalSubmit(event: React.FormEvent) {
    event.preventDefault();
    const targetAmount = parseCurrencyInput(goalForm.target);
    addGoal({
      name: goalForm.name,
      targetAmount,
      targetDate: goalForm.targetDate || undefined,
    });
    setGoalForm({ name: '', target: '', targetDate: '' });
    toast.success('Meta criada');
  }

  function startEditingGoal(goalId: string) {
    const goal = goals.find((item) => item.id === goalId);
    if (!goal) return;
    setEditingGoal(goalId);
    setEditGoalForm({
      name: goal.name,
      target: String(goal.targetAmount).replace('.', ','),
      targetDate: goal.targetDate ?? '',
    });
  }

  function saveGoal(event: React.FormEvent) {
    event.preventDefault();
    if (!editingGoal) return;
    updateGoal(editingGoal, {
      name: editGoalForm.name,
      targetAmount: parseCurrencyInput(editGoalForm.target),
      targetDate: editGoalForm.targetDate || undefined,
    });
    setEditingGoal(null);
    toast.success('Meta atualizada');
  }

  function handleContributionSubmit(event: React.FormEvent) {
    event.preventDefault();
    addContribution({
      goalId: contributionForm.goalId,
      amount: parseCurrencyInput(contributionForm.amount),
      date: contributionForm.date,
      note: contributionForm.note || undefined,
    });
    setContributionForm((current) => ({ ...current, amount: '', note: '' }));
    toast.success('Contribuição adicionada');
  }

  return (
    <div className='space-y-8'>
      <title>Planejamento | deManage</title>
      <PageHeader
        title='Planejamento'
        description='Faturas, parcelas, orçamentos e metas com dados locais.'
        actions={
          <Button onClick={() => setInstallmentsOpen(true)}>
            Nova compra parcelada
          </Button>
        }
      />

      <section className='space-y-4'>
        <div>
          <h2 className='text-lg font-medium'>Faturas dos cartões</h2>
          <p className='text-sm text-muted-foreground'>
            Ciclo por data de fechamento; valores são derivados das despesas
            vinculadas.
          </p>
        </div>
        <div className='grid gap-4 lg:grid-cols-2'>
          {invoices.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              Cadastre cartões com fechamento e vencimento para ver faturas.
            </p>
          ) : (
            invoices.map((invoice) => (
              <article
                key={invoice.key}
                className='space-y-3 rounded-xl border border-border p-4'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <h3 className='font-medium'>
                      {cards.find((card) => card.id === invoice.cardId)?.name}
                    </h3>
                    <p className='text-sm text-muted-foreground'>
                      {formatMonthLabel(invoice.month)} · fecha{' '}
                      {invoice.closingDate} · vence {invoice.dueDate}
                    </p>
                  </div>
                  <Badge variant='outline'>
                    {formatCurrency(invoice.total)}
                  </Badge>
                </div>
                <p className='text-sm'>
                  Paga: {formatCurrency(invoice.paid)} · Pendente:{' '}
                  {formatCurrency(invoice.pending)} · Em atraso:{' '}
                  {formatCurrency(invoice.overdue)}
                </p>
                {invoice.usedLimit !== undefined ? (
                  <p className='text-sm text-muted-foreground'>
                    Limite usado: {formatCurrency(invoice.usedLimit)} ·
                    Disponível: {formatCurrency(invoice.availableLimit ?? 0)}
                  </p>
                ) : null}
                <div className='space-y-2 border-t border-border pt-2'>
                  {invoice.items.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>Sem itens.</p>
                  ) : (
                    invoice.items.map((item) => (
                      <div
                        key={item.occurrenceKey}
                        className='flex items-center justify-between gap-2 text-sm'
                      >
                        <span>
                          {item.expense.name}
                          {item.expense.installmentNumber &&
                          item.expense.installmentCount
                            ? ` (${item.expense.installmentNumber} de ${item.expense.installmentCount})`
                            : ''}
                        </span>
                        <span className='flex items-center gap-2'>
                          <span>{formatCurrency(item.expense.amount)}</span>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() =>
                              setExpenseStatus(
                                item.occurrenceKey,
                                item.status === 'paid' ? 'pending' : 'paid',
                              )
                            }
                            aria-label={`Alternar pagamento de ${item.expense.name}`}
                          >
                            {item.status === 'paid' ? 'Pendente' : 'Paga'}
                          </Button>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className='space-y-4'>
        <div>
          <h2 className='text-lg font-medium'>Orçamentos mensais</h2>
          <p className='text-sm text-muted-foreground'>
            Uma categoria não pode ter períodos ativos sobrepostos.
          </p>
        </div>
        <form
          onSubmit={handleBudgetSubmit}
          className='grid gap-3 rounded-xl border border-border p-4 md:grid-cols-5'
        >
          <div className='space-y-2'>
            <Label>Categoria</Label>
            <Select
              value={budgetForm.category}
              onValueChange={(value) =>
                setBudgetForm((current) => ({
                  ...current,
                  category: value as ExpenseCategory,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='budget-limit'>Limite</Label>
            <Input
              id='budget-limit'
              value={budgetForm.limit}
              onChange={(event) =>
                setBudgetForm((current) => ({
                  ...current,
                  limit: event.target.value,
                }))
              }
              placeholder='0,00'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='budget-start'>Início</Label>
            <Input
              id='budget-start'
              type='month'
              value={budgetForm.startMonth}
              onChange={(event) =>
                setBudgetForm((current) => ({
                  ...current,
                  startMonth: event.target.value,
                }))
              }
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='budget-end'>Fim</Label>
            <Input
              id='budget-end'
              type='month'
              value={budgetForm.endMonth}
              onChange={(event) =>
                setBudgetForm((current) => ({
                  ...current,
                  endMonth: event.target.value,
                }))
              }
            />
          </div>
          <Button type='submit' className='self-end'>
            Adicionar
          </Button>
        </form>
        <div className='grid gap-3 md:grid-cols-2'>
          {budgets.map((budget) => {
            const usage = getBudgetUsage(
              budget,
              expenses,
              settlements,
              currentMonth,
            );
            return (
              <article
                key={budget.id}
                className='rounded-xl border border-border p-4'
              >
                <div className='flex justify-between gap-2'>
                  <h3 className='font-medium'>
                    {EXPENSE_CATEGORY_LABELS[budget.category]}
                  </h3>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => removeBudget(budget.id)}
                    aria-label={`Remover orçamento de ${EXPENSE_CATEGORY_LABELS[budget.category]}`}
                  >
                    Remover
                  </Button>
                </div>
                <p className='text-sm'>
                  Planejado: {formatCurrency(usage.planned)} · Pago:{' '}
                  {formatCurrency(usage.paid)}
                </p>
                <p className='text-sm'>
                  Limite: {formatCurrency(budget.monthlyLimit)} · Restante:{' '}
                  {formatCurrency(usage.remaining)}
                </p>
                <p
                  className='text-sm'
                  aria-label={
                    usage.overBudget
                      ? 'Orçamento estourado'
                      : 'Orçamento dentro do limite'
                  }
                >
                  {usage.overBudget
                    ? 'Acima do limite'
                    : `${formatPercent(usage.percentageUsed)} usado`}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className='space-y-4'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-medium'>Metas de economia</h2>
            <p className='text-sm text-muted-foreground'>
              O progresso é a soma auditável das contribuições.
            </p>
          </div>
          <Button
            variant='outline'
            onClick={() => setShowArchived((current) => !current)}
          >
            {showArchived ? 'Ocultar arquivadas' : 'Mostrar arquivadas'}
          </Button>
        </div>
        <form
          onSubmit={handleGoalSubmit}
          className='grid gap-3 rounded-xl border border-border p-4 md:grid-cols-4'
        >
          <div className='space-y-2'>
            <Label htmlFor='goal-name'>Nome</Label>
            <Input
              id='goal-name'
              value={goalForm.name}
              onChange={(event) =>
                setGoalForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='goal-target'>Alvo</Label>
            <Input
              id='goal-target'
              value={goalForm.target}
              onChange={(event) =>
                setGoalForm((current) => ({
                  ...current,
                  target: event.target.value,
                }))
              }
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='goal-date'>Data alvo</Label>
            <Input
              id='goal-date'
              type='date'
              value={goalForm.targetDate}
              onChange={(event) =>
                setGoalForm((current) => ({
                  ...current,
                  targetDate: event.target.value,
                }))
              }
            />
          </div>
          <Button type='submit' className='self-end'>
            Criar meta
          </Button>
        </form>
        <form
          onSubmit={handleContributionSubmit}
          className='grid gap-3 rounded-xl border border-border p-4 md:grid-cols-5'
        >
          <div className='space-y-2'>
            <Label>Meta</Label>
            <Select
              value={contributionForm.goalId}
              onValueChange={(value) =>
                setContributionForm((current) => ({
                  ...current,
                  goalId: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Selecione' />
              </SelectTrigger>
              <SelectContent>
                {goals
                  .filter((goal) => goal.status !== 'archived')
                  .map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='contribution-amount'>Valor</Label>
            <Input
              id='contribution-amount'
              value={contributionForm.amount}
              onChange={(event) =>
                setContributionForm((current) => ({
                  ...current,
                  amount: event.target.value,
                }))
              }
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='contribution-date'>Data</Label>
            <Input
              id='contribution-date'
              type='date'
              value={contributionForm.date}
              onChange={(event) =>
                setContributionForm((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='contribution-note'>Nota</Label>
            <Input
              id='contribution-note'
              value={contributionForm.note}
              onChange={(event) =>
                setContributionForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
            />
          </div>
          <Button type='submit' className='self-end'>
            Adicionar
          </Button>
        </form>
        <div className='grid gap-3 md:grid-cols-2'>
          {visibleGoals.map((goal) => {
            const progress = getGoalProgress(goal, contributions);
            return (
              <article
                key={goal.id}
                className='space-y-3 rounded-xl border border-border p-4'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <h3 className='font-medium'>{goal.name}</h3>
                    <p className='text-sm text-muted-foreground'>
                      {goal.targetDate
                        ? `Alvo: ${goal.targetDate}`
                        : 'Sem data alvo'}{' '}
                      · {goal.status}
                    </p>
                  </div>
                  <span className='text-sm'>
                    {formatPercent(progress.displayPercentage)}
                  </span>
                </div>
                <p className='text-sm'>
                  Guardado: {formatCurrency(progress.saved)} · Restante:{' '}
                  {formatCurrency(progress.remaining)} · Alvo:{' '}
                  {formatCurrency(goal.targetAmount)}
                </p>
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => startEditingGoal(goal.id)}
                  >
                    Editar
                  </Button>
                  {goal.status !== 'archived' ? (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => archiveGoal(goal.id)}
                    >
                      Arquivar
                    </Button>
                  ) : null}
                </div>
                {editingGoal === goal.id ? (
                  <form
                    onSubmit={saveGoal}
                    className='grid gap-2 border-t border-border pt-3'
                  >
                    <Input
                      aria-label='Nome da meta'
                      value={editGoalForm.name}
                      onChange={(event) =>
                        setEditGoalForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                    <Input
                      aria-label='Alvo da meta'
                      value={editGoalForm.target}
                      onChange={(event) =>
                        setEditGoalForm((current) => ({
                          ...current,
                          target: event.target.value,
                        }))
                      }
                    />
                    <Input
                      aria-label='Data alvo da meta'
                      type='date'
                      value={editGoalForm.targetDate}
                      onChange={(event) =>
                        setEditGoalForm((current) => ({
                          ...current,
                          targetDate: event.target.value,
                        }))
                      }
                    />
                    <Button type='submit'>Salvar</Button>
                  </form>
                ) : null}
                <ul className='space-y-1 border-t border-border pt-2 text-sm'>
                  {contributions
                    .filter((contribution) => contribution.goalId === goal.id)
                    .map((contribution) => (
                      <li
                        key={contribution.id}
                        className='flex justify-between gap-2'
                      >
                        <span>
                          {contribution.date} ·{' '}
                          {formatCurrency(contribution.amount)}
                          {contribution.note ? ` · ${contribution.note}` : ''}
                        </span>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => removeContribution(contribution.id)}
                          aria-label='Remover contribuição'
                        >
                          Remover
                        </Button>
                      </li>
                    ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>
      <InstallmentFormDialog
        open={installmentsOpen}
        onOpenChange={setInstallmentsOpen}
      />
    </div>
  );
}
