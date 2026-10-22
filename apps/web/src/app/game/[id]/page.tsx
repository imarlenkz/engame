'use client';

import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import { RequireRole } from '@/components/guard';
import { Player } from '@/components/player/player';
import { api } from '@/lib/api';
import type { StartedRun } from '@/lib/types';

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const load = useCallback(() => api<StartedRun>(`/games/${id}/sessions`, { method: 'POST' }), [id]);
  return <RequireRole roles={['CHILD', 'PARENT']}>{() => <Player mode="game" load={load} />}</RequireRole>;
}
