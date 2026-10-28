'use client';

import { LegalPage, type LegalText } from '@/components/legal';
import { useI18n } from '@/lib/i18n';

const CONTACT = 'support@imarlen.kz';

const TEXT: Record<'kk' | 'ru' | 'en', LegalText> = {
  kk: {
    title: 'Құпиялылық саясаты',
    updated: 'Соңғы жаңарту: 2026 жылғы қазан',
    intro:
      'EnGame — бастауыш сынып балаларына ағылшын тілінің дыбыстары мен оқуын үйрететін платформа. Біз балалардың деректерін ерекше мұқият қорғаймыз: тек сабақ пен есепке қажеттісін ғана жинаймыз және ешкімге сатпаймыз.',
    sections: [
      {
        h: 'Кім жауапты',
        p: [`EnGame-ді iMARLEN командасы жүргізеді. Деректерге қатысты кез келген сұрақ бойынша жазыңыз: ${CONTACT}.`],
      },
      {
        h: 'Қандай деректер жинаймыз',
        p: [
          'Ата-ана мен мұғалім туралы: аты, email, құпиясөздің хэші (құпиясөздің өзі сақталмайды), интерфейс тілі, ата-ана PIN-кодының хэші.',
          'Бала туралы: лақап аты, аватары, жас тобы және оқу нәтижелері — өткен сабақтар, жауаптар, меңгерілген дыбыстар, XP, тиындар, жетістіктер.',
          'Техникалық: кіру сессиясы (cookie-дегі кездейсоқ токеннің хэші және браузер атауы) — аккаунтты қорғау үшін.',
        ],
      },
      {
        h: 'Нені жинамаймыз',
        p: [
          'Баланың толық аты-жөні, мекенжайы, телефоны, суреті немесе геолокациясы сұралмайды.',
          'Жарнама, жарнамалық трекерлер және бөтен аналитика жүйелері қолданылмайды. Статистика тек өз серверімізде, IP-мекенжайсыз жүргізіледі.',
        ],
      },
      {
        h: 'Баланың дауысы',
        p: [
          'Микрофон әдепкі бойынша өшірулі. Айтылымды тексеру тек ата-ана «Дауысты өңдеу» рұқсатын бергенде қосылады.',
          'Рұқсат болса, қысқа жазба (4 секундқа дейін) сөйлеуді тану сервисіне жіберіліп, бағаланады да, бірден жойылады. Аудио сақталмайды — тек ұпай (0–100) және танылған сөздің мәтіні сақталады.',
        ],
      },
      {
        h: 'Деректерді қалай пайдаланамыз',
        p: [
          'Сабақтарды балаға бейімдеу (әлсіз дыбыстарды уақытында қайталау), ата-ана мен мұғалімге есеп көрсету, аккаунтты қорғау және платформаны жақсарту үшін ғана.',
          'Деректерді сатпаймыз және жарнама үшін бермейміз.',
        ],
      },
      {
        h: 'Кім көре алады',
        p: [
          'Баланың нәтижелерін тек оның ата-анасы көреді. Ата-ана баланы мұғалімнің сыныбына қосылу коды арқылы қосса, сол мұғалім де сынып есебін көреді.',
          'Баланы сыныптан мұғалім шығара алады; ата-ана бұл туралы мұғалімге немесе бізге жаза алады.',
        ],
      },
      {
        h: 'Cookie файлдары',
        p: ['Біз тек қажетті cookie қолданамыз: кіру сессиясы, CSRF қорғанысы және таңдалған интерфейс тілі. Жарнамалық немесе бақылау cookie жоқ.'],
      },
      {
        h: 'Сақтау мерзімі және жою',
        p: [
          'Деректер аккаунт белсенді болған кезде сақталады. Ата-ана бала профилін кез келген уақытта жоя алады — оқу нәтижелері мен статистикасы бірге жойылады.',
          `Аккаунтты толық жою үшін ${CONTACT} адресіне жазыңыз — 30 күн ішінде орындаймыз.`,
        ],
      },
      {
        h: 'Сіздің құқықтарыңыз',
        p: ['Сіз деректеріңізді көруге, түзетуге, жоюды талап етуге және берілген рұқсаттарды (мысалы, дауысты өңдеу) кез келген уақытта қайтарып алуға құқылысыз.'],
      },
      {
        h: 'Өзгерістер',
        p: ['Саясат өзгерсе, осы бетте жаңа нұсқасын жариялаймыз. Маңызды өзгерістер туралы ата-аналарға алдын ала хабарлаймыз.'],
      },
    ],
  },
  ru: {
    title: 'Политика конфиденциальности',
    updated: 'Последнее обновление: октябрь 2026 года',
    intro:
      'EnGame — платформа, которая учит детей начальной школы звукам английского языка и чтению. Мы особенно бережно относимся к данным детей: собираем только то, что нужно для уроков и отчётов, и никому их не продаём.',
    sections: [
      {
        h: 'Кто отвечает',
        p: [`EnGame работает под управлением команды iMARLEN. По любым вопросам о данных пишите: ${CONTACT}.`],
      },
      {
        h: 'Какие данные мы собираем',
        p: [
          'О родителе и учителе: имя, email, хэш пароля (сам пароль не хранится), язык интерфейса, хэш родительского PIN-кода.',
          'О ребёнке: ник, аватар, возрастная группа и результаты обучения — пройденные уроки, ответы, освоенные звуки, XP, монеты, достижения.',
          'Технические: сессия входа (хэш случайного токена из cookie и название браузера) — чтобы защищать аккаунт.',
        ],
      },
      {
        h: 'Что мы не собираем',
        p: [
          'Мы не запрашиваем полное имя ребёнка, адрес, телефон, фотографии или геолокацию.',
          'Никакой рекламы, рекламных трекеров и сторонних систем аналитики. Статистика ведётся только на нашем сервере и без IP-адресов.',
        ],
      },
      {
        h: 'Голос ребёнка',
        p: [
          'Микрофон по умолчанию выключен. Проверка произношения включается, только если родитель дал разрешение «Обработка голоса».',
          'При разрешении короткая запись (до 4 секунд) отправляется в сервис распознавания речи, оценивается и сразу удаляется. Аудио не хранится — сохраняются только балл (0–100) и текст распознанного слова.',
        ],
      },
      {
        h: 'Как мы используем данные',
        p: [
          'Только чтобы подстраивать уроки под ребёнка (вовремя повторять слабые звуки), показывать отчёты родителям и учителям, защищать аккаунт и улучшать платформу.',
          'Мы не продаём данные и не передаём их для рекламы.',
        ],
      },
      {
        h: 'Кто видит данные',
        p: [
          'Результаты ребёнка видит только его родитель. Если родитель добавил ребёнка в класс учителя по коду, этот учитель тоже видит отчёт по классу.',
          'Убрать ребёнка из класса может учитель; родитель может попросить об этом учителя или написать нам.',
        ],
      },
      {
        h: 'Файлы cookie',
        p: ['Мы используем только необходимые cookie: сессия входа, защита от CSRF и выбранный язык интерфейса. Рекламных и отслеживающих cookie нет.'],
      },
      {
        h: 'Срок хранения и удаление',
        p: [
          'Данные хранятся, пока аккаунт активен. Родитель может удалить профиль ребёнка в любой момент — результаты обучения и статистика удаляются вместе с ним.',
          `Чтобы полностью удалить аккаунт, напишите на ${CONTACT} — мы сделаем это в течение 30 дней.`,
        ],
      },
      {
        h: 'Ваши права',
        p: ['Вы можете посмотреть свои данные, исправить их, потребовать удаления и в любой момент отозвать выданные разрешения (например, на обработку голоса).'],
      },
      {
        h: 'Изменения',
        p: ['Если политика изменится, мы опубликуем новую версию на этой странице. О важных изменениях заранее сообщим родителям.'],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: October 2026',
    intro:
      'EnGame teaches primary-school children the sounds of English and how to read. We take extra care with children’s data: we collect only what lessons and reports need, and we never sell it.',
    sections: [
      { h: 'Who is responsible', p: [`EnGame is run by the iMARLEN team. For any question about your data, write to ${CONTACT}.`] },
      {
        h: 'What we collect',
        p: [
          'About parents and teachers: name, email, a hash of the password (never the password itself), interface language and a hash of the parent PIN.',
          'About children: nickname, avatar, age group and learning results — lessons completed, answers, sounds mastered, XP, coins and achievements.',
          'Technical: the sign-in session (a hash of a random cookie token and the browser name), to protect the account.',
        ],
      },
      {
        h: 'What we do not collect',
        p: [
          'We never ask for a child’s full name, address, phone number, photos or location.',
          'No ads, ad trackers or third-party analytics. Statistics run on our own server only, without IP addresses.',
        ],
      },
      {
        h: 'Your child’s voice',
        p: [
          'The microphone is off by default. Pronunciation checks are switched on only when a parent grants «Voice processing».',
          'With permission, a short clip (up to 4 seconds) is sent to a speech recognition service, scored and deleted straight away. Audio is never stored — only the score (0–100) and the recognised word as text.',
        ],
      },
      {
        h: 'How we use data',
        p: [
          'Only to adapt lessons to the child (bringing weak sounds back at the right time), show reports to parents and teachers, protect accounts and improve the platform.',
          'We do not sell data or share it for advertising.',
        ],
      },
      {
        h: 'Who can see it',
        p: [
          'Only a child’s parent sees their results. If the parent adds the child to a teacher’s class with a join code, that teacher also sees the class report.',
          'A teacher can remove a child from the class; parents can ask the teacher or write to us.',
        ],
      },
      {
        h: 'Cookies',
        p: ['We use only essential cookies: the sign-in session, CSRF protection and your chosen interface language. No advertising or tracking cookies.'],
      },
      {
        h: 'Retention and deletion',
        p: [
          'Data is kept while the account is active. Parents can delete a child profile at any time — learning results and statistics are deleted with it.',
          `To delete your whole account, write to ${CONTACT}; we will do it within 30 days.`,
        ],
      },
      {
        h: 'Your rights',
        p: ['You can see your data, correct it, ask for it to be deleted and withdraw permissions you gave (such as voice processing) at any time.'],
      },
      { h: 'Changes', p: ['If this policy changes, we will publish the new version on this page and tell parents about important changes in advance.'] },
    ],
  },
};

export default function Privacy() {
  const { locale } = useI18n();
  return <LegalPage text={TEXT[locale]} />;
}
