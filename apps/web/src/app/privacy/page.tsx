'use client';

import { Logo } from '@/components/shells';
import { LocaleSwitcher } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

const TEXT = {
  kk: {
    title: 'Құпиялылық',
    items: [
      'Біз тек сабақ беру және есеп көрсету үшін қажет деректерді сақтаймыз: ата-ананың email-і мен аты, баланың лақап аты, жас тобы және оқу нәтижелері.',
      'Баланың толық аты-жөні, мекенжайы, суреті сұралмайды.',
      'Баланың дауысы әдепкі бойынша өңделмейді. Ата-ана рұқсат берсе, айтылымды тексеру үшін жазба сөйлеуді танитын сервиске жіберіледі де, бірден жойылады. Аудио сақталмайды.',
      'Аналитика тек өз серверімізде жүргізіледі: IP-мекенжай, құрылғы туралы мәлімет және бөтен трекерлер қолданылмайды.',
      'Ата-ана бала профилін кез келген уақытта жоя алады — барлық оқу деректері бірге жойылады.',
      'Сұрақтар бойынша: support@imarlen.kz',
    ],
  },
  ru: {
    title: 'Конфиденциальность',
    items: [
      'Мы храним только данные, нужные для уроков и отчётов: email и имя родителя, ник ребёнка, возрастную группу и результаты обучения.',
      'Полное имя, адрес и фотографии ребёнка не запрашиваются.',
      'Голос ребёнка по умолчанию не обрабатывается. Если родитель разрешит, запись отправляется в сервис распознавания речи для проверки произношения и сразу удаляется. Аудио не хранится.',
      'Аналитика ведётся только на нашем сервере: без IP-адресов, данных об устройстве и сторонних трекеров.',
      'Родитель может в любой момент удалить профиль ребёнка — все учебные данные удаляются вместе с ним.',
      'Вопросы: support@imarlen.kz',
    ],
  },
  en: {
    title: 'Privacy',
    items: [
      'We keep only what lessons and reports need: the parent’s email and name, the child’s nickname, age group and learning results.',
      'We never ask for a child’s full name, address or photos.',
      'A child’s voice is not processed by default. If a parent allows it, a recording is sent to a speech recognition service to check pronunciation and deleted right away. Audio is never stored.',
      'Analytics run on our own server only: no IP addresses, device fingerprints or third-party trackers.',
      'Parents can delete a child profile at any time; all learning data is deleted with it.',
      'Questions: support@imarlen.kz',
    ],
  },
} as const;

export default function Privacy() {
  const { locale } = useI18n();
  const text = TEXT[locale];
  return (
    <div className="min-h-dvh bg-sky-50 px-4">
      <header className="mx-auto flex max-w-3xl items-center justify-between py-6">
        <Logo />
        <LocaleSwitcher />
      </header>
      <main className="card mx-auto max-w-3xl">
        <h1 className="mb-4 text-3xl font-extrabold">{text.title}</h1>
        <ul className="list-disc space-y-3 pl-6 text-slate-700">
          {text.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </main>
    </div>
  );
}
