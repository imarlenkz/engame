'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const MAX_MS = 4000;

/** Records a short clip and sends it for an approximate pronunciation score. Audio is never stored. */
export function Recorder({ runToken, itemId, onScored }: { runToken: string; itemId: string; onScored(score: number): void }) {
  const { t, error: errMsg } = useI18n();
  const [state, setState] = useState<'idle' | 'recording' | 'sending'>('idle');
  const [result, setResult] = useState<{ score: number; transcript: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);

  async function start() {
    setError(null);
    setResult(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError(t('lesson.micDenied'));
      return;
    }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((tr) => tr.stop());
      setState('sending');
      const blob = new Blob(chunks, { type: rec.mimeType });
      const form = new FormData();
      form.append('runToken', runToken);
      form.append('itemId', itemId);
      form.append('clientId', crypto.randomUUID());
      form.append('audio', blob, 'speech');
      try {
        const res = await api<{ score: number; transcript: string | null }>('/pronunciation/assess', { form });
        setResult(res);
        onScored(res.score);
      } catch (err) {
        setError(errMsg(err));
      } finally {
        setState('idle');
      }
    };
    recorder.current = rec;
    rec.start();
    setState('recording');
    setTimeout(() => rec.state === 'recording' && rec.stop(), MAX_MS);
  }

  function stop() {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        className={`flex h-24 w-24 items-center justify-center rounded-full text-4xl text-white shadow-pop ${state === 'recording' ? 'animate-pulse bg-berry-500' : 'bg-brand-500'}`}
        onClick={state === 'recording' ? stop : start}
        disabled={state === 'sending'}
        aria-label={state === 'recording' ? t('lesson.recording') : t('lesson.record')}
      >
        {state === 'sending' ? '…' : '🎤'}
      </button>
      <p className="text-sm font-semibold text-slate-600">{state === 'recording' ? t('lesson.recording') : t('lesson.record')}</p>
      {result && (
        <div className="text-center">
          <p className={`text-xl font-black ${result.score >= 60 ? 'text-leaf-600' : 'text-amber-600'}`}>{t('lesson.speakScore', { n: result.score })}</p>
          {result.transcript && <p className="text-sm text-slate-500">{t('lesson.speakHeard', { text: result.transcript })}</p>}
        </div>
      )}
      {error && <p className="text-sm font-semibold text-berry-600">{error}</p>}
    </div>
  );
}
