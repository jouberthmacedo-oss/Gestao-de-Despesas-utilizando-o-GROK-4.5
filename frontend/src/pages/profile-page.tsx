import { CreditCard, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DeleteConfirmDialog } from '@/components/layout/delete-confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { PageHero } from '@/components/layout/page-hero';
import { SectionPanel } from '@/components/layout/section-panel';
import { CardFormDialog } from '@/components/profile/card-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/format';
import { useFinanceStore } from '@/stores/finance-store';
import type { Card } from '@/types/finance';

export function ProfilePage() {
  const profile = useFinanceStore((state) => state.profile);
  const updateProfile = useFinanceStore((state) => state.updateProfile);
  const removeCard = useFinanceStore((state) => state.removeCard);

  const [name, setName] = useState(profile.name);
  const [notes, setNotes] = useState(profile.notes ?? '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);

  useEffect(() => {
    setName(profile.name);
    setNotes(profile.notes ?? '');
  }, [profile.name, profile.notes]);

  const totalLimit = useMemo(
    () => profile.cards.reduce((sum, card) => sum + (card.limit ?? 0), 0),
    [profile.cards],
  );

  function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault();
    updateProfile({
      name: name.trim() || 'Usuário',
      notes: notes.trim() || undefined,
    });
    toast.success('Perfil atualizado');
  }

  function openCreateCard() {
    setEditingCard(null);
    setDialogOpen(true);
  }

  function openEditCard(card: Card) {
    setEditingCard(card);
    setDialogOpen(true);
  }

  function confirmDeleteCard() {
    if (!cardToDelete) return;
    removeCard(cardToDelete.id);
    toast.success(`Cartão "${cardToDelete.name}" removido`);
    setCardToDelete(null);
  }

  return (
    <div className='space-y-6'>
      <title>Perfil | deManage</title>
      <PageHeader
        title='Perfil'
        description='Identidade, cartões e informações úteis para o mês.'
      />

      <PageHero
        eyebrow='Conta local'
        title={profile.name || 'Usuário'}
        description={
          profile.notes?.trim()
            ? profile.notes
            : 'Configure suas informações e cartões para organizar o mês com mais clareza.'
        }
      >
        <div className='grid gap-3 sm:grid-cols-2'>
          <div className='rounded-xl border border-border bg-black/25 p-4'>
            <div className='flex items-center gap-2 text-muted-foreground'>
              <UserRound className='size-4 text-neon-green' />
              <span className='text-xs'>Nome do perfil</span>
            </div>
            <p className='mt-2 truncate text-xl font-semibold tracking-tight'>
              {profile.name || 'Usuário'}
            </p>
          </div>
          <div className='rounded-xl border border-border bg-black/25 p-4'>
            <div className='flex items-center gap-2 text-muted-foreground'>
              <CreditCard className='size-4 text-neon-amber' />
              <span className='text-xs'>Limite dos cartões</span>
            </div>
            <p className='mt-2 text-xl font-semibold tracking-tight text-neon-amber'>
              {totalLimit > 0 ? formatCurrency(totalLimit) : '—'}
            </p>
            <p className='mt-1 text-xs text-muted-foreground'>
              {profile.cards.length} cartão
              {profile.cards.length === 1 ? '' : 'ões'} cadastrado
              {profile.cards.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </PageHero>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]'>
        <SectionPanel
          title='Informações gerais'
          description='Esses dados ficam vinculados ao seu estado financeiro local.'
        >
          <form onSubmit={handleSaveProfile} className='space-y-5'>
            <div className='space-y-2'>
              <Label htmlFor='profile-name'>Nome</Label>
              <Input
                id='profile-name'
                value={name}
                onChange={(event) => setName(event.target.value)}
                className='rounded-lg'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='profile-notes'>Observações</Label>
              <Textarea
                id='profile-notes'
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder='Metas, lembretes, anotações...'
                className='min-h-28 rounded-lg'
              />
            </div>

            <Button type='submit' className='rounded-lg'>
              Salvar perfil
            </Button>
          </form>
        </SectionPanel>

        <SectionPanel
          title='Cartões'
          description='Use os cartões ao vincular despesas recorrentes.'
          actions={
            <Button onClick={openCreateCard} className='rounded-lg'>
              <Plus className='size-4' />
              Adicionar cartão
            </Button>
          }
        >
          <div className='overflow-x-auto rounded-xl border border-border bg-black/15'>
            <Table>
              <TableHeader>
                <TableRow className='hover:bg-transparent'>
                  <TableHead>Nome</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className='w-24 text-right'>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.cards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='h-40'>
                      <div className='flex flex-col items-center justify-center gap-2 text-center'>
                        <div className='flex size-12 items-center justify-center rounded-2xl bg-neon-amber/10'>
                          <CreditCard className='size-6 text-neon-amber' />
                        </div>
                        <p className='font-medium'>Nenhum cartão cadastrado</p>
                        <p className='text-sm text-muted-foreground'>
                          Adicione o primeiro para organizar despesas e limites.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  profile.cards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className='font-medium'>{card.name}</TableCell>
                      <TableCell className='text-muted-foreground'>
                        {card.limit != null ? formatCurrency(card.limit) : '—'}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {card.closingDay ? `Dia ${card.closingDay}` : '—'}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {card.dueDay ? `Dia ${card.dueDay}` : '—'}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-1'>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={() => openEditCard(card)}
                            aria-label={`Editar cartão ${card.name}`}
                          >
                            <Pencil className='size-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={() => setCardToDelete(card)}
                            aria-label={`Excluir cartão ${card.name}`}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </SectionPanel>
      </div>

      <CardFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        card={editingCard}
      />
      <DeleteConfirmDialog
        open={cardToDelete !== null}
        itemName={cardToDelete?.name ?? ''}
        description={`Remover “${cardToDelete?.name ?? ''}”? As despesas vinculadas permanecerão cadastradas, mas ficarão sem cartão.`}
        onOpenChange={(open) => {
          if (!open) setCardToDelete(null);
        }}
        onConfirm={confirmDeleteCard}
      />
    </div>
  );
}
