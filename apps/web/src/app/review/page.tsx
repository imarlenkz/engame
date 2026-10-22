'use client';

import { useCallback } from 'react';
import { RequireRole } from '@/components/guard';
import { Player } from '@/components/player/player';
import { api } from '@/lib/api';
import type { StartedRun } from '@/lib/types';

export default function ReviewPage() {
  const load = useCallback(() => api<StartedRun>('/review/start', { method: 'POST' }), []);
  return <RequireRole roles={['CHILD', 'PARENT']}>{() => <Player mode="review" load={load} />}</RequireRole>;
}
