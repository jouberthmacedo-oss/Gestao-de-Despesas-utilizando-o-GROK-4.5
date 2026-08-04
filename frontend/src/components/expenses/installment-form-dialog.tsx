import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EXPENSE_CATEGORY_LABELS } from '@/data/labels';
import { isValidDateString } from '@/lib/finance-calculations';
import {
  isValidMoneyAmount,
  isValidName,
  isValidPositiveInteger,
} from '@/lib/finance-validation';
import { parseCurrencyInput } from '@/lib/format';
import { useFinanceStore } from '@/stores/finance-store';
import type { ExpenseCategory } from '@/types/finance';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };
type FormState = {
  name: string;
  total: string;
  count: string;
  purchaseDate: string;
  cardId: string;
  category: ExpenseCategory;
  notes: string;
};
const emptyForm: FormState = {
  name: '',
  total: '',
  count: '2',
  purchaseDate: new Date().toISOString().slice(0, 10),
  cardId: '',
  category: 'parcela',
  notes: '',
};

export function InstallmentFormDialog({ open, onOpenChange }: Props) {
  const cards = useFinanceStore((state) => state.profile.cards);
  const addInstallmentPlan = useFinanceStore(
    (state) => state.addInstallmentPlan,
  );
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (open)
      setForm({
        ...emptyForm,
        purchaseDate: new Date().toISOString().slice(0, 10),
        cardId: cards[0]?.id ?? '',
      });
  }, [open, cards]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const total = parseCurrencyInput(form.total);
    const count = Number(form.count);
    if (
      !isValidName(form.name) ||
      !isValidMoneyAmount(total) ||
      !isValidPositiveInteger(count) ||
      !isValidDateString(form.purchaseDate) ||
      !form.cardId
    ) {
      toast.error('Preencha os dados da compra parcelada');
      return;
    }
    addInstallmentPlan({
      name: form.name.trim(),
      total,
      count,
      purchaseDate: form.purchaseDate,
      cardId: form.cardId,
      category: form.category,
      notes: form.notes.trim() || undefined,
    });
    toast.success('Compra parcelada cadastrada');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='rounded-xl sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Nova compra parcelada</DialogTitle>
          <DialogDescription>
            As parcelas entram em ciclos sucessivos do cartão.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='installment-name'>Nome</Label>
            <Input
              id='installment-name'
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label htmlFor='installment-total'>Total</Label>
              <Input
                id='installment-total'
                value={form.total}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    total: event.target.value,
                  }))
                }
                placeholder='0,00'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='installment-count'>Parcelas</Label>
              <Input
                id='installment-count'
                type='number'
                min={1}
                value={form.count}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    count: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label htmlFor='installment-date'>Compra</Label>
              <Input
                id='installment-date'
                type='date'
                value={form.purchaseDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    purchaseDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className='space-y-2'>
              <Label>Cartão</Label>
              <Select
                value={form.cardId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, cardId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Selecione' />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='space-y-2'>
            <Label>Categoria</Label>
            <Select
              value={form.category}
              onValueChange={(value) =>
                setForm((current) => ({
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
            <Label htmlFor='installment-notes'>Observações</Label>
            <Textarea
              id='installment-notes'
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type='submit'>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
