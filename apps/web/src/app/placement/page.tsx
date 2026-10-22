'use client';

import { useCallback } from 'react';
import { RequireRole } from '@/components/guard';
import { Player } from '@/components/player/player';
import { api } from '@/lib/api';
import type { StartedRun } from '@/lib/types';

export default function PlacementPage() {
  const load = useCallback(() => api<StartedRun>('/placement'), []);
  return <RequireRole roles={['CHILD', 'PARENT']}>{() => <Player mode="placement" load={load} />}</RequireRole>;
}
