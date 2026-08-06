import { Pencil, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ExpenseFormDialog } from '@/components/expenses/expense-form-dialog';
import { DeleteConfirmDialog } from '@/components/layout/delete-confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { PageHero } from '@/components/layout/page-hero';
import { SectionPanel } from '@/components/layout/section-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EXPENSE_CATEGORY_LABELS } from '@/data/labels';
import {
  getExpenseOccurrenceDate,
  getExpenseOccurrenceKey,
  getMonthKey,
  getSettlementStatus,
  getTodayDateString,
} from '@/lib/finance-calculations';
import { formatCurrency } from '@/lib/format';
import { selectMonthlyExpenses, useFinanceStore } from '@/stores/finance-store';
import type { ExpenseCategory, RecurringExpense } from '@/types/finance';

const categoryColors: Record<ExpenseCategory, string> = {
  assinatura: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  parcela: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  divida: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  outro: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
};

export function ExpensesPage() {
  const expenses = useFinanceStore((state) => state.expenses);
  const cards = useFinanceStore((state) => state.profile.cards);
  const removeExpense = useFinanceStore((state) => state.removeExpense);
  const settlements = useFinanceStore((state) => state.settlements);
  const setExpenseStatus = useFinanceStore((state) => state.setExpenseStatus);
  const total = useFinanceStore(selectMonthlyExpenses);
  const currentMonth = getMonthKey();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] =
    useState<RecurringExpense | null>(null);

  const filtered = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch = expense.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        category === 'all' || expense.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, search, category]);

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, expense) => sum + expense.amount, 0),
    [filtered],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(expense: RecurringExpense) {
    setEditing(expense);
    setDialogOpen(true);
  }

  function confirmDelete() {
    if (!expenseToDelete) return;
    removeExpense(expenseToDelete.id);
    toast.success(`Despesa "${expenseToDelete.name}" removida`);
    setExpenseToDelete(null);
  }

  return (
    <div className='space-y-6'>
      <title>Despesas | deManage</title>
      <PageHeader
        title='Despesas'
        description='Assinaturas, parcelas, dívidas e outros gastos recorrentes.'
        actions={
          <Button onClick={openCreate} className='rounded-lg'>
            <Plus className='size-4' />
            Nova despesa
          </Button>
        }
      />

      <PageHero
        eyebrow='Recorrências'
        title={`${expenses.length} despesa${expenses.length === 1 ? '' : 's'}`}
        description='Acompanhe o total mensal e filtre por categoria ou nome.'
      >
        <div className='grid gap-3 sm:grid-cols-2'>
          <div className='rounded-xl border border-border bg-black/25 p-4'>
            <p className='text-xs text-muted-foreground'>Total / mês</p>
            <p className='mt-2 text-2xl font-semibold text-neon-amber'>
              {formatCurrency(total)}
            </p>
          </div>
          <div className='rounded-xl border border-border bg-black/25 p-4'>
            <p className='text-xs text-muted-foreground'>Resultado do filtro</p>
            <p className='mt-2 text-2xl font-semibold'>
              {formatCurrency(filteredTotal)}
            </p>
          </div>
        </div>
      </PageHero>

      <SectionPanel>
        <div className='mb-4 flex flex-col gap-3 sm:flex-row'>
          <div className='relative flex-1'>
            <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Buscar despesas por nome...'
              className='rounded-lg pl-9'
            />
          </div>
          <Select
            value={category}
            onValueChange={(value) => {
              if (value) setCategory(value);
            }}
          >
            <SelectTrigger className='w-full rounded-lg sm:w-48'>
              <SelectValue placeholder='Categoria' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Todas</SelectItem>
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='overflow-x-auto rounded-xl border border-border bg-black/15'>
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Cartão</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className='text-right'>Valor</TableHead>
                <TableHead className='w-64 text-right'>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-40'>
                    <div className='flex flex-col items-center justify-center gap-2 text-center'>
                      <div className='flex size-12 items-center justify-center rounded-2xl bg-neon-amber/10'>
                        <Receipt className='size-6 text-neon-amber' />
                      </div>
                      <p className='font-medium'>Nenhuma despesa encontrada</p>
                      <p className='text-sm text-muted-foreground'>
                        Ajuste o filtro ou cadastre uma nova recorrência.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((expense) => {
                  const card = cards.find((item) => item.id === expense.cardId);
                  const occurrenceKey = getExpenseOccurrenceKey(
                    expense,
                    currentMonth,
                  );
                  const occurrenceDate = getExpenseOccurrenceDate(
                    expense,
                    currentMonth,
                  );
                  const status = getSettlementStatus(
                    settlements,
                    occurrenceKey,
                    'expense',
                    occurrenceDate,
                    getTodayDateString(),
                  );

                  return (
                    <TableRow key={expense.id}>
                      <TableCell className='font-medium'>
                        {expense.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant='outline'
                          className={categoryColors[expense.category]}
                        >
                          {EXPENSE_CATEGORY_LABELS[expense.category]}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {card?.name ?? '—'}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {expense.dueDay ? `Dia ${expense.dueDay}` : '—'}
                      </TableCell>
                      <TableCell className='text-right font-semibold'>
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-1'>
                          <Button
                            size='sm'
                            variant='secondary'
                            className='rounded-lg'
                            onClick={() =>
                              setExpenseStatus(
                                occurrenceKey,
                                status === 'paid' ? 'pending' : 'paid',
                              )
                            }
                            aria-label={`${status === 'paid' ? 'Marcar pendente' : 'Marcar paga'} ${expense.name}`}
                          >
                            {status === 'paid'
                              ? 'Paga'
                              : status === 'cancelled'
                                ? 'Cancelada'
                                : status === 'pending' &&
                                    occurrenceDate &&
                                    occurrenceDate < getTodayDateString()
                                  ? 'Em atraso'
                                  : 'Pendente'}
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() =>
                              setExpenseStatus(
                                occurrenceKey,
                                status === 'cancelled'
                                  ? 'pending'
                                  : 'cancelled',
                              )
                            }
                            aria-label={`${status === 'cancelled' ? 'Reabrir' : 'Cancelar'} ${expense.name}`}
                          >
                            {status === 'cancelled' ? 'Reabrir' : 'Cancelar'}
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={() => openEdit(expense)}
                            aria-label={`Editar despesa ${expense.name}`}
                          >
                            <Pencil className='size-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={() => setExpenseToDelete(expense)}
                            aria-label={`Excluir despesa ${expense.name}`}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <p className='mt-3 text-sm text-muted-foreground'>
          {filtered.length} despesa{filtered.length === 1 ? '' : 's'} •{' '}
          {formatCurrency(filteredTotal)} filtrado
          {filteredTotal !== total
            ? ` · ${formatCurrency(total)} no total`
            : ' / mês'}
        </p>
      </SectionPanel>

      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editing}
      />
      <DeleteConfirmDialog
        open={expenseToDelete !== null}
        itemName={expenseToDelete?.name ?? ''}
        onOpenChange={(open) => {
          if (!open) setExpenseToDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
