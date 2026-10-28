'use client';

import { LegalPage, type LegalText } from '@/components/legal';
import { useI18n } from '@/lib/i18n';

const CONTACT = 'support@imarlen.kz';

const TEXT: Record<'kk' | 'ru' | 'en', LegalText> = {
  kk: {
    title: 'Пайдалану шарттары',
    updated: 'Соңғы жаңарту: 2026 жылғы қазан',
    intro: 'Бұл шарттар EnGame платформасын пайдалану ережелерін сипаттайды. Аккаунт ашу арқылы сіз осы шарттармен және Құпиялылық саясатымен келісесіз.',
    sections: [
      { h: 'Сервис туралы', p: ['EnGame — 4–11 жастағы балаларға арналған ағылшын тілі фоникасы бойынша оқу платформасы: дыбыстар, әріптер, сөз құрау, оқу, ойындар, ата-ана мен мұғалімге есептер.'] },
      {
        h: 'Аккаунттар',
        p: [
          'Аккаунтты кәмелетке толған ата-ана, заңды өкіл немесе мұғалім ашады. Бала профильдерін ата-ана жасайды және басқарады.',
          'Құпиясөз бен ата-ана PIN-кодын құпия ұстаңыз. Аккаунт арқылы жасалған әрекеттерге аккаунт иесі жауап береді.',
        ],
      },
      {
        h: 'Мұғалімдер мен сыныптар',
        p: [
          'Мұғалім сынып құрып, қосылу кодын ата-аналарға береді. Баланы сыныпқа тек ата-ана қосады.',
          'Мұғалім оқушылардың деректерін тек оқу мақсатында пайдаланады және оларды үшінші тұлғаларға бермейді.',
        ],
      },
      {
        h: 'Дұрыс пайдалану',
        p: [
          'Платформаны бұзуға, басқа адамдардың аккаунтына кіруге, автоматты түрде деректер жинауға немесе сервиске зиян келтіруге тыйым салынады.',
          'Ережені бұзған аккаунттың қолжетімділігін шектеуге немесе тоқтатуға құқымыз бар.',
        ],
      },
      { h: 'Контент', p: ['Сабақтар, суреттер, дыбыс жазбалары және дизайн iMARLEN-ге тиесілі немесе лицензия бойынша қолданылады. Оларды тек жеке және сабақтағы оқу үшін пайдалануға болады.'] },
      {
        h: 'Сервистің қолжетімділігі',
        p: [
          'Біз платформаның тұрақты жұмысына тырысамыз, бірақ үзіліссіз жұмысқа кепілдік бере алмаймыз. Техникалық жұмыстар кезінде сервис уақытша қолжетімсіз болуы мүмкін.',
          'Айтылымды бағалау шамамен беріледі және логопедтің немесе мұғалімнің кәсіби бағасын алмастырмайды.',
        ],
      },
      { h: 'Аккаунтты жою', p: [`Ата-ана бала профилін кез келген уақытта жоя алады. Бүкіл аккаунтты жою үшін ${CONTACT} адресіне жазыңыз.`] },
      { h: 'Өзгерістер', p: ['Шарттар өзгерсе, жаңа нұсқасын осы бетте жариялаймыз. Өзгерістерден кейін сервисті пайдалануды жалғастыру — жаңа шарттармен келісу дегенді білдіреді.'] },
      { h: 'Байланыс', p: [`Сұрақтар мен ұсыныстар: ${CONTACT}.`] },
    ],
  },
  ru: {
    title: 'Условия использования',
    updated: 'Последнее обновление: октябрь 2026 года',
    intro: 'Эти условия описывают правила использования платформы EnGame. Создавая аккаунт, вы соглашаетесь с ними и с Политикой конфиденциальности.',
    sections: [
      { h: 'О сервисе', p: ['EnGame — обучающая платформа по английской фонике для детей 4–11 лет: звуки, буквы, слияние, чтение, игры и отчёты для родителей и учителей.'] },
      {
        h: 'Аккаунты',
        p: [
          'Аккаунт создаёт совершеннолетний родитель, законный представитель или учитель. Профили детей создаёт и ведёт родитель.',
          'Храните пароль и родительский PIN-код в тайне. За действия, совершённые через аккаунт, отвечает его владелец.',
        ],
      },
      {
        h: 'Учителя и классы',
        p: [
          'Учитель создаёт класс и передаёт код родителям. Добавить ребёнка в класс может только родитель.',
          'Учитель использует данные учеников только в учебных целях и не передаёт их третьим лицам.',
        ],
      },
      {
        h: 'Правила использования',
        p: [
          'Запрещено взламывать платформу, входить в чужие аккаунты, автоматически собирать данные или иначе вредить сервису.',
          'Мы можем ограничить или прекратить доступ аккаунта, нарушившего правила.',
        ],
      },
      { h: 'Контент', p: ['Уроки, изображения, аудиозаписи и дизайн принадлежат iMARLEN или используются по лицензии. Их можно использовать только для личного обучения и на уроках.'] },
      {
        h: 'Доступность сервиса',
        p: [
          'Мы стараемся, чтобы платформа работала стабильно, но не гарантируем бесперебойную работу. Во время технических работ сервис может быть временно недоступен.',
          'Оценка произношения приблизительная и не заменяет профессиональную оценку логопеда или учителя.',
        ],
      },
      { h: 'Удаление аккаунта', p: [`Родитель может удалить профиль ребёнка в любой момент. Чтобы удалить весь аккаунт, напишите на ${CONTACT}.`] },
      { h: 'Изменения', p: ['Если условия изменятся, мы опубликуем новую версию на этой странице. Продолжая пользоваться сервисом после изменений, вы соглашаетесь с новыми условиями.'] },
      { h: 'Контакты', p: [`Вопросы и предложения: ${CONTACT}.`] },
    ],
  },
  en: {
    title: 'Terms of Use',
    updated: 'Last updated: October 2026',
    intro: 'These terms describe how EnGame may be used. By creating an account you agree to them and to our Privacy Policy.',
    sections: [
      { h: 'About the service', p: ['EnGame is an English phonics learning platform for children aged 4–11: sounds, letters, blending, reading, games and reports for parents and teachers.'] },
      {
        h: 'Accounts',
        p: [
          'Accounts are created by an adult parent, legal guardian or teacher. Parents create and manage child profiles.',
          'Keep your password and parent PIN secret. The account holder is responsible for what is done with the account.',
        ],
      },
      {
        h: 'Teachers and classes',
        p: [
          'Teachers create a class and share its join code with parents. Only a parent can add a child to a class.',
          'Teachers use pupils’ data for teaching only and do not pass it to third parties.',
        ],
      },
      {
        h: 'Acceptable use',
        p: [
          'Do not try to break into the platform or other people’s accounts, scrape data automatically or otherwise harm the service.',
          'We may limit or close accounts that break these rules.',
        ],
      },
      { h: 'Content', p: ['Lessons, pictures, recordings and design belong to iMARLEN or are used under licence. You may use them for personal and classroom learning only.'] },
      {
        h: 'Availability',
        p: [
          'We work to keep the platform running smoothly but cannot promise it will never be interrupted. It may be briefly unavailable during maintenance.',
          'Pronunciation scores are approximate and do not replace a speech therapist’s or teacher’s professional judgement.',
        ],
      },
      { h: 'Deleting an account', p: [`Parents can delete a child profile at any time. To delete the whole account, write to ${CONTACT}.`] },
      { h: 'Changes', p: ['If these terms change, we will publish the new version here. Using the service after a change means you accept the new terms.'] },
      { h: 'Contact', p: [`Questions and suggestions: ${CONTACT}.`] },
    ],
  },
};

export default function Terms() {
  const { locale } = useI18n();
  return <LegalPage text={TEXT[locale]} />;
}
