'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { stopAudio } from '@/lib/audio';
import { gradeLocally } from '@/lib/grade';
import { useI18n } from '@/lib/i18n';
import { queueAnswer, queueComplete, removeDownload, syncOutbox } from '@/lib/offline';
import type { Answer, AnswerResult, ClientItem, CompleteResult, StartedRun, Step } from '@/lib/types';
import { StepBar } from '../night';
import { ErrorBox, ProgressBar, Spinner, Stars } from '../ui';
import { Recorder } from './recorder';
import { ChoiceView, MatchView, OrderView, PresentView, SpeakView, type Feedback } from './views';

export type PlayerMode = 'lesson' | 'review' | 'placement' | 'game' | 'offline';

interface FlatItem {
  item: ClientItem;
  step: Step;
}

type Finish =
  | { kind: 'lesson'; result: CompleteResult }
  | { kind: 'game'; result: { outcome: { score: number; accuracy: number; xp: number; coins: number; correct: number; total: number }; achievements: CompleteResult['achievements']; missions: CompleteResult['missions'] } }
  | { kind: 'placement' }
  | { kind: 'offline'; accuracy: number };

function uuid() {
  return crypto.randomUUID();
}

export function Player({ mode, load, offlineLessonId }: { mode: PlayerMode; load: () => Promise<StartedRun>; offlineLessonId?: string }) {
  const { t, pick } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const [run, setRun] = useState<StartedRun | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [hearts, setHearts] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const shownAt = useRef(Date.now());
  const startedAt = useRef(Date.now());
  const firstResults = useRef(new Map<string, boolean>());
  const loaded = useRef(false);

  const speech = useQuery({
    queryKey: ['speech-capabilities'],
    queryFn: () => api<{ available: boolean }>('/pronunciation/capabilities'),
    enabled: mode !== 'offline' && mode !== 'game',
    staleTime: 300_000,
  });

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    load()
      .then((r) => {
        setRun(r);
        setHearts(r.hearts ?? null);
        if (r.game?.timed && r.game.timeLimitSec) setTimeLeft(r.game.timeLimitSec);
        startedAt.current = Date.now();
        shownAt.current = Date.now();
      })
      .catch(setLoadError);
    return () => stopAudio();
  }, [load]);

  const items = useMemo<FlatItem[]>(() => (run ? run.steps.flatMap((step) => step.items.map((item) => ({ item, step }))) : []), [run]);
  const current = items[index];

  const complete = useCallback(async () => {
    if (!run?.run || finish) return;
    setBusy(true);
    setActionError(null);
    const durationSec = Math.round((Date.now() - startedAt.current) / 1000);
    try {
      if (mode === 'offline') {
        const meta = { runId: run.run.id, runToken: run.run.token, title: run.lesson?.title ?? {} };
        await queueComplete(meta, durationSec);
        if (offlineLessonId) await removeDownload(offlineLessonId);
        const graded = [...firstResults.current.values()];
        setFinish({ kind: 'offline', accuracy: graded.length ? Math.round((graded.filter(Boolean).length / graded.length) * 100) : 100 });
        if (navigator.onLine) syncOutbox().catch(() => undefined);
      } else if (mode === 'game') {
        const result = await api<Extract<Finish, { kind: 'game' }>['result']>('/game-sessions/finish', { body: { runToken: run.run.token } });
        setFinish({ kind: 'game', result });
      } else if (mode === 'placement') {
        await api('/placement/submit', { body: { runToken: run.run.token } });
        setFinish({ kind: 'placement' });
      } else {
        const result = await api<CompleteResult>('/runs/complete', { body: { runToken: run.run.token, durationSec } });
        setFinish({ kind: 'lesson', result });
      }
      await qc.invalidateQueries();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }, [run, finish, mode, offlineLessonId, qc]);

  // Timed games end when the clock runs out.
  useEffect(() => {
    if (timeLeft == null || finish) return;
    if (timeLeft <= 0) {
      void complete();
      return;
    }
    const id = setTimeout(() => setTimeLeft((s) => (s == null ? s : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, finish, complete]);

  function next() {
    stopAudio();
    setFeedback(null);
    setActionError(null);
    shownAt.current = Date.now();
    if (index + 1 >= items.length) void complete();
    else setIndex(index + 1);
  }

  async function answer(a: Answer) {
    if (!run?.run || !current) return;
    const { item } = current;
    const responseMs = Date.now() - shownAt.current;
    const clientId = uuid();
    setBusy(true);
    setActionError(null);
    try {
      if (mode === 'offline') {
        const key = run.keys?.[item.id];
        const local: ReturnType<typeof gradeLocally> = key ? gradeLocally(item.view, key, a) : { correct: null, score: 0 };
        await queueAnswer(
          { runId: run.run.id, runToken: run.run.token, title: run.lesson?.title ?? {} },
          { itemId: item.id, clientId, answer: a, responseMs, answeredAt: new Date().toISOString() },
        );
        if (local.correct !== null && !firstResults.current.has(item.id)) firstResults.current.set(item.id, local.correct);
        setFeedback({ correct: local.correct, expected: local.expected });
      } else {
        const res = await api<AnswerResult>(mode === 'game' ? '/game-sessions/answer' : '/runs/answer', {
          body: { runToken: run.run.token, itemId: item.id, clientId, answer: a, responseMs },
        });
        if (res.hearts != null) setHearts(res.hearts);
        setFeedback({ correct: res.correct, expected: res.expected });
      }
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorBox error={loadError} />
        <Link href="/play" className="btn-ghost mt-4 w-full">
          {t('lesson.home')}
        </Link>
      </div>
    );
  }
  if (!run) return <Spinner />;
  if (finish) return <Results finish={finish} mode={mode} />;
  if (!current) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="mb-4 text-xl font-bold">{t('play.reviewNone')}</p>
        <Link href="/play" className="btn-primary">
          {t('lesson.home')}
        </Link>
      </div>
    );
  }

  const { item, step } = current;
  const view = item.view;
  const needsAck = view.kind === 'present' || view.kind === 'speak';
  const canSpeak = view.kind === 'speak' && mode !== 'offline' && speech.data?.available && navigator.onLine;
  const stepIndex = run.steps.indexOf(step);
  const stepLabels = run.steps.map((s) => t(`lesson.stage.${s.stage}`));
  const fbTone = feedback?.correct === true ? 'bg-mint/[0.18]' : feedback?.correct === false ? 'bg-coral/[0.18]' : 'bg-night/80';

  return (
    <div className="sky flex min-h-dvh flex-col text-white">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 pb-2 pt-5 sm:gap-6 sm:px-8 sm:pt-7">
        <button
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl font-black hover:bg-white/20"
          aria-label={t('lesson.quit')}
          onClick={() => {
            if (window.confirm(t('lesson.quitConfirm'))) router.push('/play');
          }}
        >
          ×
        </button>
        {stepLabels.length > 1 && stepLabels.length <= 8 ? (
          <StepBar labels={stepLabels} current={stepIndex} />
        ) : (
          <div className="flex-1">
            <ProgressBar value={index} max={items.length} label={t('common.of', { a: index + 1, b: items.length })} />
          </div>
        )}
        <span className="shrink-0 font-mono text-sm font-bold text-slate-600 sm:text-base">
          {index + 1}/{items.length}
        </span>
        {hearts != null && <span className="shrink-0 font-black">❤️ {hearts}</span>}
        {timeLeft != null && <span className={`shrink-0 font-mono font-bold ${timeLeft <= 10 ? 'text-coral' : ''}`}>⏱ {timeLeft}</span>}
      </header>

      <div className="mx-auto mt-4 w-full max-w-3xl px-4 text-center">
        <h1 className="text-2xl font-black leading-tight sm:text-4xl">{t(view.instruction)}</h1>
        {run.lesson && <p className="mt-1 font-bold text-slate-500 sm:text-[17px]">{pick(run.lesson.title)}</p>}
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-6" key={item.id}>
        {view.kind === 'present' && <PresentView view={view} />}
        {view.kind === 'speak' && (
          <div className="grid w-full items-center justify-items-center gap-8 md:grid-cols-2 md:gap-16">
            <SpeakView view={view} />
            {canSpeak && run.run ? <Recorder runToken={run.run.token} itemId={item.id} onScored={() => undefined} /> : <p className="text-xl font-black text-slate-700">{t('lesson.sayIt')}</p>}
          </div>
        )}
        {view.kind === 'choice' && <ChoiceView view={view} feedback={feedback} busy={busy} onAnswer={answer} />}
        {view.kind === 'order' && <OrderView view={view} feedback={feedback} busy={busy} onAnswer={answer} />}
        {view.kind === 'match' && <MatchView view={view} feedback={feedback} busy={busy} onAnswer={answer} />}
      </main>

      <footer className={`sticky bottom-0 border-t border-white/10 backdrop-blur-md transition-colors ${fbTone}`}>
        <div className="mx-auto flex min-h-[88px] w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          {actionError ? <ErrorBox error={actionError} /> : null}
          <p role="status" className={`text-xl font-black sm:text-2xl ${feedback?.correct === true ? 'text-mint' : feedback?.correct === false ? 'text-coral' : 'text-slate-500'}`}>
            {feedback && feedback.correct !== null ? (feedback.correct ? `🎉 ${t('lesson.correct')}` : `💪 ${t('lesson.wrong')}`) : ''}
          </p>
          {(needsAck || feedback) && (
            <button className="btn-primary w-full px-10 py-4 text-xl sm:w-auto" onClick={next} disabled={busy}>
              {index + 1 >= items.length ? t('common.continue') : t('common.next')}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function Results({ finish, mode }: { finish: Finish; mode: PlayerMode }) {
  const { t } = useI18n();
  return (
    <div className="sky flex min-h-dvh flex-col items-center justify-center p-6 text-center text-white">
      <div className="flex w-full max-w-md flex-col items-center gap-5">
      {finish.kind === 'lesson' && (
        <>
          <div className="orb-star h-36 w-36 text-7xl shadow-glow-lg animate-pop" aria-hidden>
            {finish.result.outcome.perfect ? '🏆' : '★'}
          </div>
          <h1 className="text-4xl font-black tracking-tight">{t('lesson.done')}</h1>
          {mode === 'lesson' && (
            <div className="text-5xl">
              <Stars n={finish.result.outcome.stars} />
            </div>
          )}
          <div className="grid w-full grid-cols-3 gap-3">
            <div className="card p-3">
              <div className="text-xs font-bold uppercase text-slate-500">{t('lesson.accuracy')}</div>
              <div className="text-2xl font-black">{finish.result.outcome.accuracy}%</div>
            </div>
            <div className="card p-3">
              <div className="text-xs font-bold uppercase text-slate-500">{t('lesson.xp')}</div>
              <div className="text-2xl font-black">+{mode === 'lesson' ? finish.result.outcome.xp.total : finish.result.outcome.xp.answers}</div>
            </div>
            <div className="card p-3">
              <div className="text-xs font-bold uppercase text-slate-500">{t('lesson.coins')}</div>
              <div className="text-2xl font-black">+{mode === 'lesson' ? finish.result.outcome.coins : 0}</div>
            </div>
          </div>
          <Unlocks achievements={finish.result.achievements} missions={finish.result.missions} />
          <div className="flex w-full flex-col gap-3">
            {mode === 'lesson' && finish.result.nextLessonId && (
              <Link href={`/lesson/${finish.result.nextLessonId}`} className="btn-success w-full">
                {t('lesson.nextLesson')} →
              </Link>
            )}
            <Link href="/play" className="btn-ghost w-full">
              {t('lesson.home')}
            </Link>
          </div>
        </>
      )}
      {finish.kind === 'game' && (
        <>
          <div className="text-7xl" aria-hidden>
            🎮
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            {t('games.score')}: {finish.result.outcome.score}
          </h1>
          <p className="font-bold text-slate-600">
            {t('lesson.accuracy')}: {finish.result.outcome.accuracy}% · +{finish.result.outcome.xp} XP · +{finish.result.outcome.coins} 🪙
          </p>
          <Unlocks achievements={finish.result.achievements} missions={finish.result.missions} />
          <Link href="/play/games" className="btn-success w-full">
            {t('games.again')}
          </Link>
          <Link href="/play" className="btn-ghost w-full">
            {t('lesson.home')}
          </Link>
        </>
      )}
      {finish.kind === 'placement' && (
        <>
          <div className="text-7xl" aria-hidden>
            🧭
          </div>
          <h1 className="text-2xl font-black">{t('lesson.placementDone')}</h1>
          <Link href="/play" className="btn-success w-full">
            {t('common.continue')} →
          </Link>
        </>
      )}
      {finish.kind === 'offline' && (
        <>
          <div className="text-7xl" aria-hidden>
            📥
          </div>
          <h1 className="text-4xl font-black tracking-tight">{t('lesson.done')}</h1>
          <p className="text-2xl font-black">{finish.accuracy}%</p>
          <p className="font-bold text-slate-600">{t('lesson.savedOffline')}</p>
          <Link href="/play/offline" className="btn-ghost w-full">
            {t('play.downloads')}
          </Link>
        </>
      )}
      </div>
    </div>
  );
}

function Unlocks({ achievements, missions }: { achievements: CompleteResult['achievements']; missions: CompleteResult['missions'] }) {
  const { t, pick } = useI18n();
  if (!achievements.length && !missions.length) return null;
  return (
    <div className="w-full space-y-2">
      {achievements.map((a) => (
        <div key={a.slug} className="card flex items-center gap-3 bg-star/10 p-3 text-left ring-star/40 animate-pop">
          <span className="text-3xl" aria-hidden>
            {a.icon}
          </span>
          <div>
            <div className="text-xs font-black uppercase text-star">{t('lesson.newAchievement')}</div>
            <div className="font-extrabold">{pick(a.title)}</div>
          </div>
        </div>
      ))}
      {missions.map((m) => (
        <div key={m.slug} className="card flex items-center gap-3 bg-mint/10 p-3 text-left ring-mint/40 animate-pop">
          <span className="text-3xl" aria-hidden>
            ✅
          </span>
          <div>
            <div className="text-xs font-black uppercase text-mint">{t('lesson.missionDone')}</div>
            <div className="font-extrabold">{pick(m.title)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
