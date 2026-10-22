import type { LetterRef, PhonemeRef, SentenceRef, WordRef } from './content';
import type { Media } from './types';

export function phonemeMedia(p: PhonemeRef, opts: { showText?: boolean } = {}): Media {
  return {
    text: opts.showText === false ? undefined : p.symbol,
    ipa: `/${p.ipa}/`,
    audioUrl: p.audioUrl,
  };
}

/** A sound heard but not spelled (the spelling would give the answer away). IPA is the fallback when no clip exists. */
export function phonemeAudioOnly(p: PhonemeRef): Media {
  return { audioUrl: p.audioUrl, ipa: `/${p.ipa}/` };
}

export function wordMedia(w: WordRef, opts: { showText?: boolean; showPicture?: boolean } = {}): Media {
  return {
    text: opts.showText === false ? undefined : w.text,
    emoji: opts.showPicture === false ? undefined : w.emoji,
    imageUrl: opts.showPicture === false ? undefined : w.imageUrl,
    audioUrl: w.audioUrl,
    speak: w.text,
  };
}

/** Picture of a word with its sound, but without the spelling. */
export function wordPicture(w: WordRef): Media {
  return { emoji: w.emoji, imageUrl: w.imageUrl, audioUrl: w.audioUrl, speak: w.text };
}

/** The word only as sound. */
export function wordAudioOnly(w: WordRef): Media {
  return { audioUrl: w.audioUrl, speak: w.text };
}

export function letterMedia(l: LetterRef): Media {
  return { text: `${l.char}${l.char.toLowerCase()}`, audioUrl: l.audioUrl, speak: l.char, caption: { en: l.name } };
}

export function sentenceMedia(s: SentenceRef, opts: { showText?: boolean } = {}): Media {
  return {
    text: opts.showText === false ? undefined : s.text,
    audioUrl: s.audioUrl,
    speak: s.text,
    caption: s.translation,
  };
}
