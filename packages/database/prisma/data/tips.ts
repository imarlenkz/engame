/**
 * Short child-facing tip for each of the 44 sounds (Phoneme.tip), in three languages.
 * Each tip names a familiar comparison and the most common mistake Kazakh- and Russian-speaking children make.
 * Seed only: the seed fills an empty tip but never overwrites one an admin has edited.
 */
export type Tip = { en: string; kk: string; ru: string };

export const PHONEME_TIPS: Record<string, Tip> = {
  s: {
    en: 'Hiss like a snake: sss. Keep your tongue behind your teeth, not between them.',
    kk: 'Жыланша ысылда: ссс. Тіл тістің артында болсын, арасына шықпасын.',
    ru: 'Шипи как змея: ссс. Язык за зубами, а не между ними.',
  },
  ae: {
    en: 'Drop your jaw more than for the Russian «э». It sits between «а» and «э»: c-a-t.',
    kk: 'Иекті қазақтың «ә» дыбысындағыдай төмен түсір: cat — «кәт» сияқты.',
    ru: 'Опусти челюсть ниже, чем для «э». Звук между «а» и «э»: c-a-t.',
  },
  t: {
    en: 'Touch the ridge above your teeth, not the teeth. Put your hand in front: you feel a little puff of air.',
    kk: 'Тіл тіске емес, тіс түбіндегі дөңеске тисін. Алақаныңды ұста — ауа үрлейді.',
    ru: 'Касайся бугорка над зубами, а не зубов. Поднеси ладонь — почувствуешь лёгкий выдох.',
  },
  i: {
    en: 'Short and relaxed — shorter than «и». Do not smile wide: pig is not «пиг», it is closer to «пыг».',
    kk: 'Қысқа әрі босаң — «и»-ден қысқа. Ерінді созып жымыйма: pig сөзі «пиг» емес, «пыг»-қа жақын.',
    ru: 'Коротко и расслабленно — короче, чем «и». Не улыбайся широко: pig ближе к «пыг», чем к «пиг».',
  },
  p: {
    en: 'Close your lips and pop! Hold a paper in front — it should move a little.',
    kk: 'Ерінді жұм да, «поп!» деп аш. Алдыңа қағаз ұста — ол сәл қозғалуы керек.',
    ru: 'Сомкни губы и «хлопни»! Поднеси листок — он должен шевельнуться.',
  },
  n: {
    en: 'Hum with your tongue up behind your top teeth. Touch your nose — it buzzes.',
    kk: 'Тіл жоғарғы тістің артында, ыңылда. Мұрныңды ұста — дірілдейді.',
    ru: 'Гуди, язык за верхними зубами. Потрогай нос — он вибрирует.',
  },
  k: {
    en: 'The back of your tongue pushes up and lets go: k! Like a little cough, no voice.',
    kk: 'Тілдің арты көтеріліп, кенет босайды: к! Жөтелгендей, дауыссыз.',
    ru: 'Задняя часть языка поднимается и отпускает: к! Как маленький кашель, без голоса.',
  },
  e: {
    en: 'Like the «е» in «этот», but short. Mouth only a little open: e-gg.',
    kk: '«Эх» дегендегі «э»-ге ұқсас, бірақ қысқа. Ауыз аз ашық: e-gg.',
    ru: 'Как «э» в слове «этот», но коротко. Рот приоткрыт: e-gg.',
  },
  h: {
    en: 'Just breathe out, like warming your hands: h-h-h. It is softer than «х» — no scratch in the throat.',
    kk: 'Қолыңды жылытқандай жай ғана дем шығар: һ-һ-һ. «Х»-дан жұмсақ, тамақ қырылдамайды.',
    ru: 'Просто выдохни, как будто греешь руки: h-h-h. Мягче, чем «х», — горло не скребёт.',
  },
  r: {
    en: 'Do not roll it like «р»! Curl your tongue back and do not let it touch anything: rrr.',
    kk: '«Р» сияқты дірілдетпе! Тіл ұшын артқа иіп, ешнәрсеге тигізбе: rrr.',
    ru: 'Не раскатывай, как «р»! Загни кончик языка назад и ничего им не касайся: rrr.',
  },
  m: {
    en: 'Close your lips and hum, like something tastes yummy: mmm.',
    kk: 'Ерінді жұмып, дәмді тағам жегендей ыңылда: ммм.',
    ru: 'Сомкни губы и мычи, как будто вкусно: ммм.',
  },
  d: {
    en: 'Like t, but with your voice on. Touch your throat — it buzzes for d.',
    kk: 't сияқты, бірақ дауыспен. Тамағыңды ұста — d айтқанда дірілдейді.',
    ru: 'Как t, но с голосом. Потрогай горло — на d оно вибрирует.',
  },
  g: {
    en: 'Like k, but with your voice: g-g-g, as in «goat».',
    kk: 'k сияқты, бірақ дауыспен: г-г-г, «goat» сөзіндегідей.',
    ru: 'Как k, но с голосом: г-г-г, как в «goat».',
  },
  o: {
    en: 'Round your lips and open wide, short: o-n. It is shorter and more open than «о».',
    kk: 'Ерінді дөңгелетіп кең аш, қысқа айт: o-n. Қазақтың «о»-сынан қысқа әрі ашық.',
    ru: 'Округли губы и открой рот пошире, коротко: o-n. Короче и открытее, чем «о».',
  },
  u: {
    en: 'A short «а» from the middle of the mouth: sun is «сан», not «сун».',
    kk: 'Ауыздың ортасынан шығатын қысқа «а»: sun — «сун» емес, «сан».',
    ru: 'Короткое «а» из середины рта: sun звучит как «сан», а не «сун».',
  },
  l: {
    en: 'Tongue tip up behind your teeth and let the sound flow around it: lll. Lighter than «л».',
    kk: 'Тіл ұшы тістің артында, дыбыс оның жанынан ағады: ллл. «Л»-дан жеңілірек.',
    ru: 'Кончик языка за зубами, звук обтекает его: ллл. Легче, чем «л».',
  },
  f: {
    en: 'Top teeth gently on your bottom lip, then blow: fff — like cooling soup.',
    kk: 'Жоғарғы тіс астыңғы ерінге тиеді де, үрлейсің: ффф — сорпаны суытқандай.',
    ru: 'Верхние зубы на нижней губе, дуй: ффф — как остужаешь суп.',
  },
  b: {
    en: 'Like p, but with your voice. Lips together, then b!',
    kk: 'p сияқты, бірақ дауыспен. Ерінді жұм да — b!',
    ru: 'Как p, но с голосом. Сомкни губы — и b!',
  },
  ai: {
    en: 'Two sounds glued together: «эй». Say «эй!» like calling a friend.',
    kk: 'Екі дыбыс бірігеді: «эй». Досыңды шақырғандай «эй!» де.',
    ru: 'Два звука слитно: «эй». Скажи «эй!», будто зовёшь друга.',
  },
  j: {
    en: 'Like «дж» said together quickly, as in «jam». One sound, not two.',
    kk: 'Тез әрі бірге айтылған «дж», «jam» сөзіндегідей. Екі емес, бір дыбыс.',
    ru: 'Как «дж», сказанное слитно и быстро, как в «jam». Один звук, а не два.',
  },
  oa: {
    en: 'Start with a lazy «ə» and finish with round lips: «əу». Not a plain «о»!',
    kk: 'Босаң «ə»-ден бастап, ерінді дөңгелетіп аяқта: «əу». Жай «о» емес!',
    ru: 'Начни с ленивого «ə» и закончи округлёнными губами: «əу». Не просто «о»!',
  },
  ie: {
    en: 'Two sounds glued together: «ай», as in «pie».',
    kk: 'Екі дыбыс бірігеді: «ай», «pie» сөзіндегідей.',
    ru: 'Два звука слитно: «ай», как в «pie».',
  },
  ee: {
    en: 'Smile and make it long: «иии». Longer than the short i in «pig».',
    kk: 'Жымиып, созып айт: «иии». «Pig» сөзіндегі қысқа i-ден ұзақ.',
    ru: 'Улыбнись и тяни долго: «иии». Дольше, чем короткое i в «pig».',
  },
  or: {
    en: 'A long round «о-о»: f-or-k. In British English you do not say the r.',
    kk: 'Ұзақ әрі дөңгелек «о-о»: f-or-k. Британ тілінде r айтылмайды.',
    ru: 'Долгое округлое «о-о»: f-or-k. В британском английском r не произносится.',
  },
  z: {
    en: 'Buzz like a bee: zzz. The s at the end of words like «dogs» often sounds like z.',
    kk: 'Арадай ызыңда: ззз. «Dogs» сияқты сөздердің соңындағы s көбіне z болып айтылады.',
    ru: 'Жужжи как пчела: ззз. Буква s в конце слов вроде «dogs» часто звучит как z.',
  },
  w: {
    en: 'Make a tiny circle with your lips, then open: w. It is not «в» — teeth do not touch your lip!',
    kk: 'Ерінді кішкене дөңгелек қылып, аш: w. Бұл «в» емес — тіс ерінге тимейді!',
    ru: 'Сделай губы маленьким кружком и раскрой: w. Это не «в» — зубы губу не трогают!',
  },
  ng: {
    en: 'Like the Kazakh «ң» in «аң»! Hum through your nose and do not add a g at the end.',
    kk: 'Қазақтың «аң» сөзіндегі «ң»-ы сияқты! Мұрыннан ыңылда, соңына г қоспа.',
    ru: 'Как казахское «ң»! Гуди через нос и не добавляй г в конце: ring, а не «ринг».',
  },
  v: {
    en: 'Top teeth on your bottom lip and use your voice: vvv. Like «в», and different from w.',
    kk: 'Жоғарғы тіс астыңғы ерінде, дауыспен: ввв. «В» сияқты, w-дан басқа.',
    ru: 'Верхние зубы на нижней губе, с голосом: ввв. Как «в», и не путай с w.',
  },
  'oo-short': {
    en: 'A short, relaxed «у»: b-oo-k. Do not stretch it.',
    kk: 'Қысқа, босаң «у»: b-oo-k. Созба.',
    ru: 'Короткое расслабленное «у»: b-oo-k. Не тяни.',
  },
  'oo-long': {
    en: 'A long «ууу» with round lips, like an owl: m-oo-n.',
    kk: 'Ерін дөңгелек, ұзақ «ууу», үкі сияқты: m-oo-n.',
    ru: 'Долгое «ууу» с округлёнными губами, как сова: m-oo-n.',
  },
  y: {
    en: 'Like «й» at the start of «йогурт»: y-e-s. The letter y is a consonant here.',
    kk: '«Йогурт» сөзінің басындағы «й» сияқты: y-e-s. Мұнда y — дауыссыз.',
    ru: 'Как «й» в начале слова «йогурт»: y-e-s. Здесь y — согласный.',
  },
  ch: {
    en: 'Like «ч» with lips pushed forward: ch-ip. A short sneeze sound, no voice.',
    kk: 'Ерінді алға шығарып айтылған «ч»: ch-ip. Қысқа, түшкіргендей, дауыссыз.',
    ru: 'Как «ч» с вытянутыми губами: ch-ip. Короткий звук, как чих, без голоса.',
  },
  sh: {
    en: 'Lips round and forward, like asking for quiet: shhh. Softer than «ш».',
    kk: '«Тыныш!» дегендей ерінді дөңгелетіп алға шығар: шшш. «Ш»-дан жұмсақ.',
    ru: 'Губы округлены и вытянуты, как когда просишь тишины: шшш. Мягче, чем «ш».',
  },
  'th-unvoiced': {
    en: 'Stick the tip of your tongue out a little between your teeth and blow. It is not «с» or «ф»!',
    kk: 'Тіл ұшын тістің арасынан сәл шығарып үрле. Бұл «с» да, «ф» да емес!',
    ru: 'Высунь кончик языка между зубами и подуй. Это не «с» и не «ф»!',
  },
  'th-voiced': {
    en: 'Tongue between your teeth again, now with your voice — it tickles! It is not «з» or «д».',
    kk: 'Тіл тағы тістің арасында, енді дауыспен — қытықтайды! Бұл «з» да, «д» да емес.',
    ru: 'Снова язык между зубами, но с голосом — щекотно! Это не «з» и не «д».',
  },
  ow: {
    en: '«Ау!» — like you bumped your knee: c-ow.',
    kk: '«Ау!» — тізеңді соғып алғандай: c-ow.',
    ru: '«Ау!» — как будто ударил коленку: c-ow.',
  },
  oi: {
    en: 'Two sounds glued together: «ой», as in «boy».',
    kk: 'Екі дыбыс бірігеді: «ой», «boy» сөзіндегідей.',
    ru: 'Два звука слитно: «ой», как в «boy».',
  },
  er: {
    en: 'Lips relaxed, a long sound between «ё» and «э»: b-ir-d. No «р» at all!',
    kk: 'Ерін босаң, «ө» мен «э» арасындағы ұзақ дыбыс: b-ir-d. «Р» мүлде жоқ!',
    ru: 'Губы расслаблены, долгий звук между «ё» и «э»: b-ir-d. Никакого «р»!',
  },
  ar: {
    en: 'Open wide and say a long «ааа», like at the doctor: c-ar. No «р».',
    kk: 'Дәрігерде отырғандай ауызды кең ашып, ұзақ «ааа» де: c-ar. «Р» жоқ.',
    ru: 'Открой рот, как у врача, и скажи долгое «ааа»: c-ar. Без «р».',
  },
  schwa: {
    en: 'The quietest, laziest sound in English: a tiny «ə». You hear it at the end of «sofa» and «banana».',
    kk: 'Ағылшын тіліндегі ең жалқау, ең ақырын дыбыс: кішкентай «ə». «Sofa», «banana» соңында естіледі.',
    ru: 'Самый ленивый и тихий звук английского: маленькое «ə». Слышно в конце «sofa» и «banana».',
  },
  ear: {
    en: '«И» sliding into a lazy «ə»: «иə», as in «deer». No «р» at the end.',
    kk: '«И»-ден босаң «ə»-ге сырғу: «иə», «deer» сөзіндегідей. Соңында «р» жоқ.',
    ru: '«И» плавно переходит в ленивое «ə»: «иə», как в «deer». На конце «р» нет.',
  },
  air: {
    en: '«Э» sliding into a lazy «ə»: «эə», as in «chair». No «р» at the end.',
    kk: '«Э»-ден босаң «ə»-ге сырғу: «эə», «chair» сөзіндегідей. Соңында «р» жоқ.',
    ru: '«Э» плавно переходит в ленивое «ə»: «эə», как в «chair». На конце «р» нет.',
  },
  ure: {
    en: 'A short «у» sliding into «ə»: «уə», as in «tour». Many people simply say «or».',
    kk: 'Қысқа «у»-дан «ə»-ге сырғу: «уə», «tour» сөзіндегідей. Көп адам жай «or» дейді.',
    ru: 'Короткое «у» переходит в «ə»: «уə», как в «tour». Многие говорят просто «or».',
  },
  zh: {
    en: 'Like «ж», but softer and with rounder lips: trea-s-ure.',
    kk: '«Ж» сияқты, бірақ жұмсағырақ, ерін дөңгелегірек: trea-s-ure.',
    ru: 'Как «ж», но мягче и с округлёнными губами: trea-s-ure.',
  },
};
