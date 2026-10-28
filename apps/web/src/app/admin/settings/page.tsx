'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorBox, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const KEYS = ['rewards', 'levels', 'hearts', 'review', 'dailyGoal'] as const;
type Key = (typeof KEYS)[number];
type L = { kk: string; ru: string; en: string };

/** Defaults from packages/database/prisma/data/settings.ts; used when a value has never been saved. */
const DEFAULTS: Record<Key, Record<string, number | number[]>> = {
  rewards: {
    correctAnswerXp: 5,
    lessonXp: 20,
    perfectLessonBonusXp: 30,
    dailyMissionXp: 50,
    lessonCoins: 5,
    perfectLessonBonusCoins: 5,
    gameCoinsPerCorrect: 1,
    starThresholds: [60, 80, 95],
  },
  levels: { xpPerLevelStep: 100 },
  hearts: { max: 5, refillMinutes: 30 },
  review: { maxItemsPerLesson: 3 },
  dailyGoal: { minutes: 10 },
};

/** Every number field: label, plain-language help, and the range the server accepts.
 * dailyMissionXp and hearts.refillMinutes are kept as saved but not shown: nothing reads them yet. */
const FIELDS: Record<Key, { icon: string; intro: L; fields: { key: string; label: L; help: L; min: number; max: number; suffix?: L }[] }> = {
  rewards: {
    icon: '🎁',
    intro: { kk: 'Бала не үшін қанша XP мен тиын алады.', ru: 'Сколько XP и монет ребёнок получает и за что.', en: 'How much XP and how many coins a child earns, and for what.' },
    fields: [
      { key: 'correctAnswerXp', label: { kk: 'Әр дұрыс жауапқа XP', ru: 'XP за правильный ответ', en: 'XP per correct answer' }, help: { kk: 'Сабақ пен ойындағы әр дұрыс жауап үшін.', ru: 'За каждый правильный ответ в уроке и игре.', en: 'For every correct answer in lessons and games.' }, min: 0, max: 100 },
      { key: 'lessonXp', label: { kk: 'Сабақ аяқтағаны үшін XP', ru: 'XP за пройденный урок', en: 'XP for finishing a lesson' }, help: { kk: 'Сабақ соңында бір рет беріледі.', ru: 'Выдаётся один раз в конце урока.', en: 'Given once at the end of a lesson.' }, min: 0, max: 1000 },
      { key: 'perfectLessonBonusXp', label: { kk: 'Қатесіз сабаққа қосымша XP', ru: 'Бонус XP за урок без ошибок', en: 'Bonus XP for a perfect lesson' }, help: { kk: 'Бірде-бір қате болмаса, үстіне қосылады.', ru: 'Добавляется, если не было ни одной ошибки.', en: 'Added on top when there were no mistakes.' }, min: 0, max: 1000 },
      { key: 'lessonCoins', label: { kk: 'Сабақ аяқтағаны үшін тиын', ru: 'Монеты за пройденный урок', en: 'Coins for finishing a lesson' }, help: { kk: '🪙 Сабақ соңында.', ru: '🪙 В конце урока.', en: '🪙 At the end of a lesson.' }, min: 0, max: 1000 },
      { key: 'perfectLessonBonusCoins', label: { kk: 'Қатесіз сабаққа қосымша тиын', ru: 'Бонус монет за урок без ошибок', en: 'Bonus coins for a perfect lesson' }, help: { kk: '🪙 Қатесіз аяқталса.', ru: '🪙 Если без ошибок.', en: '🪙 When there were no mistakes.' }, min: 0, max: 1000 },
      { key: 'gameCoinsPerCorrect', label: { kk: 'Ойындағы әр дұрыс жауапқа тиын', ru: 'Монеты за правильный ответ в игре', en: 'Coins per correct game answer' }, help: { kk: '🪙 Ойындар бөлімінде.', ru: '🪙 В разделе «Игры».', en: '🪙 In the Games section.' }, min: 0, max: 100 },
    ],
  },
  levels: {
    icon: '🚀',
    intro: { kk: 'Келесі деңгейге өту үшін қанша XP керек.', ru: 'Сколько XP нужно для следующего уровня.', en: 'How much XP the next level needs.' },
    fields: [
      {
        key: 'xpPerLevelStep',
        label: { kk: 'Деңгей қадамы (XP)', ru: 'Шаг уровня (XP)', en: 'Level step (XP)' },
        help: { kk: '2-деңгейге осынша XP керек, 3-деңгейге тағы екі есе, 4-ке тағы үш есе т.с.с.', ru: 'Для 2-го уровня нужно столько XP, для 3-го ещё вдвое больше, для 4-го — втрое и т. д.', en: 'Level 2 needs this much XP, level 3 twice as much again, level 4 three times, and so on.' },
        min: 10,
        max: 10000,
      },
    ],
  },
  hearts: {
    icon: '❤️',
    intro: { kk: 'Жүректер тек уақыттық ойындарда жұмсалады: әр қате жауап бір жүрек алады. Бала сабақты қатесіз аяқтаса, +1 жүрек алады.', ru: 'Сердечки тратятся только в играх на время: каждая ошибка отнимает одно. За урок без ошибок ребёнок получает +1 сердечко.', en: 'Hearts are only used in timed games: each wrong answer costs one. A perfect lesson gives the child +1 heart.' },
    fields: [
      { key: 'max', label: { kk: 'Ең көп жүрек саны', ru: 'Максимум сердечек', en: 'Maximum hearts' }, help: { kk: 'Бала бір уақытта ұстай алатын жүрек саны.', ru: 'Сколько сердечек может быть одновременно.', en: 'How many hearts a child can hold at once.' }, min: 1, max: 20 },
    ],
  },
  review: {
    icon: '🔁',
    intro: { kk: 'Әлсіз дыбыстар мен сөздер жаңа сабаққа қайталау ретінде қосылады.', ru: 'Слабые звуки и слова добавляются в новые уроки как повторение.', en: 'Weak sounds and words are mixed into new lessons as review.' },
    fields: [
      { key: 'maxItemsPerLesson', label: { kk: 'Бір сабақтағы қайталау саны', ru: 'Повторений в одном уроке', en: 'Review items per lesson' }, help: { kk: '0 — сабақтарда қайталау болмайды.', ru: '0 — без повторения в уроках.', en: '0 turns review in lessons off.' }, min: 0, max: 10 },
    ],
  },
  dailyGoal: {
    icon: '🎯',
    intro: { kk: 'Баланың күнделікті мақсаты (басты беттегі жолақ).', ru: 'Ежедневная цель ребёнка (полоска на главной).', en: 'The child’s daily goal (the bar on the home screen).' },
    fields: [{ key: 'minutes', label: { kk: 'Күніне минут', ru: 'Минут в день', en: 'Minutes a day' }, help: { kk: 'Бір сабақ шамамен 7 минут.', ru: 'Один урок — около 7 минут.', en: 'One lesson is about 7 minutes.' }, min: 1, max: 120, suffix: { kk: 'мин', ru: 'мин', en: 'min' } }],
  },
};

const STARS: L = { kk: 'Жұлдыздар үшін дұрыс жауап пайызы', ru: 'Процент правильных ответов для звёзд', en: 'Correct-answer % for stars' };
const STARS_HELP: L = { kk: 'Сабақ соңында: ★ — бірінші шектен, ★★ — екіншіден, ★★★ — үшіншіден жоғары. Әр шек алдыңғысынан үлкен болуы керек.', ru: 'В конце урока: ★ — от первого порога, ★★ — от второго, ★★★ — от третьего. Каждый порог больше предыдущего.', en: 'At the end of a lesson: ★ from the first threshold, ★★ from the second, ★★★ from the third. Each must be higher than the one before.' };

function SettingCard({ k, value }: { k: Key; value: Record<string, unknown> | null }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const spec = FIELDS[k];
  const [draft, setDraft] = useState<Record<string, number | number[]>>({ ...DEFAULTS[k], ...((value ?? {}) as Record<string, number | number[]>) });
  const save = useMutation({
    mutationFn: () => api(`/admin/settings/${k}`, { method: 'PUT', body: draft }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  });
  const stars = (draft.starThresholds as number[] | undefined) ?? [60, 80, 95];
  return (
    <form className="card space-y-4" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <div>
        <h2 className="text-lg font-bold">
          {spec.icon} {t(`admin.settings.${k}`)}
        </h2>
        <p className="text-sm text-slate-600">{spec.intro[locale]}</p>
        {value == null && <p className="mt-1 text-xs text-amber-700">{t('admin.notSet')}</p>}
      </div>
      {spec.fields.map((fl) => (
        <label key={fl.key} className="block">
          <span className="label">{fl.label[locale]}</span>
          <span className="flex items-center gap-2">
            <input
              className="input w-32"
              type="number"
              min={fl.min}
              max={fl.max}
              required
              value={draft[fl.key] as number}
              onChange={(e) => setDraft({ ...draft, [fl.key]: Number(e.target.value) })}
            />
            {fl.suffix && <span className="text-sm text-slate-500">{fl.suffix[locale]}</span>}
          </span>
          <span className="mt-1 block text-xs text-slate-500">{fl.help[locale]}</span>
        </label>
      ))}
      {k === 'rewards' && (
        <div>
          <span className="label">{STARS[locale]}</span>
          <div className="flex items-center gap-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-amber-500">{'★'.repeat(i + 1)}</span>
                <input
                  className="input w-20"
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={stars[i]}
                  onChange={(e) => {
                    const next = [...stars];
                    next[i] = Number(e.target.value);
                    setDraft({ ...draft, starThresholds: next });
                  }}
                />
                <span className="text-sm text-slate-500">%</span>
              </span>
            ))}
          </div>
          <span className="mt-1 block text-xs text-slate-500">{STARS_HELP[locale]}</span>
        </div>
      )}
      {save.error ? <ErrorBox error={save.error} /> : null}
      <button className="btn-primary btn-sm" disabled={save.isPending}>
        {save.isSuccess ? `✓ ${t('common.saved')}` : t('common.save')}
      </button>
    </form>
  );
}

export default function SettingsAdmin() {
  const { t } = useI18n();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-settings'], queryFn: () => api<Record<Key, Record<string, unknown> | null>>('/admin/settings') });
  return (
    <div>
      <PageTitle>{t('admin.settings')}</PageTitle>
      <p className="mb-4 text-sm text-slate-600">{t('admin.settingsHint')}</p>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      {data && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {KEYS.map((k) => (
            <SettingCard key={k} k={k} value={data[k]} />
          ))}
        </div>
      )}
    </div>
  );
}
