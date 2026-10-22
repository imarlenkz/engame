/** English alphabet with British letter names and an example word from words.ts. */
export interface LetterSeed {
  char: string;
  name: string;
  isVowel: boolean;
  example: string;
}

const NAMES: [string, string, string][] = [
  ['A', 'ay', 'apple'], ['B', 'bee', 'bat'], ['C', 'see', 'cat'], ['D', 'dee', 'dog'], ['E', 'ee', 'egg'],
  ['F', 'ef', 'fish'], ['G', 'jee', 'goat'], ['H', 'aitch', 'hat'], ['I', 'eye', 'insect'], ['J', 'jay', 'jam'],
  ['K', 'kay', 'king'], ['L', 'el', 'lamp'], ['M', 'em', 'moon'], ['N', 'en', 'net'], ['O', 'oh', 'octopus'],
  ['P', 'pee', 'pig'], ['Q', 'cue', 'queen'], ['R', 'ar', 'rain'], ['S', 'ess', 'sun'], ['T', 'tee', 'tree'],
  ['U', 'you', 'umbrella'], ['V', 'vee', 'van'], ['W', 'double-you', 'web'], ['X', 'ex', 'fox'], ['Y', 'why', 'yak'],
  ['Z', 'zed', 'zip'],
];

export const LETTERS: LetterSeed[] = NAMES.map(([char, name, example]) => ({
  char,
  name,
  isVowel: 'AEIOU'.includes(char),
  example,
}));
