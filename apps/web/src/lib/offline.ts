'use client';

import { api } from './api';
import type { Answer, LocalizedText, StartedRun } from './types';

/**
 * Offline lessons. A downloaded lesson is a signed run (valid 7 days) with its answer keys, so the child can play
 * without a connection. Answers go to an outbox in IndexedDB and are replayed to POST /sync, where the server
 * regrades everything from the signed token. Nothing here is trusted by the server.
 */

const DB = 'engame';
const VERSION = 1;
const RUN_MAX_AGE_MS = 6.5 * 86_400_000;

export interface DownloadedLesson {
  lessonId: string;
  title: LocalizedText;
  downloadedAt: number;
  payload: StartedRun;
}

export interface OutboxAnswer {
  itemId: string;
  clientId: string;
  answer: Answer;
  responseMs?: number;
  answeredAt: string;
}

export interface OutboxRun {
  runId: string;
  runToken: string;
  title: LocalizedText;
  answers: OutboxAnswer[];
  complete?: { durationSec?: number; completedAt: string };
  updatedAt: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('lessons')) db.createObjectStore('lessons', { keyPath: 'lessonId' });
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'runId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: 'lessons' | 'outbox', mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

export const offlineSupported = () => typeof indexedDB !== 'undefined';

export async function listDownloads(): Promise<DownloadedLesson[]> {
  const all = await tx<DownloadedLesson[]>('lessons', 'readonly', (s) => s.getAll() as IDBRequest<DownloadedLesson[]>);
  const fresh = all.filter((l) => Date.now() - l.downloadedAt < RUN_MAX_AGE_MS);
  for (const stale of all.filter((l) => !fresh.includes(l))) await removeDownload(stale.lessonId);
  return fresh;
}

export const getDownload = (lessonId: string) =>
  tx<DownloadedLesson | undefined>('lessons', 'readonly', (s) => s.get(lessonId) as IDBRequest<DownloadedLesson | undefined>);

export const removeDownload = (lessonId: string) => tx('lessons', 'readwrite', (s) => s.delete(lessonId));

/** Collects every media URL in a run so the service worker caches them for offline play. */
function mediaUrls(run: StartedRun): string[] {
  const urls = new Set<string>();
  const visit = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    for (const [k, val] of Object.entries(v)) {
      if ((k === 'audioUrl' || k === 'imageUrl') && typeof val === 'string') urls.add(val);
      else if (typeof val === 'object') visit(val);
    }
  };
  visit(run.steps);
  return [...urls];
}

export async function downloadLesson(lessonId: string): Promise<DownloadedLesson> {
  const payload = await api<StartedRun>(`/lessons/${lessonId}/start?offline=1`, { method: 'POST' });
  if (!payload.lesson || !payload.run) throw new Error('Unexpected response');
  await Promise.allSettled(mediaUrls(payload).map((u) => fetch(u, { credentials: 'same-origin' })));
  const entry: DownloadedLesson = { lessonId, title: payload.lesson.title, downloadedAt: Date.now(), payload };
  await tx('lessons', 'readwrite', (s) => s.put(entry));
  return entry;
}

export const listOutbox = () => tx<OutboxRun[]>('outbox', 'readonly', (s) => s.getAll() as IDBRequest<OutboxRun[]>);

export async function queueAnswer(run: { runId: string; runToken: string; title: LocalizedText }, answer: OutboxAnswer) {
  const existing = await tx<OutboxRun | undefined>('outbox', 'readonly', (s) => s.get(run.runId) as IDBRequest<OutboxRun | undefined>);
  const entry: OutboxRun = existing ?? { ...run, answers: [], updatedAt: Date.now() };
  if (!entry.answers.some((a) => a.clientId === answer.clientId)) entry.answers.push(answer);
  entry.updatedAt = Date.now();
  await tx('outbox', 'readwrite', (s) => s.put(entry));
}

export async function queueComplete(run: { runId: string; runToken: string; title: LocalizedText }, durationSec: number) {
  const existing = await tx<OutboxRun | undefined>('outbox', 'readonly', (s) => s.get(run.runId) as IDBRequest<OutboxRun | undefined>);
  const entry: OutboxRun = existing ?? { ...run, answers: [], updatedAt: Date.now() };
  entry.complete = { durationSec, completedAt: new Date().toISOString() };
  entry.updatedAt = Date.now();
  await tx('outbox', 'readwrite', (s) => s.put(entry));
}

let syncing: Promise<{ sent: number; failed: number }> | null = null;

/** Sends queued runs. Runs the server rejects permanently (expired/invalid) are dropped; others stay queued. */
export function syncOutbox(): Promise<{ sent: number; failed: number }> {
  syncing ??= (async () => {
    let sent = 0;
    let failed = 0;
    try {
      const queued = (await listOutbox()).filter((r) => r.complete || r.answers.length);
      for (let i = 0; i < queued.length; i += 20) {
        const batch = queued.slice(i, i + 20);
        const res = await api<{ results: ({ ok: true } | { ok: false; code: string; retry: boolean })[] }>('/sync', {
          body: { runs: batch.map((r) => ({ runToken: r.runToken, answers: r.answers, complete: r.complete })) },
        });
        for (const [j, result] of res.results.entries()) {
          const run = batch[j]!;
          if (result.ok || !result.retry) {
            // An incomplete run stays so later answers can still be added; finished ones leave the outbox.
            if (!result.ok || run.complete) await tx('outbox', 'readwrite', (s) => s.delete(run.runId));
            else await tx('outbox', 'readwrite', (s) => s.put({ ...run, answers: [] }));
            if (result.ok) sent++;
            else failed++;
          } else {
            failed++;
          }
        }
      }
    } finally {
      syncing = null;
    }
    return { sent, failed };
  })();
  return syncing;
}

/**
 * Called on sign-out: sends what can still be sent, then removes downloaded lessons, the queue and cached
 * media so the next person on a shared device starts clean.
 */
export async function clearOfflineData(): Promise<void> {
  if (!offlineSupported()) return;
  if (navigator.onLine) await syncOutbox().catch(() => undefined);
  await tx('lessons', 'readwrite', (s) => s.clear()).catch(() => undefined);
  await tx('outbox', 'readwrite', (s) => s.clear()).catch(() => undefined);
  navigator.serviceWorker?.controller?.postMessage('clear-media');
}
