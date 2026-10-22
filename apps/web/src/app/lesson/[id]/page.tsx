'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { RequireRole } from '@/components/guard';
import { Player } from '@/components/player/player';
import { Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { getDownload } from '@/lib/offline';
import type { StartedRun } from '@/lib/types';

function OnlineLesson({ id }: { id: string }) {
  const load = useCallback(() => api<StartedRun>(`/lessons/${id}/start`, { method: 'POST' }), [id]);
  return <RequireRole roles={['CHILD', 'PARENT']}>{() => <Player mode="lesson" load={load} />}</RequireRole>;
}

/** Plays a downloaded lesson from this device; works without a connection. */
function OfflineLesson({ id }: { id: string }) {
  const load = useCallback(async () => {
    const d = await getDownload(id);
    if (!d) throw new Error('not downloaded');
    return d.payload;
  }, [id]);
  return <Player mode="offline" load={load} offlineLessonId={id} />;
}

function LessonRoute() {
  const { id } = useParams<{ id: string }>();
  const offline = useSearchParams().get('offline') === '1';
  return offline ? <OfflineLesson id={id} /> : <OnlineLesson id={id} />;
}

export default function LessonPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LessonRoute />
    </Suspense>
  );
}
