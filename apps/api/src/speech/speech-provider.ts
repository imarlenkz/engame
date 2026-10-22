import type { Env } from '../config/env';

export interface Transcription {
  text: string;
}

/**
 * Speech-to-text adapter. The app ships one real implementation (OpenAI-compatible Whisper endpoint, which also
 * covers self-hosted faster-whisper servers); with SPEECH_PROVIDER=none pronunciation practice stays listen-only.
 */
export interface SpeechProvider {
  readonly name: string;
  transcribe(
    audio: Buffer,
    mime: string,
    opts: { language: string; prompt?: string },
  ): Promise<Transcription>;
}

export const SPEECH = Symbol('SPEECH_PROVIDER');

export class WhisperProvider implements SpeechProvider {
  readonly name = 'whisper';
  constructor(
    private readonly url: string,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly timeoutMs = 15_000,
  ) {}

  async transcribe(
    audio: Buffer,
    mime: string,
    opts: { language: string; prompt?: string },
  ): Promise<Transcription> {
    const form = new FormData();
    const ext = mime.split('/')[1] ?? 'webm';
    form.append(
      'file',
      new Blob([new Uint8Array(audio)], { type: mime }),
      `speech.${ext === 'mpeg' ? 'mp3' : ext}`,
    );
    form.append('model', this.model);
    form.append('language', opts.language);
    form.append('response_format', 'json');
    form.append('temperature', '0');
    if (opts.prompt) form.append('prompt', opts.prompt);
    const res = await fetch(`${this.url.replace(/\/$/, '')}/audio/transcriptions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new Error(`Speech provider responded ${res.status}`);
    const body = (await res.json()) as { text?: unknown };
    return { text: typeof body.text === 'string' ? body.text : '' };
  }
}

export function createSpeechProvider(env: Env): SpeechProvider | null {
  if (env.SPEECH_PROVIDER === 'whisper' && env.SPEECH_API_URL && env.SPEECH_API_KEY) {
    return new WhisperProvider(env.SPEECH_API_URL, env.SPEECH_API_KEY, env.SPEECH_MODEL);
  }
  return null;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

/**
 * Approximate pronunciation score (0–100) from a transcript. It measures whether the recogniser heard the target
 * word(s), not phoneme-level accuracy, and the UI labels it as approximate.
 */
export function transcriptScore(target: string, transcript: string): number {
  const t = normalize(target);
  const heard = normalize(transcript);
  if (!t || !heard) return 0;
  const targetWords = t.split(' ');
  const heardWords = heard.split(' ');
  if (targetWords.length === 1) {
    // Best match among heard words: recognisers often add filler ("the cat", "cat.").
    const best = Math.min(...heardWords.map((w) => levenshtein(t, w)));
    return Math.round(Math.max(0, 1 - best / Math.max(t.length, 1)) * 100);
  }
  const dist = levenshtein(t, heard);
  return Math.round(Math.max(0, 1 - dist / Math.max(t.length, heard.length)) * 100);
}
