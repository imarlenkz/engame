'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, isApiError } from './api';
import type { Me } from './types';

const KEY = 'eg_me';

export const forgetMe = () => remember(null);

function remember(me: Me | null) {
  try {
    if (me) localStorage.setItem(KEY, JSON.stringify(me));
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable (private mode)
  }
}

function recall(): Me | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Me) : null;
  } catch {
    return null;
  }
}

/** The signed-in user, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const me = await api<Me>('/auth/me');
        remember(me);
        return me;
      } catch (err) {
        if (isApiError(err) && err.status === 401) {
          remember(null);
          return null;
        }
        // Offline: keep the last known session so downloaded lessons and menus still open.
        if (isApiError(err, 'NETWORK')) {
          const cached = recall();
          if (cached) return cached;
        }
        throw err;
      }
    },
    staleTime: 60_000,
  });
}

export function useRefreshMe() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['me'] });
}

export function homeFor(me: Me | null | undefined): string {
  if (!me) return '/login';
  switch (me.user.role) {
    case 'ADMIN':
      return '/admin';
    case 'TEACHER':
      return '/teacher';
    case 'CHILD':
      return '/play';
    case 'PARENT':
      return me.activeChildId ? '/play' : '/parent';
  }
}
