/**
 * The 44 phonemes of British English (RP) in synthetic-phonics teaching order.
 * Seed only: after the first seed, admins edit these in the CMS.
 */

export type Category = 'SHORT_VOWEL' | 'LONG_VOWEL' | 'DIPHTHONG' | 'R_CONTROLLED' | 'CONSONANT' | 'DIGRAPH';

export interface PhonemeSeed {
  slug: string;
  symbol: string;
  ipa: string;
  category: Category;
  voiced: boolean;
  graphemes: string[];
  difficulty: number;
  /** Example words; must exist in words.ts. */
  examples: string[];
  mouth: { en: string; kk: string; ru: string };
}

export const PHONEMES: PhonemeSeed[] = [
  // Group 1: s a t i p n
  { slug: 's', symbol: 's', ipa: 's', category: 'CONSONANT', voiced: false, graphemes: ['s', 'ss', 'c', 'ce', 'se'], difficulty: 1, examples: ['sun', 'sit', 'bus'],
    mouth: { en: 'Teeth close together, tongue behind the top teeth. Let air hiss out like a snake: sss.', kk: 'Тістер жақын, тіл жоғарғы тістің артында. Ауаны жыланша ысылдатып шығар: сссс.', ru: 'Зубы сближены, язык за верхними зубами. Выпускай воздух со свистом, как змея: ссс.' } },
  { slug: 'ae', symbol: 'a', ipa: 'æ', category: 'SHORT_VOWEL', voiced: true, graphemes: ['a'], difficulty: 1, examples: ['cat', 'apple', 'hat'],
    mouth: { en: 'Open your mouth wide, tongue low and flat. Short sound: a, as in "cat".', kk: 'Ауызды кең аш, тіл төмен әрі жалпақ. Қысқа дыбыс: «cat» сөзіндегідей.', ru: 'Широко открой рот, язык низко и плоско. Короткий звук, как в «cat».' } },
  { slug: 't', symbol: 't', ipa: 't', category: 'CONSONANT', voiced: false, graphemes: ['t', 'tt'], difficulty: 1, examples: ['top', 'ten', 'cat'],
    mouth: { en: 'Tongue tip taps the ridge behind your top teeth, then lets go with a puff of air. No voice.', kk: 'Тіл ұшы жоғарғы тіс түбіне тиіп, ауамен бірге босайды. Дауыс жоқ.', ru: 'Кончик языка касается бугорка за верхними зубами и отрывается с выдохом. Без голоса.' } },
  { slug: 'i', symbol: 'i', ipa: 'ɪ', category: 'SHORT_VOWEL', voiced: true, graphemes: ['i', 'y', 'e'], difficulty: 1, examples: ['pig', 'sit', 'fish'],
    mouth: { en: 'Lips relaxed and a little spread, mouth slightly open. Short and quick: i, as in "pig".', kk: 'Ерін босаң, сәл созылған, ауыз аз ашық. Қысқа әрі жылдам: «pig» сөзіндегідей.', ru: 'Губы расслаблены и слегка растянуты, рот приоткрыт. Коротко и быстро, как в «pig».' } },
  { slug: 'p', symbol: 'p', ipa: 'p', category: 'CONSONANT', voiced: false, graphemes: ['p', 'pp'], difficulty: 1, examples: ['pig', 'pan', 'map'],
    mouth: { en: 'Press your lips together, then pop them open with a puff of air. Put a hand in front: you feel the air.', kk: 'Ерінді жұмып, ауамен бірге кенет аш. Алақаныңды ауызға тосып, ауаны сез.', ru: 'Сомкни губы и резко раскрой их с выдохом. Поднеси ладонь ко рту: почувствуешь воздух.' } },
  { slug: 'n', symbol: 'n', ipa: 'n', category: 'CONSONANT', voiced: true, graphemes: ['n', 'nn', 'kn'], difficulty: 1, examples: ['net', 'nut', 'pan'],
    mouth: { en: 'Tongue tip on the ridge behind your top teeth. Hum through your nose: nnn.', kk: 'Тіл ұшы жоғарғы тіс түбінде. Мұрын арқылы ыңылда: ннн.', ru: 'Кончик языка за верхними зубами. Гуди через нос: ннн.' } },
  // Group 2: c/k e h r m d
  { slug: 'k', symbol: 'c', ipa: 'k', category: 'CONSONANT', voiced: false, graphemes: ['c', 'k', 'ck', 'ch', 'q', 'x'], difficulty: 1, examples: ['cat', 'kid', 'duck'],
    mouth: { en: 'Back of the tongue presses up at the back of the mouth, then releases with air. No voice.', kk: 'Тілдің арты таңдайдың артқы бөлігіне тіреліп, ауамен босайды. Дауыс жоқ.', ru: 'Задняя часть языка прижимается к нёбу и отрывается с выдохом. Без голоса.' } },
  { slug: 'e', symbol: 'e', ipa: 'e', category: 'SHORT_VOWEL', voiced: true, graphemes: ['e', 'ea'], difficulty: 1, examples: ['egg', 'bed', 'red'],
    mouth: { en: 'Mouth half open, lips a little spread, tongue in the middle. Short: e, as in "bed".', kk: 'Ауыз жартылай ашық, ерін сәл созылған, тіл ортада. Қысқа: «bed» сөзіндегідей.', ru: 'Рот полуоткрыт, губы слегка растянуты, язык посередине. Коротко, как в «bed».' } },
  { slug: 'h', symbol: 'h', ipa: 'h', category: 'CONSONANT', voiced: false, graphemes: ['h'], difficulty: 1, examples: ['hat', 'hen', 'hop'],
    mouth: { en: 'Mouth open, just breathe out softly, like fogging a mirror: h.', kk: 'Ауыз ашық, айнаны буландырғандай ақырын дем шығар: һ.', ru: 'Рот открыт, просто мягко выдохни, как будто дышишь на зеркало: х.' } },
  { slug: 'r', symbol: 'r', ipa: 'r', category: 'CONSONANT', voiced: true, graphemes: ['r', 'rr', 'wr'], difficulty: 2, examples: ['red', 'run', 'rat'],
    mouth: { en: 'Lips a little rounded, tongue tip curls back but does not touch. Do not roll it.', kk: 'Ерін сәл дөңгеленген, тіл ұшы артқа иіледі, бірақ ешнәрсеге тимейді. Дірілдетпе.', ru: 'Губы слегка округлены, кончик языка загнут назад и ничего не касается. Не раскатывай.' } },
  { slug: 'm', symbol: 'm', ipa: 'm', category: 'CONSONANT', voiced: true, graphemes: ['m', 'mm', 'mb'], difficulty: 1, examples: ['map', 'mum', 'jam'],
    mouth: { en: 'Close your lips and hum through your nose: mmm, like something tasty.', kk: 'Ерінді жұмып, мұрын арқылы ыңылда: ммм, дәмді нәрсе жегендей.', ru: 'Сомкни губы и гуди через нос: ммм, как будто что-то вкусное.' } },
  { slug: 'd', symbol: 'd', ipa: 'd', category: 'CONSONANT', voiced: true, graphemes: ['d', 'dd'], difficulty: 1, examples: ['dog', 'dad', 'red'],
    mouth: { en: 'Like t, tongue tip taps behind the top teeth, but use your voice.', kk: 't сияқты, тіл ұшы жоғарғы тіс түбіне тиеді, бірақ дауыспен айтылады.', ru: 'Как t: кончик языка касается за верхними зубами, но с голосом.' } },
  // Group 3: g o u l f b
  { slug: 'g', symbol: 'g', ipa: 'ɡ', category: 'CONSONANT', voiced: true, graphemes: ['g', 'gg'], difficulty: 1, examples: ['goat', 'dog', 'bag'],
    mouth: { en: 'Like c/k at the back of the mouth, but with voice.', kk: 'c/k сияқты, ауыздың артында, бірақ дауыспен.', ru: 'Как c/k в глубине рта, но с голосом.' } },
  { slug: 'o', symbol: 'o', ipa: 'ɒ', category: 'SHORT_VOWEL', voiced: true, graphemes: ['o', 'a'], difficulty: 1, examples: ['dog', 'hop', 'top'],
    mouth: { en: 'Mouth open and lips a little round, tongue low at the back. Short: o, as in "dog".', kk: 'Ауыз ашық, ерін сәл дөңгелек, тіл төменде әрі артта. Қысқа: «dog» сөзіндегідей.', ru: 'Рот открыт, губы чуть округлены, язык низко и сзади. Коротко, как в «dog».' } },
  { slug: 'u', symbol: 'u', ipa: 'ʌ', category: 'SHORT_VOWEL', voiced: true, graphemes: ['u', 'o'], difficulty: 1, examples: ['sun', 'bus', 'cup'],
    mouth: { en: 'Mouth relaxed and half open, tongue in the middle. Short: u, as in "sun".', kk: 'Ауыз босаң, жартылай ашық, тіл ортада. Қысқа: «sun» сөзіндегідей.', ru: 'Рот расслаблен и полуоткрыт, язык посередине. Коротко, как в «sun».' } },
  { slug: 'l', symbol: 'l', ipa: 'l', category: 'CONSONANT', voiced: true, graphemes: ['l', 'll', 'le'], difficulty: 1, examples: ['leg', 'lip', 'doll'],
    mouth: { en: 'Tongue tip up behind the top teeth, let the voice flow around the sides: lll.', kk: 'Тіл ұшы жоғарғы тістің артында, дауыс тілдің екі жағынан ағады: ллл.', ru: 'Кончик языка за верхними зубами, голос проходит по бокам языка: ллл.' } },
  { slug: 'f', symbol: 'f', ipa: 'f', category: 'CONSONANT', voiced: false, graphemes: ['f', 'ff', 'ph'], difficulty: 1, examples: ['fish', 'fan', 'fog'],
    mouth: { en: 'Top teeth gently on your bottom lip. Blow air out: fff. No voice.', kk: 'Жоғарғы тіс астыңғы ерінге ақырын тиеді. Ауа үрле: ффф. Дауыс жоқ.', ru: 'Верхние зубы слегка касаются нижней губы. Выдувай воздух: ффф. Без голоса.' } },
  { slug: 'b', symbol: 'b', ipa: 'b', category: 'CONSONANT', voiced: true, graphemes: ['b', 'bb'], difficulty: 1, examples: ['bat', 'bed', 'bus'],
    mouth: { en: 'Like p, lips together and pop open, but with voice.', kk: 'p сияқты, ерінді жұмып кенет аш, бірақ дауыспен.', ru: 'Как p: сомкни губы и раскрой, но с голосом.' } },
  // Group 4: ai j oa ie ee or
  { slug: 'ai', symbol: 'ai', ipa: 'eɪ', category: 'DIPHTHONG', voiced: true, graphemes: ['ai', 'ay', 'a_e', 'a'], difficulty: 2, examples: ['rain', 'snail', 'play'],
    mouth: { en: 'Start with e and glide to i, lips spreading: ay, as in "rain".', kk: 'e дыбысынан бастап i-ге сырғы, ерін созылады: «rain» сөзіндегідей.', ru: 'Начни с e и плавно перейди к i, губы растягиваются: как в «rain».' } },
  { slug: 'j', symbol: 'j', ipa: 'dʒ', category: 'CONSONANT', voiced: true, graphemes: ['j', 'g', 'ge', 'dge'], difficulty: 2, examples: ['jam', 'jet', 'jug'],
    mouth: { en: 'Lips pushed forward, tongue taps up then slides: j, as in "jam". Use your voice.', kk: 'Ерін алға шығады, тіл жоғары тиіп, сырғып кетеді: «jam» сөзіндегідей. Дауыспен.', ru: 'Губы вытянуты вперёд, язык касается нёба и соскальзывает: как в «jam». С голосом.' } },
  { slug: 'oa', symbol: 'oa', ipa: 'əʊ', category: 'DIPHTHONG', voiced: true, graphemes: ['oa', 'ow', 'o_e', 'o'], difficulty: 2, examples: ['boat', 'goat', 'snow'],
    mouth: { en: 'Start relaxed and round your lips as you finish: oh, as in "boat".', kk: 'Босаң бастап, соңында ерінді дөңгелет: «boat» сөзіндегідей.', ru: 'Начни расслабленно и в конце округли губы: как в «boat».' } },
  { slug: 'ie', symbol: 'ie', ipa: 'aɪ', category: 'DIPHTHONG', voiced: true, graphemes: ['ie', 'igh', 'i_e', 'y'], difficulty: 2, examples: ['pie', 'night', 'light'],
    mouth: { en: 'Open wide for a, then glide up to i: eye, as in "pie".', kk: 'a үшін кең ашып, i-ге қарай сырғы: «pie» сөзіндегідей.', ru: 'Широко открой рот на a и плавно перейди к i: как в «pie».' } },
  { slug: 'ee', symbol: 'ee', ipa: 'iː', category: 'LONG_VOWEL', voiced: true, graphemes: ['ee', 'ea', 'e', 'y'], difficulty: 2, examples: ['tree', 'bee', 'sheep'],
    mouth: { en: 'Smile wide, tongue high and forward. Long sound: eee, as in "tree".', kk: 'Кең жымый, тіл жоғарыда әрі алдында. Созылыңқы: «tree» сөзіндегідей.', ru: 'Широко улыбнись, язык высоко и впереди. Долгий звук: как в «tree».' } },
  { slug: 'or', symbol: 'or', ipa: 'ɔː', category: 'R_CONTROLLED', voiced: true, graphemes: ['or', 'aw', 'al', 'au', 'ore'], difficulty: 2, examples: ['fork', 'horse', 'corn'],
    mouth: { en: 'Lips round and pushed forward, long sound: or, as in "fork". In British English you do not say the r.', kk: 'Ерін дөңгелек әрі алға шыққан, созылыңқы: «fork» сөзіндегідей. Британ тілінде r айтылмайды.', ru: 'Губы округлены и вытянуты, долгий звук: как в «fork». В британском r не произносится.' } },
  // Group 5: z w ng v oo oo
  { slug: 'z', symbol: 'z', ipa: 'z', category: 'CONSONANT', voiced: true, graphemes: ['z', 'zz', 's'], difficulty: 1, examples: ['zip', 'zoo', 'buzz'],
    mouth: { en: 'Like s, but use your voice, like a buzzing bee: zzz.', kk: 's сияқты, бірақ дауыспен, ызыңдаған арадай: ззз.', ru: 'Как s, но с голосом, как жужжащая пчела: ззз.' } },
  { slug: 'w', symbol: 'w', ipa: 'w', category: 'CONSONANT', voiced: true, graphemes: ['w', 'wh', 'u'], difficulty: 2, examples: ['web', 'wet', 'wig'],
    mouth: { en: 'Round your lips small like a kiss, then open them quickly: w.', kk: 'Ерінді сүйгендей кішкене дөңгелетіп, тез аш: w.', ru: 'Округли губы маленьким кружком, как для поцелуя, и быстро раскрой: w.' } },
  { slug: 'ng', symbol: 'ng', ipa: 'ŋ', category: 'DIGRAPH', voiced: true, graphemes: ['ng', 'n'], difficulty: 2, examples: ['ring', 'king', 'swing'],
    mouth: { en: 'Back of the tongue up at the back of the mouth, hum through your nose: ng, as in "ring".', kk: 'Тілдің арты таңдайға көтеріледі, мұрын арқылы ыңылда: «ring» сөзіндегідей.', ru: 'Задняя часть языка поднята к нёбу, гуди через нос: как в «ring».' } },
  { slug: 'v', symbol: 'v', ipa: 'v', category: 'CONSONANT', voiced: true, graphemes: ['v', 've'], difficulty: 2, examples: ['van', 'vet', 'vest'],
    mouth: { en: 'Like f, top teeth on the bottom lip, but use your voice: vvv.', kk: 'f сияқты, жоғарғы тіс астыңғы ерінде, бірақ дауыспен: ввв.', ru: 'Как f: верхние зубы на нижней губе, но с голосом: ввв.' } },
  { slug: 'oo-short', symbol: 'oo', ipa: 'ʊ', category: 'SHORT_VOWEL', voiced: true, graphemes: ['oo', 'u', 'oul'], difficulty: 2, examples: ['book', 'look', 'foot'],
    mouth: { en: 'Lips a little round, short sound: oo, as in "book".', kk: 'Ерін сәл дөңгелек, қысқа дыбыс: «book» сөзіндегідей.', ru: 'Губы слегка округлены, короткий звук: как в «book».' } },
  { slug: 'oo-long', symbol: 'oo', ipa: 'uː', category: 'LONG_VOWEL', voiced: true, graphemes: ['oo', 'ue', 'ew', 'u_e'], difficulty: 2, examples: ['moon', 'zoo', 'spoon'],
    mouth: { en: 'Lips round and pushed forward, long sound: oooo, as in "moon".', kk: 'Ерін дөңгелек әрі алға шыққан, созылыңқы: «moon» сөзіндегідей.', ru: 'Губы округлены и вытянуты, долгий звук: как в «moon».' } },
  // Group 6: y x(ks) ch sh th th
  { slug: 'y', symbol: 'y', ipa: 'j', category: 'CONSONANT', voiced: true, graphemes: ['y'], difficulty: 2, examples: ['yes', 'yak', 'yell'],
    mouth: { en: 'Tongue high near the roof of the mouth, then slide into the next sound: y, as in "yes".', kk: 'Тіл таңдайға жақын жоғарыда, келесі дыбысқа сырғиды: «yes» сөзіндегідей.', ru: 'Язык высоко у нёба и скользит к следующему звуку: как в «yes».' } },
  { slug: 'ch', symbol: 'ch', ipa: 'tʃ', category: 'DIGRAPH', voiced: false, graphemes: ['ch', 'tch'], difficulty: 2, examples: ['chip', 'chin', 'lunch'],
    mouth: { en: 'Lips pushed forward, tongue taps and lets air out in a sneeze: ch. No voice.', kk: 'Ерін алға шыққан, тіл тиіп, түшкіргендей ауа шығады: ч. Дауыс жоқ.', ru: 'Губы вытянуты, язык касается нёба и выпускает воздух, как чих: ч. Без голоса.' } },
  { slug: 'sh', symbol: 'sh', ipa: 'ʃ', category: 'DIGRAPH', voiced: false, graphemes: ['sh', 'ch', 'ti'], difficulty: 2, examples: ['ship', 'shop', 'fish'],
    mouth: { en: 'Round your lips and push them forward, teeth close. Blow quietly: shhh, like asking for quiet.', kk: 'Ерінді дөңгелетіп алға шығар, тістер жақын. Ақырын үрле: шшш, «тыныш» дегендей.', ru: 'Округли губы и вытяни вперёд, зубы сближены. Тихо выдувай: шшш, как просишь тишины.' } },
  { slug: 'th-unvoiced', symbol: 'th', ipa: 'θ', category: 'DIGRAPH', voiced: false, graphemes: ['th'], difficulty: 3, examples: ['thumb', 'bath', 'moth'],
    mouth: { en: 'Put your tongue tip between your teeth and blow air out gently. No voice: th, as in "thumb".', kk: 'Тіл ұшын тістердің арасына қойып, ақырын ауа үрле. Дауыс жоқ: «thumb» сөзіндегідей.', ru: 'Кончик языка между зубами, мягко выдувай воздух. Без голоса: как в «thumb».' } },
  { slug: 'th-voiced', symbol: 'th', ipa: 'ð', category: 'DIGRAPH', voiced: true, graphemes: ['th'], difficulty: 3, examples: ['this', 'that', 'then'],
    mouth: { en: 'Tongue tip between your teeth again, but this time use your voice: th, as in "this".', kk: 'Тіл ұшы тағы тістердің арасында, бірақ бұл жолы дауыспен: «this» сөзіндегідей.', ru: 'Снова кончик языка между зубами, но теперь с голосом: как в «this».' } },
  // Group 7: ou oi er ar
  { slug: 'ow', symbol: 'ou', ipa: 'aʊ', category: 'DIPHTHONG', voiced: true, graphemes: ['ou', 'ow'], difficulty: 2, examples: ['cow', 'owl', 'house'],
    mouth: { en: 'Open wide, then round your lips: ow, as if you hurt your finger.', kk: 'Кең ашып, ерінді дөңгелет: «ау», саусағың ауырғандай.', ru: 'Широко открой рот и округли губы: «ау», как будто ударил палец.' } },
  { slug: 'oi', symbol: 'oi', ipa: 'ɔɪ', category: 'DIPHTHONG', voiced: true, graphemes: ['oi', 'oy'], difficulty: 2, examples: ['coin', 'boy', 'toy'],
    mouth: { en: 'Start with round lips for o, glide to i: oy, as in "coin".', kk: 'o үшін ерінді дөңгелетіп, i-ге сырғы: «coin» сөзіндегідей.', ru: 'Начни с округлённых губ на o и перейди к i: как в «coin».' } },
  { slug: 'er', symbol: 'er', ipa: 'ɜː', category: 'R_CONTROLLED', voiced: true, graphemes: ['er', 'ir', 'ur'], difficulty: 3, examples: ['bird', 'girl', 'nurse'],
    mouth: { en: 'Lips relaxed, tongue in the middle, long sound: er, as in "bird". No r sound in British English.', kk: 'Ерін босаң, тіл ортада, созылыңқы: «bird» сөзіндегідей. Британ тілінде r айтылмайды.', ru: 'Губы расслаблены, язык посередине, долгий звук: как в «bird». В британском r не звучит.' } },
  { slug: 'ar', symbol: 'ar', ipa: 'ɑː', category: 'R_CONTROLLED', voiced: true, graphemes: ['ar', 'a'], difficulty: 2, examples: ['car', 'star', 'park'],
    mouth: { en: 'Open your mouth wide like at the doctor: aaah, as in "car".', kk: 'Дәрігерде отырғандай ауызды кең аш: «car» сөзіндегідей.', ru: 'Широко открой рот, как у врача: как в «car».' } },
  // Remaining phonemes
  { slug: 'schwa', symbol: 'a', ipa: 'ə', category: 'SHORT_VOWEL', voiced: true, graphemes: ['a', 'e', 'er', 'o', 'u', 'ure'], difficulty: 3, examples: ['banana', 'sofa', 'teacher'],
    mouth: { en: 'The lazy sound: mouth and tongue fully relaxed, very short: uh, like the a at the end of "sofa".', kk: '«Жалқау» дыбыс: ауыз бен тіл толық босаң, өте қысқа: «sofa» сөзінің соңындағыдай.', ru: '«Ленивый» звук: рот и язык полностью расслаблены, очень коротко: как a в конце «sofa».' } },
  { slug: 'ear', symbol: 'ear', ipa: 'ɪə', category: 'DIPHTHONG', voiced: true, graphemes: ['ear', 'eer', 'ere'], difficulty: 3, examples: ['ear', 'deer', 'beard'],
    mouth: { en: 'Start with a short i and relax into uh: ear, as in "deer".', kk: 'Қысқа i-ден бастап, босаң «ə»-ге өт: «deer» сөзіндегідей.', ru: 'Начни с короткого i и расслабленно перейди к «э»: как в «deer».' } },
  { slug: 'air', symbol: 'air', ipa: 'eə', category: 'DIPHTHONG', voiced: true, graphemes: ['air', 'are', 'ear'], difficulty: 3, examples: ['chair', 'hair', 'pear'],
    mouth: { en: 'Start with e and relax into uh: air, as in "chair".', kk: 'e-ден бастап, босаң «ə»-ге өт: «chair» сөзіндегідей.', ru: 'Начни с e и расслабленно перейди к «э»: как в «chair».' } },
  { slug: 'ure', symbol: 'ure', ipa: 'ʊə', category: 'DIPHTHONG', voiced: true, graphemes: ['ure', 'our', 'oor'], difficulty: 3, examples: ['tour', 'poor'],
    mouth: { en: 'Round lips for a short oo, then relax: ure, as in "tour". Many speakers say "or" instead.', kk: 'Қысқа oo үшін ерінді дөңгелетіп, босаңсы: «tour» сөзіндегідей. Көп адам «or» деп айтады.', ru: 'Округли губы на короткое oo и расслабь: как в «tour». Многие произносят как «or».' } },
  { slug: 'zh', symbol: 's', ipa: 'ʒ', category: 'CONSONANT', voiced: true, graphemes: ['s', 'si', 'ge'], difficulty: 3, examples: ['treasure', 'television', 'measure'],
    mouth: { en: 'Like sh with lips pushed forward, but with voice: zh, as in "treasure".', kk: 'sh сияқты, ерін алға шыққан, бірақ дауыспен: ж, «treasure» сөзіндегідей.', ru: 'Как sh, губы вытянуты, но с голосом: ж, как в «treasure».' } },
];
