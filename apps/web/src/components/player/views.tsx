'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { playMedia } from '@/lib/audio';
import { useI18n } from '@/lib/i18n';
import type { Answer, AnswerKey, ItemView, Media } from '@/lib/types';
import { ListenButton, MediaView } from '../media-view';

export interface Feedback {
  correct: boolean | null;
  expected?: AnswerKey;
}

type ViewOf<K extends ItemView['kind']> = Extract<ItemView, { kind: K }>;

interface ViewProps<V> {
  view: V;
  feedback: Feedback | null;
  busy: boolean;
  onAnswer(answer: Answer): void;
}

/** Plays the prompt once when an item appears (allowed after the first tap of the session). */
function useAutoplay(media: Media | undefined, key: string) {
  useEffect(() => {
    if (!media) return;
    const id = setTimeout(() => void playMedia(media), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function PresentView({ view }: { view: ViewOf<'present'> }) {
  useAutoplay(view.focus, JSON.stringify(view.focus));
  return (
    <div className="flex flex-col items-center gap-6">
      <MediaView media={view.focus} size="xl" />
      {view.details && view.details.length > 0 && (
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {view.details.map((d, i) => (
            <div key={i} className="card flex items-center justify-center p-3">
              <MediaView media={d} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChoiceView({ view, feedback, busy, onAnswer }: ViewProps<ViewOf<'choice'>>) {
  const [picked, setPicked] = useState<string | null>(null);
  useAutoplay(view.prompt, view.options.map((o) => o.id).join());
  useEffect(() => setPicked(null), [view]);
  const expected = feedback?.expected?.kind === 'choice' ? feedback.expected.optionId : null;
  return (
    <div className="flex flex-col items-center gap-6">
      <MediaView media={view.prompt} size="xl" />
      <div className={`grid w-full gap-3 ${view.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`} role="radiogroup">
        {view.options.map((o) => {
          const isPicked = picked === o.id;
          const state =
            feedback && isPicked ? (feedback.correct ? 'ring-4 ring-leaf-500 bg-green-50' : 'ring-4 ring-berry-500 bg-rose-50 animate-shake') : feedback && expected === o.id ? 'ring-4 ring-leaf-500' : '';
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={isPicked}
              disabled={busy || feedback != null}
              className={`card flex min-h-28 items-center justify-center p-3 transition hover:-translate-y-0.5 disabled:cursor-default ${state}`}
              onClick={() => {
                setPicked(o.id);
                void playMedia(o.media);
                onAnswer({ kind: 'choice', optionId: o.id });
              }}
            >
              <MediaView media={o.media} size="lg" listen={false} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OrderView({ view, feedback, busy, onAnswer }: ViewProps<ViewOf<'order'>>) {
  const { t } = useI18n();
  const [placed, setPlaced] = useState<string[]>([]);
  useAutoplay(view.prompt, view.tiles.map((x) => x.id).join());
  useEffect(() => setPlaced([]), [view]);
  const byId = useMemo(() => new Map(view.tiles.map((x) => [x.id, x])), [view]);
  const expected = feedback?.expected?.kind === 'order' ? feedback.expected.sequence : null;
  const done = feedback != null;
  return (
    <div className="flex flex-col items-center gap-6">
      <MediaView media={view.prompt} size="lg" />
      <div className="flex min-h-20 flex-wrap justify-center gap-2" aria-live="polite" lang="en">
        {Array.from({ length: view.slots }, (_, i) => {
          const tile = placed[i] ? byId.get(placed[i]!) : null;
          return (
            <button
              key={i}
              disabled={done || !tile}
              onClick={() => setPlaced(placed.filter((_, j) => j !== i))}
              className={`flex h-16 min-w-14 items-center justify-center rounded-2xl border-4 border-dashed px-3 text-3xl font-black ${
                tile ? 'border-transparent bg-brand-500 text-white shadow-pop' : 'border-slate-300 bg-white/60'
              } ${done ? (feedback?.correct ? 'bg-leaf-500' : 'bg-berry-500') : ''}`}
            >
              {tile?.label ?? ''}
            </button>
          );
        })}
      </div>
      {expected && (
        <p className="text-lg font-bold text-leaf-600" lang="en">
          ✓ {expected.join(' · ')}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2" lang="en">
        {view.tiles.map((tile) => {
          const used = placed.includes(tile.id);
          return (
            <button
              key={tile.id}
              disabled={done || used || placed.length >= view.slots}
              onClick={() => {
                setPlaced([...placed, tile.id]);
                if (tile.audioUrl) void playMedia({ audioUrl: tile.audioUrl });
              }}
              className={`h-16 min-w-14 rounded-2xl bg-white px-3 text-3xl font-black shadow-pop ring-1 ring-slate-200 transition ${used ? 'opacity-20' : 'hover:-translate-y-0.5'}`}
            >
              {tile.label}
            </button>
          );
        })}
      </div>
      {!done && (
        <div className="flex gap-3">
          <button className="btn-ghost" onClick={() => setPlaced([])} disabled={placed.length === 0}>
            {t('lesson.clear')}
          </button>
          <button className="btn-primary" disabled={busy || placed.length !== view.slots} onClick={() => onAnswer({ kind: 'order', sequence: placed })}>
            {t('lesson.check')}
          </button>
        </div>
      )}
    </div>
  );
}

export function MatchView({ view, feedback, busy, onAnswer }: ViewProps<ViewOf<'match'>>) {
  const { t } = useI18n();
  const [open, setOpen] = useState<string[]>([]);
  const [pairs, setPairs] = useState<[string, string][]>([]);
  const [moves, setMoves] = useState(0);
  const pairOf = useRef(new Map<string, string>());
  const matched = new Set(pairs.flat());
  useEffect(() => {
    setOpen([]);
    setPairs([]);
    setMoves(0);
  }, [view]);

  // Cards match when they show the same thing in two forms; the client only knows card faces, so a pair is
  // whatever two cards the child turns over together. The server decides whether the set of pairs is right.
  function flip(id: string) {
    if (busy || feedback || matched.has(id) || open.includes(id) || open.length === 2) return;
    const card = view.cards.find((c) => c.id === id)!;
    void playMedia(card.media);
    const next = [...open, id];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next as [string, string];
      const ka = view.cards.find((c) => c.id === a)!.media;
      const kb = view.cards.find((c) => c.id === b)!.media;
      const same = (ka.speak ?? ka.text ?? '').toLowerCase() === (kb.speak ?? kb.text ?? '').toLowerCase();
      setTimeout(() => {
        if (same) {
          const nextPairs: [string, string][] = [...pairs, [a, b]];
          pairOf.current.set(a, b);
          setPairs(nextPairs);
          if (nextPairs.length * 2 === view.cards.length) onAnswer({ kind: 'match', pairs: nextPairs, moves: moves + 1 });
        }
        setOpen([]);
      }, same ? 300 : 900);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm font-semibold text-slate-500">{t('lesson.moves', { n: moves })}</p>
      <div className="grid w-full max-w-xl grid-cols-3 gap-3 sm:grid-cols-4">
        {view.cards.map((c) => {
          const faceUp = open.includes(c.id) || matched.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => flip(c.id)}
              aria-label={faceUp ? (c.media.text ?? c.media.speak ?? '') : '?'}
              className={`flex aspect-square items-center justify-center rounded-2xl text-3xl font-black shadow-pop transition ${
                faceUp ? (matched.has(c.id) ? 'bg-green-100 ring-2 ring-leaf-500' : 'bg-white') : 'bg-brand-500 text-white'
              }`}
            >
              {faceUp ? <MediaView media={c.media} size="sm" listen={false} /> : '?'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SpeakView({ view }: { view: ViewOf<'speak'> }) {
  useAutoplay(view.prompt, view.target);
  return (
    <div className="flex flex-col items-center gap-4">
      <MediaView media={view.prompt} size="xl" />
      <ListenButton media={view.prompt} />
    </div>
  );
}
