import { create } from 'zustand';

import { api } from '@/lib/api';
import { FINANCE_QUERY_ROOT_KEY } from '@/lib/finance-query-keys';
import { queryClient } from '@/lib/query-client';
import { switchFinanceUser } from '@/stores/finance-store';
import type { AuthUser } from '@/types/auth';

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  fetchMe: () => Promise<AuthUser | null>;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.email === 'string' &&
    (record.notes === null || typeof record.notes === 'string') &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  );
}

function getAuthUser(value: unknown) {
  const user =
    typeof value === 'object' && value !== null
      ? (value as { user?: unknown }).user
      : undefined;
  if (!isAuthUser(user)) throw new Error('Resposta de autenticação inválida');
  return user;
}

function clearFinanceQueryCache() {
  queryClient.removeQueries({ queryKey: FINANCE_QUERY_ROOT_KEY });
  queryClient.removeQueries({ queryKey: ['cards'] });
  queryClient.removeQueries({ queryKey: ['expenses'] });
  queryClient.removeQueries({ queryKey: ['entries'] });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => {
    if (get().user?.id !== user?.id) clearFinanceQueryCache();
    switchFinanceUser(user?.id ?? null);
    set({
      user,
      isAuthenticated: Boolean(user),
      isLoading: false,
    });
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get<{ user: AuthUser }>('/auth/me');
      const user = getAuthUser(data);
      get().setUser(user);
      return user;
    } catch {
      get().setUser(null);
      return null;
    }
  },

  login: async (email, password) => {
    const { data } = await api.post<{ user: AuthUser }>('/auth/login', {
      email,
      password,
    });
    const user = getAuthUser(data);
    get().setUser(user);
    return user;
  },

  register: async (name, email, password) => {
    const { data } = await api.post<{ user: AuthUser }>('/auth/register', {
      name,
      email,
      password,
    });
    const user = getAuthUser(data);
    get().setUser(user);
    return user;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      get().setUser(null);
    }
  },
}));
