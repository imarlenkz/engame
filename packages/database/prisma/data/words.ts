/**
 * Starter word bank. Breakdown format: "grapheme:phonemeSlug" separated by spaces; graphemes concatenate to the word.
 * Sight words have no breakdown (they are learned as whole words).
 */

export type Pattern = 'CVC' | 'CCVC' | 'CVCC' | 'CCVCC' | 'DIGRAPH' | 'SIGHT' | 'OTHER';

export interface WordSeed {
  text: string;
  pattern: Pattern;
  emoji: string | null;
  kk: string;
  ru: string;
  breakdown: string;
  difficulty: number;
}

const w = (
  text: string,
  pattern: Pattern,
  emoji: string | null,
  kk: string,
  ru: string,
  breakdown: string,
  difficulty = 1,
): WordSeed => ({ text, pattern, emoji, kk, ru, breakdown, difficulty });

export const WORDS: WordSeed[] = [
  // CVC
  w('cat', 'CVC', '🐱', 'мысық', 'кошка', 'c:k a:ae t:t'),
  w('hat', 'CVC', '🎩', 'қалпақ', 'шляпа', 'h:h a:ae t:t'),
  w('bat', 'CVC', '🦇', 'жарқанат', 'летучая мышь', 'b:b a:ae t:t'),
  w('rat', 'CVC', '🐀', 'егеуқұйрық', 'крыса', 'r:r a:ae t:t'),
  w('map', 'CVC', '🗺️', 'карта', 'карта', 'm:m a:ae p:p'),
  w('cap', 'CVC', '🧢', 'кепка', 'кепка', 'c:k a:ae p:p'),
  w('pan', 'CVC', '🍳', 'таба', 'сковорода', 'p:p a:ae n:n'),
  w('fan', 'CVC', '🪭', 'желпуіш', 'веер', 'f:f a:ae n:n'),
  w('van', 'CVC', '🚐', 'фургон', 'фургон', 'v:v a:ae n:n'),
  w('can', 'CVC', '🥫', 'банка', 'банка', 'c:k a:ae n:n'),
  w('bag', 'CVC', '👜', 'сөмке', 'сумка', 'b:b a:ae g:g'),
  w('jam', 'CVC', '🫙', 'тосап', 'варенье', 'j:j a:ae m:m'),
  w('dad', 'CVC', '👨', 'әке', 'папа', 'd:d a:ae d:d'),
  w('yak', 'CVC', '🐃', 'қодас', 'як', 'y:y a:ae k:k'),
  w('pig', 'CVC', '🐷', 'шошқа', 'свинья', 'p:p i:i g:g'),
  w('wig', 'CVC', null, 'парик', 'парик', 'w:w i:i g:g'),
  w('pin', 'CVC', '📌', 'түйреуіш', 'булавка', 'p:p i:i n:n'),
  w('tin', 'CVC', '🥫', 'қаңылтыр банка', 'жестянка', 't:t i:i n:n'),
  w('kid', 'CVC', '🧒', 'бала', 'ребёнок', 'k:k i:i d:d'),
  w('lip', 'CVC', '👄', 'ерін', 'губа', 'l:l i:i p:p'),
  w('zip', 'CVC', '🤐', 'сыдырма', 'молния', 'z:z i:i p:p'),
  w('sit', 'CVC', '🪑', 'отыру', 'сидеть', 's:s i:i t:t'),
  w('bed', 'CVC', '🛏️', 'төсек', 'кровать', 'b:b e:e d:d'),
  w('red', 'CVC', '🔴', 'қызыл', 'красный', 'r:r e:e d:d'),
  w('hen', 'CVC', '🐔', 'тауық', 'курица', 'h:h e:e n:n'),
  w('pen', 'CVC', '🖊️', 'қалам', 'ручка', 'p:p e:e n:n'),
  w('ten', 'CVC', '🔟', 'он', 'десять', 't:t e:e n:n'),
  w('net', 'CVC', '🥅', 'тор', 'сетка', 'n:n e:e t:t'),
  w('jet', 'CVC', '✈️', 'реактивті ұшақ', 'реактивный самолёт', 'j:j e:e t:t'),
  w('vet', 'CVC', '🩺', 'мал дәрігері', 'ветеринар', 'v:v e:e t:t'),
  w('web', 'CVC', '🕸️', 'өрмек', 'паутина', 'w:w e:e b:b'),
  w('wet', 'CVC', '💧', 'дымқыл', 'мокрый', 'w:w e:e t:t'),
  w('leg', 'CVC', '🦵', 'аяқ', 'нога', 'l:l e:e g:g'),
  w('yes', 'CVC', '👍', 'иә', 'да', 'y:y e:e s:s'),
  w('dog', 'CVC', '🐶', 'ит', 'собака', 'd:d o:o g:g'),
  w('log', 'CVC', '🪵', 'бөрене', 'бревно', 'l:l o:o g:g'),
  w('fog', 'CVC', '🌫️', 'тұман', 'туман', 'f:f o:o g:g'),
  w('top', 'CVC', '🔝', 'үсті', 'верх', 't:t o:o p:p'),
  w('hop', 'CVC', '🐇', 'секіру', 'прыгать', 'h:h o:o p:p'),
  w('mop', 'CVC', '🧹', 'шүберек', 'швабра', 'm:m o:o p:p'),
  w('pot', 'CVC', '🍯', 'құмыра', 'горшок', 'p:p o:o t:t'),
  w('sun', 'CVC', '☀️', 'күн', 'солнце', 's:s u:u n:n'),
  w('bus', 'CVC', '🚌', 'автобус', 'автобус', 'b:b u:u s:s'),
  w('cup', 'CVC', '☕', 'кесе', 'чашка', 'c:k u:u p:p'),
  w('nut', 'CVC', '🥜', 'жаңғақ', 'орех', 'n:n u:u t:t'),
  w('bug', 'CVC', '🐛', 'қоңыз', 'жук', 'b:b u:u g:g'),
  w('hug', 'CVC', '🤗', 'құшақтау', 'обнимать', 'h:h u:u g:g'),
  w('jug', 'CVC', '🏺', 'құмыра', 'кувшин', 'j:j u:u g:g'),
  w('mum', 'CVC', '👩', 'ана', 'мама', 'm:m u:u m:m'),
  w('run', 'CVC', '🏃', 'жүгіру', 'бегать', 'r:r u:u n:n'),
  w('duck', 'CVC', '🦆', 'үйрек', 'утка', 'd:d u:u ck:k'),
  w('egg', 'OTHER', '🥚', 'жұмыртқа', 'яйцо', 'e:e gg:g'),
  w('doll', 'CVC', '🪆', 'қуыршақ', 'кукла', 'd:d o:o ll:l'),
  w('yell', 'CVC', '📣', 'айқайлау', 'кричать', 'y:y e:e ll:l'),
  w('buzz', 'CVC', '🐝', 'ызың', 'жужжать', 'b:b u:u zz:z'),
  w('apple', 'OTHER', '🍎', 'алма', 'яблоко', 'a:ae pp:p le:l', 2),
  w('insect', 'OTHER', '🐞', 'жәндік', 'насекомое', 'i:i n:n s:s e:e c:k t:t', 2),
  w('octopus', 'OTHER', '🐙', 'сегізаяқ', 'осьминог', 'o:o c:k t:t o:schwa p:p u:schwa s:s', 3),
  w('umbrella', 'OTHER', '☂️', 'қолшатыр', 'зонт', 'u:u m:m b:b r:r e:e ll:l a:schwa', 3),
  w('queen', 'OTHER', '👸', 'ханшайым', 'королева', 'q:k u:w ee:ee n:n', 3),
  // "x" spells two sounds: /k/ + /s/; the second has an empty grapheme.
  w('fox', 'CVC', '🦊', 'түлкі', 'лиса', 'f:f o:o x:k :s'),
  w('box', 'CVC', '📦', 'қорап', 'коробка', 'b:b o:o x:k :s'),
  w('six', 'CVC', '6️⃣', 'алты', 'шесть', 's:s i:i x:k :s'),
  // CCVC / CVCC
  w('frog', 'CCVC', '🐸', 'бақа', 'лягушка', 'f:f r:r o:o g:g', 2),
  w('flag', 'CCVC', '🚩', 'жалау', 'флаг', 'f:f l:l a:ae g:g', 2),
  w('crab', 'CCVC', '🦀', 'шаян', 'краб', 'c:k r:r a:ae b:b', 2),
  w('drum', 'CCVC', '🥁', 'барабан', 'барабан', 'd:d r:r u:u m:m', 2),
  w('clap', 'CCVC', '👏', 'қол шапалақтау', 'хлопать', 'c:k l:l a:ae p:p', 2),
  w('sled', 'CCVC', '🛷', 'шана', 'санки', 's:s l:l e:e d:d', 2),
  w('stop', 'CCVC', '🛑', 'тоқта', 'стоп', 's:s t:t o:o p:p', 2),
  w('slug', 'CCVC', '🐌', 'ұлу', 'слизень', 's:s l:l u:u g:g', 2),
  w('swan', 'CCVC', '🦢', 'аққу', 'лебедь', 's:s w:w a:o n:n', 2),
  w('tent', 'CVCC', '⛺', 'шатыр', 'палатка', 't:t e:e n:n t:t', 2),
  w('lamp', 'CVCC', '🪔', 'шам', 'лампа', 'l:l a:ae m:m p:p', 2),
  w('hand', 'CVCC', '✋', 'қол', 'рука', 'h:h a:ae n:n d:d', 2),
  w('milk', 'CVCC', '🥛', 'сүт', 'молоко', 'm:m i:i l:l k:k', 2),
  w('nest', 'CVCC', '🪺', 'ұя', 'гнездо', 'n:n e:e s:s t:t', 2),
  w('gift', 'CVCC', '🎁', 'сыйлық', 'подарок', 'g:g i:i f:f t:t', 2),
  w('vest', 'CVCC', '🦺', 'жилет', 'жилет', 'v:v e:e s:s t:t', 2),
  w('mask', 'CVCC', '🎭', 'бетперде', 'маска', 'm:m a:ar s:s k:k', 2),
  w('jump', 'CVCC', '🦘', 'секіру', 'прыгать', 'j:j u:u m:m p:p', 2),
  w('ant', 'OTHER', '🐜', 'құмырсқа', 'муравей', 'a:ae n:n t:t', 2),
  // Digraphs and longer vowels
  w('fish', 'DIGRAPH', '🐟', 'балық', 'рыба', 'f:f i:i sh:sh', 2),
  w('ship', 'DIGRAPH', '🚢', 'кеме', 'корабль', 'sh:sh i:i p:p', 2),
  w('shop', 'DIGRAPH', '🏪', 'дүкен', 'магазин', 'sh:sh o:o p:p', 2),
  w('sheep', 'DIGRAPH', '🐑', 'қой', 'овца', 'sh:sh ee:ee p:p', 2),
  w('chip', 'DIGRAPH', '🍟', 'чипс', 'чипс', 'ch:ch i:i p:p', 2),
  w('chin', 'DIGRAPH', null, 'иек', 'подбородок', 'ch:ch i:i n:n', 2),
  w('lunch', 'DIGRAPH', '🍱', 'түскі ас', 'обед', 'l:l u:u n:n ch:ch', 2),
  w('thumb', 'DIGRAPH', '👍', 'бас бармақ', 'большой палец', 'th:th-unvoiced u:u mb:m', 3),
  w('bath', 'DIGRAPH', '🛁', 'ванна', 'ванна', 'b:b a:ar th:th-unvoiced', 3),
  w('moth', 'DIGRAPH', '🦋', 'көбелек', 'моль', 'm:m o:o th:th-unvoiced', 3),
  w('ring', 'DIGRAPH', '💍', 'сақина', 'кольцо', 'r:r i:i ng:ng', 2),
  w('king', 'DIGRAPH', '🤴', 'патша', 'король', 'k:k i:i ng:ng', 2),
  w('swing', 'DIGRAPH', '🛝', 'әткеншек', 'качели', 's:s w:w i:i ng:ng', 3),
  w('rain', 'DIGRAPH', '🌧️', 'жаңбыр', 'дождь', 'r:r ai:ai n:n', 2),
  w('snail', 'DIGRAPH', '🐌', 'ұлу', 'улитка', 's:s n:n ai:ai l:l', 3),
  w('play', 'DIGRAPH', '⚽', 'ойнау', 'играть', 'p:p l:l ay:ai', 2),
  w('boat', 'DIGRAPH', '⛵', 'қайық', 'лодка', 'b:b oa:oa t:t', 2),
  w('goat', 'DIGRAPH', '🐐', 'ешкі', 'коза', 'g:g oa:oa t:t', 2),
  w('snow', 'DIGRAPH', '❄️', 'қар', 'снег', 's:s n:n ow:oa', 2),
  w('pie', 'DIGRAPH', '🥧', 'бәліш', 'пирог', 'p:p ie:ie', 2),
  w('night', 'DIGRAPH', '🌙', 'түн', 'ночь', 'n:n igh:ie t:t', 3),
  w('light', 'DIGRAPH', '💡', 'жарық', 'свет', 'l:l igh:ie t:t', 3),
  w('tree', 'DIGRAPH', '🌳', 'ағаш', 'дерево', 't:t r:r ee:ee', 2),
  w('bee', 'DIGRAPH', '🐝', 'ара', 'пчела', 'b:b ee:ee', 2),
  w('see', 'DIGRAPH', '👀', 'көру', 'видеть', 's:s ee:ee', 2),
  w('fork', 'DIGRAPH', '🍴', 'шанышқы', 'вилка', 'f:f or:or k:k', 2),
  w('horse', 'DIGRAPH', '🐴', 'жылқы', 'лошадь', 'h:h or:or se:s', 3),
  w('corn', 'DIGRAPH', '🌽', 'жүгері', 'кукуруза', 'c:k or:or n:n', 2),
  w('zoo', 'DIGRAPH', '🦁', 'хайуанаттар бағы', 'зоопарк', 'z:z oo:oo-long', 2),
  w('moon', 'DIGRAPH', '🌕', 'ай', 'луна', 'm:m oo:oo-long n:n', 2),
  w('spoon', 'DIGRAPH', '🥄', 'қасық', 'ложка', 's:s p:p oo:oo-long n:n', 3),
  w('book', 'DIGRAPH', '📖', 'кітап', 'книга', 'b:b oo:oo-short k:k', 2),
  w('look', 'DIGRAPH', '👀', 'қарау', 'смотреть', 'l:l oo:oo-short k:k', 2),
  w('foot', 'DIGRAPH', '🦶', 'табан', 'ступня', 'f:f oo:oo-short t:t', 2),
  w('this', 'DIGRAPH', '👉', 'бұл', 'это', 'th:th-voiced i:i s:s', 3),
  w('that', 'DIGRAPH', '👈', 'ана', 'то', 'th:th-voiced a:ae t:t', 3),
  w('then', 'DIGRAPH', '⏭️', 'содан кейін', 'потом', 'th:th-voiced e:e n:n', 3),
  w('cow', 'DIGRAPH', '🐄', 'сиыр', 'корова', 'c:k ow:ow', 2),
  w('owl', 'DIGRAPH', '🦉', 'үкі', 'сова', 'ow:ow l:l', 2),
  w('house', 'DIGRAPH', '🏠', 'үй', 'дом', 'h:h ou:ow se:s', 3),
  w('coin', 'DIGRAPH', '🪙', 'тиын', 'монета', 'c:k oi:oi n:n', 2),
  w('boy', 'DIGRAPH', '👦', 'ұл бала', 'мальчик', 'b:b oy:oi', 2),
  w('toy', 'DIGRAPH', '🧸', 'ойыншық', 'игрушка', 't:t oy:oi', 2),
  w('bird', 'DIGRAPH', '🐦', 'құс', 'птица', 'b:b ir:er d:d', 3),
  w('girl', 'DIGRAPH', '👧', 'қыз бала', 'девочка', 'g:g ir:er l:l', 3),
  w('nurse', 'DIGRAPH', '👩‍⚕️', 'медбике', 'медсестра', 'n:n ur:er se:s', 3),
  w('car', 'DIGRAPH', '🚗', 'көлік', 'машина', 'c:k ar:ar', 2),
  w('star', 'DIGRAPH', '⭐', 'жұлдыз', 'звезда', 's:s t:t ar:ar', 2),
  w('park', 'DIGRAPH', '🏞️', 'саябақ', 'парк', 'p:p ar:ar k:k', 2),
  w('banana', 'OTHER', '🍌', 'банан', 'банан', 'b:b a:schwa n:n a:ar n:n a:schwa', 3),
  w('sofa', 'OTHER', '🛋️', 'диван', 'диван', 's:s o:oa f:f a:schwa', 3),
  w('teacher', 'OTHER', '🧑‍🏫', 'мұғалім', 'учитель', 't:t ea:ee ch:ch er:schwa', 3),
  w('ear', 'DIGRAPH', '👂', 'құлақ', 'ухо', 'ear:ear', 3),
  w('deer', 'DIGRAPH', '🦌', 'бұғы', 'олень', 'd:d eer:ear', 3),
  w('beard', 'DIGRAPH', '🧔', 'сақал', 'борода', 'b:b ear:ear d:d', 3),
  w('chair', 'DIGRAPH', '🪑', 'орындық', 'стул', 'ch:ch air:air', 3),
  w('hair', 'DIGRAPH', '💇', 'шаш', 'волосы', 'h:h air:air', 3),
  w('pear', 'DIGRAPH', '🍐', 'алмұрт', 'груша', 'p:p ear:air', 3),
  w('tour', 'DIGRAPH', '🧳', 'саяхат', 'тур', 't:t our:ure', 3),
  w('poor', 'DIGRAPH', null, 'кедей', 'бедный', 'p:p oor:ure', 3),
  w('treasure', 'OTHER', '💎', 'қазына', 'сокровище', 't:t r:r ea:e s:zh ure:schwa', 3),
  w('television', 'OTHER', '📺', 'теледидар', 'телевизор', 't:t e:e l:l e:i v:v i:i si:zh o:schwa n:n', 3),
  w('measure', 'OTHER', '📏', 'өлшеу', 'измерять', 'm:m ea:e s:zh ure:schwa', 3),
  // Sight words
  ...[
    ['the', 'артикль', 'артикль'],
    ['a', 'бір (артикль)', 'артикль'],
    ['i', 'мен', 'я'],
    ['to', '-ға/-ге', 'к'],
    ['is', 'болып табылады', 'есть'],
    ['and', 'және', 'и'],
    ['he', 'ол (ер)', 'он'],
    ['she', 'ол (әйел)', 'она'],
    ['we', 'біз', 'мы'],
    ['my', 'менің', 'мой'],
    ['you', 'сен', 'ты'],
    ['said', 'айтты', 'сказал'],
    ['was', 'болды', 'был'],
    ['of', 'туралы', 'из'],
    ['are', 'болып табылады', 'есть'],
    ['go', 'бару', 'идти'],
    ['no', 'жоқ', 'нет'],
    ['me', 'мені', 'меня'],
    ['they', 'олар', 'они'],
    ['here', 'мұнда', 'здесь'],
    ['come', 'келу', 'приходить'],
    ['like', 'ұнату', 'нравиться'],
    ['on', 'үстінде', 'на'],
    ['in', 'ішінде', 'в'],
    ['can', 'алады', 'может'],
  ]
    .filter(([text]) => text !== 'can')
    .map(([text, kk, ru]) => w(text as string, 'SIGHT', null, kk as string, ru as string, '', 1)),
];

export const SIGHT_WORDS = WORDS.filter((x) => x.pattern === 'SIGHT').map((x) => x.text);

export interface SentenceSeed {
  text: string;
  kk: string;
  ru: string;
  difficulty: number;
  /** Picture word the sentence is about (used by read_sentence). */
  key: string;
}

export const SENTENCES: SentenceSeed[] = [
  { text: 'I see a red bus.', kk: 'Мен қызыл автобусты көріп тұрмын.', ru: 'Я вижу красный автобус.', difficulty: 1, key: 'bus' },
  { text: 'The dog is in the bed.', kk: 'Ит төсекте жатыр.', ru: 'Собака в кровати.', difficulty: 1, key: 'dog' },
  { text: 'The duck is wet.', kk: 'Үйрек су болып қалды.', ru: 'Утка мокрая.', difficulty: 1, key: 'duck' },
  { text: 'I like my hat.', kk: 'Маған қалпағым ұнайды.', ru: 'Мне нравится моя шляпа.', difficulty: 1, key: 'hat' },
  { text: 'The frog can hop.', kk: 'Бақа секіре алады.', ru: 'Лягушка умеет прыгать.', difficulty: 2, key: 'frog' },
  { text: 'We sit in the sun.', kk: 'Біз күнде отырмыз.', ru: 'Мы сидим на солнце.', difficulty: 2, key: 'sun' },
  { text: 'Look at the moon.', kk: 'Айға қара.', ru: 'Посмотри на луну.', difficulty: 2, key: 'moon' },
  { text: 'The bird is in the tree.', kk: 'Құс ағашта отыр.', ru: 'Птица на дереве.', difficulty: 2, key: 'bird' },
  { text: 'She has a fish and a cat.', kk: 'Оның балығы мен мысығы бар.', ru: 'У неё есть рыбка и кошка.', difficulty: 3, key: 'fish' },
  { text: 'The ship is on the sea.', kk: 'Кеме теңізде жүр.', ru: 'Корабль в море.', difficulty: 3, key: 'ship' },
];

/** Splits a sentence into lower-case word tokens. */
export function sentenceTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z' ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
