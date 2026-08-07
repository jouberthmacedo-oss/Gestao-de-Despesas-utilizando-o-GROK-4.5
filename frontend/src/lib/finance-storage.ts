import { hasUsablePersistedState } from '@/lib/finance-migration';

export const FINANCE_STORAGE_KEY = 'demanage-finance-v2';
export const LEGACY_FINANCE_STORAGE_KEY = 'demanage-finance';
export const FINANCE_STORAGE_PREFIX = `${FINANCE_STORAGE_KEY}:user:`;
export const LEGACY_FINANCE_CLAIM_KEY = `${FINANCE_STORAGE_KEY}:legacy-claim`;
export const LEGACY_FINANCE_DECISION_PREFIX = `${FINANCE_STORAGE_KEY}:legacy-decision:`;

export type RawStorage = {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
};

export type FinanceStorage = RawStorage & {
  setUserId: (userId: string | null) => void;
};

export type LegacyFinanceCandidate = {
  key: string;
  raw: string;
};

export function getFinanceStorageKey(userId: string) {
  return `${FINANCE_STORAGE_PREFIX}${encodeURIComponent(userId)}`;
}

function getLegacyDecisionKey(userId: string) {
  return `${LEGACY_FINANCE_DECISION_PREFIX}${encodeURIComponent(userId)}`;
}

function isVersionFourState(raw: string | null) {
  if (!raw) return false;
  try {
    const value = JSON.parse(raw) as { version?: unknown };
    return value.version === 4 && hasUsablePersistedState(raw);
  } catch {
    return false;
  }
}

export function getClaimableLegacyFinanceState(
  storage: RawStorage,
): LegacyFinanceCandidate | null {
  if (storage.getItem(LEGACY_FINANCE_CLAIM_KEY) !== null) return null;

  for (const key of [FINANCE_STORAGE_KEY, LEGACY_FINANCE_STORAGE_KEY]) {
    const raw = storage.getItem(key);
    if (isVersionFourState(raw)) return { key, raw: raw as string };
  }

  return null;
}

export function hasLegacyFinanceDecision(storage: RawStorage, userId: string) {
  return storage.getItem(getLegacyDecisionKey(userId)) !== null;
}

export function dismissLegacyFinanceState(storage: RawStorage, userId: string) {
  storage.setItem(getLegacyDecisionKey(userId), 'empty');
}

export function claimLegacyFinanceState(storage: RawStorage, userId: string) {
  const candidate = getClaimableLegacyFinanceState(storage);
  const scopedKey = getFinanceStorageKey(userId);
  if (!candidate || storage.getItem(scopedKey) !== null) return false;

  try {
    storage.setItem(scopedKey, candidate.raw);
    if (storage.getItem(scopedKey) !== candidate.raw) return false;
    storage.setItem(
      LEGACY_FINANCE_CLAIM_KEY,
      JSON.stringify({ claimedAt: new Date().toISOString(), userId }),
    );
    return storage.getItem(LEGACY_FINANCE_CLAIM_KEY) !== null;
  } catch {
    return false;
  }
}

export function createFinanceStorage(storage: RawStorage): FinanceStorage {
  let activeUserId: string | null = null;

  return {
    getItem: (name) => {
      if (name !== FINANCE_STORAGE_KEY) return storage.getItem(name);
      return activeUserId
        ? storage.getItem(getFinanceStorageKey(activeUserId))
        : null;
    },
    setItem: (name, value) => {
      if (name !== FINANCE_STORAGE_KEY) {
        storage.setItem(name, value);
      } else if (activeUserId) {
        storage.setItem(getFinanceStorageKey(activeUserId), value);
      }
    },
    removeItem: (name) => {
      if (name !== FINANCE_STORAGE_KEY) {
        storage.removeItem(name);
      } else if (activeUserId) {
        storage.removeItem(getFinanceStorageKey(activeUserId));
      }
    },
    setUserId: (userId) => {
      activeUserId = userId?.trim() || null;
    },
  };
}
