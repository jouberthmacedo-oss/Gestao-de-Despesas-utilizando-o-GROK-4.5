import { hasUsablePersistedState } from '@/lib/finance-migration';

export const FINANCE_STORAGE_KEY = 'demanage-finance-v2';
export const LEGACY_FINANCE_STORAGE_KEY = 'demanage-finance';

export type RawStorage = {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
};

export function createFinanceStorage(storage: RawStorage): RawStorage {
  return {
    getItem: (name) => {
      if (name !== FINANCE_STORAGE_KEY) return storage.getItem(name);

      const canonical = storage.getItem(FINANCE_STORAGE_KEY);
      if (hasUsablePersistedState(canonical)) return canonical;

      const legacy = storage.getItem(LEGACY_FINANCE_STORAGE_KEY);
      if (hasUsablePersistedState(legacy)) return legacy;

      return canonical ?? legacy;
    },
    setItem: (name, value) => storage.setItem(name, value),
    removeItem: (name) => storage.removeItem(name),
  };
}
