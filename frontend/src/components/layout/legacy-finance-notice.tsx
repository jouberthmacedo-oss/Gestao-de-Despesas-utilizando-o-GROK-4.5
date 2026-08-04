import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  claimLegacyFinanceState,
  dismissLegacyFinanceState,
  getClaimableLegacyFinanceState,
  getFinanceStorageKey,
  hasLegacyFinanceDecision,
} from '@/lib/finance-storage';
import { useAuthStore } from '@/stores/auth-store';
import { useFinanceStore } from '@/stores/finance-store';

export function LegacyFinanceNotice() {
  const userId = useAuthStore((state) => state.user?.id);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!userId) {
      setAvailable(false);
      return;
    }

    try {
      const storage = window.localStorage;
      setAvailable(
        storage.getItem(getFinanceStorageKey(userId)) === null &&
          !hasLegacyFinanceDecision(storage, userId) &&
          getClaimableLegacyFinanceState(storage) !== null,
      );
    } catch {
      setAvailable(false);
    }
  }, [userId]);

  if (!userId || !available) return null;
  const authenticatedUserId = userId;

  function handleClaim() {
    try {
      const claimed = claimLegacyFinanceState(
        window.localStorage,
        authenticatedUserId,
      );
      if (!claimed) {
        setAvailable(false);
        toast.error('Os dados legados não puderam ser importados');
        return;
      }

      void Promise.resolve(useFinanceStore.persist.rehydrate()).then(() => {
        setAvailable(false);
        toast.success('Dados locais importados');
      });
    } catch {
      toast.error('Os dados legados não puderam ser importados');
    }
  }

  function handleStartEmpty() {
    try {
      dismissLegacyFinanceState(window.localStorage, authenticatedUserId);
    } finally {
      setAvailable(false);
    }
  }

  return (
    <section
      className='mb-6 rounded-xl border border-border bg-card p-4'
      aria-labelledby='legacy-finance-title'
    >
      <h2 id='legacy-finance-title' className='text-sm font-medium'>
        Encontramos dados locais antigos
      </h2>
      <p className='mt-1 text-sm text-muted-foreground'>
        Eles não serão vinculados automaticamente a esta conta. Escolha se
        deseja importá-los ou começar com um financeiro vazio.
      </p>
      <div className='mt-3 flex flex-wrap gap-2'>
        <Button type='button' size='sm' onClick={handleClaim}>
          Importar dados
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={handleStartEmpty}
        >
          Começar vazio
        </Button>
      </div>
    </section>
  );
}
