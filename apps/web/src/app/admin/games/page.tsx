'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LTextFields, StatusChip, StatusSelect, type Status } from '@/components/admin/admin-kit';
import { ErrorBox, Field, Modal, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText } from '@/lib/types';

interface Game {
  id: string;
  slug: string;
  type: string;
  title: LocalizedText;
  config: Record<string, unknown>;
  timed: boolean;
  timeLimitSec: number | null;
  status: Status;
}

type L = { kk: string; ru: string; en: string };
type Pool = 'phonemes' | 'letters' | 'words' | 'cvc_words' | 'digraph_words' | 'sight_words';

/** Content a game draws its questions from (see packages/game-engine/src/games.ts). */
const POOLS: Record<Pool, L> = {
  phonemes: { kk: '44 дыбыс', ru: '44 звука', en: '44 sounds' },
  letters: { kk: '26 әріп', ru: '26 букв', en: '26 letters' },
  words: { kk: 'Барлық суретті сөздер', ru: 'Все слова с картинками', en: 'All picture words' },
  cvc_words: { kk: 'Қысқа сөздер (cat, dog)', ru: 'Короткие слова (cat, dog)', en: 'Short words (cat, dog)' },
  digraph_words: { kk: 'Диграф сөздер (ship, tree)', ru: 'Слова с диграфами (ship, tree)', en: 'Digraph words (ship, tree)' },
  sight_words: { kk: 'Жаттайтын сөздер (the, and)', ru: 'Слова-исключения (the, and)', en: 'Sight words (the, and)' },
};

/** What each game type asks the child to do, in plain words, and which settings it uses. */
const TYPES: Record<string, { icon: string; name: L; does: L; pools: Pool[]; options?: boolean; tiles?: boolean }> = {
  sound_to_letter: {
    icon: '👂',
    name: { kk: 'Дыбыс → әріп', ru: 'Звук → буква', en: 'Sound → letter' },
    does: { kk: 'Бала дыбысты естиді де, оны жазатын әріпті таңдайды.', ru: 'Ребёнок слышит звук и выбирает букву, которой он пишется.', en: 'The child hears a sound and picks the letters that spell it.' },
    pools: ['phonemes'],
    options: true,
  },
  letter_to_sound: {
    icon: '🔤',
    name: { kk: 'Әріп → дыбыс', ru: 'Буква → звук', en: 'Letter → sound' },
    does: { kk: 'Бала әріпті көреді де, оның дыбысын тыңдап таңдайды.', ru: 'Ребёнок видит букву и выбирает её звук на слух.', en: 'The child sees letters and picks the sound they make.' },
    pools: ['phonemes'],
    options: true,
  },
  letter_match: {
    icon: '🔠',
    name: { kk: 'Бас әріп ↔ кіші әріп', ru: 'Заглавная ↔ строчная', en: 'Capital ↔ small letter' },
    does: { kk: 'Бала бас әріпке сәйкес кіші әріпті табады (A → a).', ru: 'Ребёнок находит строчную букву к заглавной (A → a).', en: 'The child finds the small letter for each capital (A → a).' },
    pools: ['letters'],
    options: true,
  },
  letter_recognition: {
    icon: '🅰️',
    name: { kk: 'Әріпті тану', ru: 'Узнай букву', en: 'Spot the letter' },
    does: { kk: 'Бала әріптің атын естіп, сол әріпті табады.', ru: 'Ребёнок слышит название буквы и находит её.', en: 'The child hears a letter name and finds that letter.' },
    pools: ['letters'],
    options: true,
  },
  memory: {
    icon: '🃏',
    name: { kk: 'Есте сақта (жұп карталар)', ru: 'Мемори (пары карточек)', en: 'Memory (matching pairs)' },
    does: { kk: 'Бала карталарды ашып, бірдей жұптарды табады (ең көбі 8 жұп).', ru: 'Ребёнок открывает карточки и ищет пары (до 8 пар).', en: 'The child turns cards over to find matching pairs (up to 8 pairs).' },
    pools: ['letters', 'words', 'cvc_words', 'digraph_words'],
  },
  word_builder: {
    icon: '🧩',
    name: { kk: 'Сөз құрастыр', ru: 'Собери слово', en: 'Build the word' },
    does: { kk: 'Бала суретке қарап, әріптерден сөзді құрастырады.', ru: 'Ребёнок смотрит на картинку и собирает слово из букв.', en: 'The child looks at a picture and builds the word from letter tiles.' },
    pools: ['words', 'cvc_words', 'digraph_words'],
    tiles: true,
  },
  segment: {
    icon: '✂️',
    name: { kk: 'Сөзді дыбысқа бөл', ru: 'Раздели слово на звуки', en: 'Split into sounds' },
    does: { kk: 'Бала сөзді дыбыстарға ретімен бөледі: ship → sh·i·p.', ru: 'Ребёнок делит слово на звуки по порядку: ship → sh·i·p.', en: 'The child splits a word into its sounds in order: ship → sh·i·p.' },
    pools: ['words', 'cvc_words', 'digraph_words'],
  },
  listen_choose: {
    icon: '🎧',
    name: { kk: 'Тыңда да таңда', ru: 'Слушай и выбирай', en: 'Listen & choose' },
    does: { kk: 'Бала сөзді естиді де, сәйкес суретті таңдайды.', ru: 'Ребёнок слышит слово и выбирает подходящую картинку.', en: 'The child hears a word and picks the matching picture.' },
    pools: ['words', 'cvc_words', 'digraph_words'],
    options: true,
  },
  blend: {
    icon: '🔗',
    name: { kk: 'Дыбыстарды қос', ru: 'Сложи звуки', en: 'Blend the sounds' },
    does: { kk: 'Бала бөлек дыбыстарды естиді (c-a-t) де, шыққан сөздің суретін таңдайды.', ru: 'Ребёнок слышит звуки по отдельности (c-a-t) и выбирает картинку получившегося слова.', en: 'The child hears separate sounds (c-a-t) and picks the picture of the word.' },
    pools: ['words', 'cvc_words', 'digraph_words'],
    options: true,
  },
  missing_letter: {
    icon: '❓',
    name: { kk: 'Жоқ әріпті тап', ru: 'Пропущенная буква', en: 'Missing letter' },
    does: { kk: 'Сөзде бір әріп жоқ (c_t) — бала дұрыс әріпті таңдайды.', ru: 'В слове пропущена буква (c_t) — ребёнок выбирает нужную.', en: 'A word has a gap (c_t) — the child picks the missing letter.' },
    pools: ['words', 'cvc_words', 'digraph_words'],
    options: true,
  },
  read_word: {
    icon: '📖',
    name: { kk: 'Оқы да таңда', ru: 'Прочитай и выбери', en: 'Read & choose' },
    does: { kk: 'Бала жазылған сөзді өзі оқып, сәйкес суретті таңдайды.', ru: 'Ребёнок сам читает слово и выбирает картинку.', en: 'The child reads a written word and picks its picture.' },
    pools: ['words', 'cvc_words', 'digraph_words'],
    options: true,
  },
  sight_word: {
    icon: '👀',
    name: { kk: 'Жаттайтын сөздер', ru: 'Слова-исключения', en: 'Sight words' },
    does: { kk: 'Бала сөзді естиді де, жазылуын тауып алады (the, said).', ru: 'Ребёнок слышит слово и находит, как оно пишется (the, said).', en: 'The child hears a word and finds how it is written (the, said).' },
    pools: ['sight_words'],
    options: true,
  },
};

const UI: Record<string, L> = {
  questions: { kk: 'сұрақ', ru: 'вопросов', en: 'questions' },
  pairs: { kk: 'жұп', ru: 'пар', en: 'pairs' },
  choices: { kk: 'жауап нұсқасы', ru: 'варианта ответа', en: 'answer choices' },
  extra: { kk: 'артық әріп', ru: 'лишних букв', en: 'extra letters' },
  timedNote: { kk: 'сек · қате жауап жүрек алады', ru: 'сек · ошибка отнимает сердечко', en: 's · a miss costs a heart' },
  practice: { kk: 'Жаттығу · жүрек алмайды', ru: 'Тренировка · сердечки не тратит', en: 'Practice · no hearts used' },
  kind: { kk: 'Ойын түрі', ru: 'Тип игры', en: 'Game type' },
  pool: { kk: 'Неден сұрайды', ru: 'Откуда вопросы', en: 'Questions come from' },
  items: { kk: 'Сұрақ саны', ru: 'Количество вопросов', en: 'Number of questions' },
  options: { kk: 'Жауап нұсқалары', ru: 'Вариантов ответа', en: 'Answer choices' },
  tiles: { kk: 'Артық әріптер', ru: 'Лишние буквы', en: 'Extra letter tiles' },
  only: { kk: 'Тек осылар (міндетті емес)', ru: 'Только эти (необязательно)', en: 'Only these (optional)' },
  onlyHint: {
    kk: 'Үтір арқылы: сөздер (cat, dog), әріптер (A, B) немесе дыбыс коды (sh, ee). Бос қалса — жоғарыдағы жиыннан кездейсоқ алынады.',
    ru: 'Через запятую: слова (cat, dog), буквы (A, B) или коды звуков (sh, ee). Если пусто — берутся случайно из набора выше.',
    en: 'Comma-separated: words (cat, dog), letters (A, B) or sound codes (sh, ee). Leave empty to pick at random from the set above.',
  },
  timed: { kk: 'Уақытпен (жарыс)', ru: 'На время (соревнование)', en: 'Timed (challenge)' },
  timedHint: { kk: 'Әр қате жауап бір жүрек алады; жүрек біткенде бұл ойынды ойнауға болмайды.', ru: 'Каждая ошибка отнимает сердечко; без сердечек игра недоступна.', en: 'Each wrong answer costs a heart; with no hearts left the game is locked.' },
  seconds: { kk: 'Уақыт (секунд)', ru: 'Время (секунд)', en: 'Time (seconds)' },
  name: { kk: 'Атауы (балаға көрінеді)', ru: 'Название (видит ребёнок)', en: 'Name (shown to children)' },
  code: { kk: 'Код (латынша, өзгермейді)', ru: 'Код (латиница, не меняется)', en: 'Code (latin, cannot change later)' },
  intro: {
    kk: 'Ойындар «Ойындар» бөлімінде балаға көрінеді. Әр ойын баланың әлсіз дыбыстары мен сөздерін бірінші сұрайды.',
    ru: 'Игры видны ребёнку в разделе «Игры». Каждая игра в первую очередь спрашивает слабые звуки и слова ребёнка.',
    en: 'Games appear to children under «Games». Each game asks about the child’s weak sounds and words first.',
  },
};

function poolOf(c: Record<string, unknown>): Pool {
  return (Object.keys(POOLS) as Pool[]).includes(c.pool as Pool) ? (c.pool as Pool) : 'words';
}

function GameForm({ g, onDone }: { g?: Game; onDone(): void }) {
  const { t, locale } = useI18n();
  const L = (x: L) => x[locale];
  const c = (g?.config ?? {}) as Record<string, unknown>;
  const [f, setF] = useState({
    slug: g?.slug ?? '',
    type: g?.type && TYPES[g.type] ? g.type : 'listen_choose',
    title: g?.title ?? ({ en: '' } as LocalizedText),
    pool: g ? poolOf(c) : ('words' as Pool),
    items: typeof c.items === 'number' ? c.items : 8,
    options: typeof c.options === 'number' ? c.options : 3,
    extraTiles: typeof c.extraTiles === 'number' ? c.extraTiles : 1,
    only: Array.isArray(c.only) ? (c.only as string[]).join(', ') : '',
    timed: g?.timed ?? false,
    timeLimitSec: g?.timeLimitSec ?? 60,
    status: g?.status ?? ('DRAFT' as Status),
  });
  const type = TYPES[f.type]!;
  const pool = type.pools.includes(f.pool) ? f.pool : type.pools[0]!;
  const only = f.only
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const config: Record<string, unknown> = { pool, items: f.items };
  if (type.options) config.options = f.options;
  if (type.tiles) config.extraTiles = f.extraTiles;
  if (only.length) config.only = only;
  const body = { type: f.type, title: f.title, config, timed: f.timed, timeLimitSec: f.timed ? f.timeLimitSec : null, status: f.status };
  const save = useMutation({ mutationFn: () => (g ? api(`/admin/games/${g.id}`, { method: 'PATCH', body }) : api('/admin/games', { body: { ...body, slug: f.slug } })), onSuccess: onDone });

  return (
    <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <Field label={L(UI.kind!)}>
        <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          {Object.entries(TYPES).map(([key, x]) => (
            <option key={key} value={key}>
              {x.icon} {L(x.name)}
            </option>
          ))}
        </select>
      </Field>
      <p className="-mt-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
        {type.icon} {L(type.does)}
      </p>

      <div>
        <span className="label">{L(UI.name!)}</span>
        <LTextFields value={f.title} onChange={(title) => setF({ ...f, title })} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={L(UI.pool!)}>
          <select className="input" value={pool} onChange={(e) => setF({ ...f, pool: e.target.value as Pool })}>
            {type.pools.map((p) => (
              <option key={p} value={p}>
                {L(POOLS[p])}
              </option>
            ))}
          </select>
        </Field>
        <Field label={L(UI.items!)}>
          <input className="input" type="number" min={1} max={f.type === 'memory' ? 8 : 30} value={f.items} onChange={(e) => setF({ ...f, items: Number(e.target.value) })} />
        </Field>
        {type.options && (
          <Field label={L(UI.options!)}>
            <input className="input" type="number" min={2} max={6} value={f.options} onChange={(e) => setF({ ...f, options: Number(e.target.value) })} />
          </Field>
        )}
        {type.tiles && (
          <Field label={L(UI.tiles!)}>
            <input className="input" type="number" min={0} max={4} value={f.extraTiles} onChange={(e) => setF({ ...f, extraTiles: Number(e.target.value) })} />
          </Field>
        )}
      </div>

      <Field label={L(UI.only!)} hint={L(UI.onlyHint!)}>
        <input className="input font-mono" value={f.only} onChange={(e) => setF({ ...f, only: e.target.value })} placeholder="cat, dog, sun" />
      </Field>

      <div className="grid items-end gap-3 sm:grid-cols-3">
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" className="h-5 w-5" checked={f.timed} onChange={(e) => setF({ ...f, timed: e.target.checked })} /> {L(UI.timed!)}
        </label>
        <Field label={L(UI.seconds!)} hint={f.timed ? L(UI.timedHint!) : undefined}>
          <input className="input" type="number" min={10} max={600} disabled={!f.timed} value={f.timeLimitSec} onChange={(e) => setF({ ...f, timeLimitSec: Number(e.target.value) })} />
        </Field>
        <Field label={t('common.status')}>
          <StatusSelect value={f.status} onChange={(status) => setF({ ...f, status })} />
        </Field>
      </div>

      <Field label={L(UI.code!)}>
        <input className="input font-mono" value={f.slug} disabled={!!g} onChange={(e) => setF({ ...f, slug: e.target.value })} required pattern="[a-z0-9-]{2,60}" placeholder="sound-race" />
      </Field>

      {save.error ? <ErrorBox error={save.error} /> : null}
      <button className="btn-primary w-full" disabled={save.isPending}>
        {t('common.save')}
      </button>
    </form>
  );
}

function GameCard({ g, onOpen }: { g: Game; onOpen(): void }) {
  const { pick, locale } = useI18n();
  const L = (x: L) => x[locale];
  const type = TYPES[g.type];
  const c = g.config ?? {};
  const items = typeof c.items === 'number' ? c.items : 8;
  const only = Array.isArray(c.only) ? (c.only as string[]) : [];
  return (
    <button className="card flex gap-4 text-left transition hover:ring-brand-300" onClick={onOpen}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl" aria-hidden>
        {type?.icon ?? '🎮'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <b className="text-lg">{pick(g.title)}</b>
            <div className="text-xs font-semibold text-slate-500">{type ? L(type.name) : g.type}</div>
          </div>
          <StatusChip status={g.status} />
        </div>
        <p className="mt-1.5 text-sm text-slate-600">{type ? L(type.does) : ''}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="chip">📚 {only.length ? only.slice(0, 5).join(', ') + (only.length > 5 ? '…' : '') : L(POOLS[poolOf(c)])}</span>
          <span className="chip">
            🔢 {g.type === 'memory' ? `${Math.min(items, 8)} ${L(UI.pairs!)}` : `${items} ${L(UI.questions!)}`}
          </span>
          {type?.options && <span className="chip">🔘 {typeof c.options === 'number' ? c.options : 3} {L(UI.choices!)}</span>}
          {type?.tiles && <span className="chip">➕ {typeof c.extraTiles === 'number' ? c.extraTiles : 1} {L(UI.extra!)}</span>}
          {g.timed ? (
            <span className="chip bg-amber-100 text-amber-800">
              ⏱ {g.timeLimitSec} {L(UI.timedNote!)}
            </span>
          ) : (
            <span className="chip bg-green-100 text-green-800">{L(UI.practice!)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function GamesAdmin() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Game | 'new' | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-games'], queryFn: () => api<Game[]>('/admin/games') });
  return (
    <div>
      <PageTitle action={<button className="btn-primary btn-sm" onClick={() => setEditing('new')}>+ {t('common.add')}</button>}>{t('admin.games')}</PageTitle>
      <p className="-mt-3 mb-4 max-w-3xl text-sm text-slate-600">{UI.intro![locale]}</p>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {data?.map((g) => (
          <GameCard key={g.id} g={g} onOpen={() => setEditing(g)} />
        ))}
      </div>
      <Modal wide open={editing != null} onClose={() => setEditing(null)} title={t('admin.games')}>
        {editing && (
          <GameForm
            g={editing === 'new' ? undefined : editing}
            onDone={() => {
              setEditing(null);
              void qc.invalidateQueries({ queryKey: ['admin-games'] });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
