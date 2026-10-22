'use client';

import type { Media } from './types';

let current: HTMLAudioElement | null = null;

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return voices.find((v) => v.lang === 'en-GB') ?? voices.find((v) => v.lang.startsWith('en'));
}

/** Browser text-to-speech for words and sentences when no recording exists. Not used for isolated sounds. */
function speak(text: string): Promise<boolean> {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth) return Promise.resolve(false);
  return new Promise((resolve) => {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-GB';
    u.rate = 0.8;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    synth.speak(u);
  });
}

function playUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    current?.pause();
    const a = new Audio(url);
    current = a;
    a.onended = () => resolve(true);
    a.onerror = () => resolve(false);
    a.play().catch(() => resolve(false));
  });
}

/** True when the media can be heard: a recording, or text the browser may read aloud. */
export function hasAudio(m: Media | undefined): boolean {
  if (!m) return false;
  return Boolean(m.audioUrl || m.speak || m.sequence?.some(hasAudio));
}

/** Plays a media item; returns false when there is nothing to play. */
export async function playMedia(m: Media | undefined): Promise<boolean> {
  if (!m) return false;
  if (m.sequence?.length) {
    let any = false;
    for (const part of m.sequence) {
      any = (await playMedia(part)) || any;
      await new Promise((r) => setTimeout(r, 250));
    }
    return any;
  }
  if (m.audioUrl && (await playUrl(m.audioUrl))) return true;
  if (m.speak) return speak(m.speak);
  return false;
}

export function stopAudio() {
  current?.pause();
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}
