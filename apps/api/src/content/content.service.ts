import { Inject, Injectable } from '@nestjs/common';
import {
  createContentIndex,
  createDefaultRegistry,
  type ContentIndex,
  type ExerciseRegistry,
  type LocalizedText,
} from '@engame/phonics-engine';
import type Redis from 'ioredis';
import { PrismaService, REDIS } from '../infra/infra.module';
import { MediaService } from '../media/media.module';

const VERSION_KEY = 'content:version';

export type ContentIds = Record<'PHONEME' | 'WORD' | 'LETTER', Map<string, string>>;

/**
 * Published content as an in-memory index for the engines. Reloaded when the CMS bumps the version in Redis,
 * so every API instance picks up edits without a redeploy.
 */
@Injectable()
export class ContentService {
  readonly registry: ExerciseRegistry = createDefaultRegistry();
  private cache?: { version: string; index: ContentIndex };
  private idCache?: { version: string; ids: ContentIds };
  private loading?: Promise<{ version: string; index: ContentIndex }>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async version(): Promise<string> {
    return (await this.redis.get(VERSION_KEY)) ?? '0';
  }

  /** Call after any CMS write that affects learners. */
  async bump(): Promise<void> {
    await this.redis.incr(VERSION_KEY);
  }

  async index(): Promise<ContentIndex> {
    const version = await this.version();
    if (this.cache?.version === version) return this.cache.index;
    this.loading ??= this.load(false).then((index) => ({ version, index }));
    try {
      this.cache = await this.loading;
    } finally {
      this.loading = undefined;
    }
    return this.cache.index;
  }

  /** Database ids for content keys (phoneme slug, word text, letter char), for mastery rows. */
  async ids(): Promise<ContentIds> {
    const version = await this.version();
    if (this.idCache?.version === version) return this.idCache.ids;
    const [phonemes, words, letters] = await Promise.all([
      this.prisma.phoneme.findMany({ select: { id: true, slug: true } }),
      this.prisma.word.findMany({ select: { id: true, text: true } }),
      this.prisma.letter.findMany({ select: { id: true, char: true } }),
    ]);
    const ids: ContentIds = {
      PHONEME: new Map(phonemes.map((p) => [p.slug, p.id])),
      WORD: new Map(words.map((w) => [w.text, w.id])),
      LETTER: new Map(letters.map((l) => [l.char, l.id])),
    };
    this.idCache = { version, ids };
    return ids;
  }

  /** Includes drafts; used by the CMS to validate and preview before publishing. */
  indexWithDrafts(): Promise<ContentIndex> {
    return this.load(true);
  }

  private async load(includeDrafts: boolean): Promise<ContentIndex> {
    const where = includeDrafts ? { status: { not: 'ARCHIVED' as const } } : { status: 'PUBLISHED' as const };
    const [phonemes, words, letters, sentences] = await Promise.all([
      this.prisma.phoneme.findMany({
        where,
        orderBy: { order: 'asc' },
        include: { graphemes: true, audio: true, mouthImage: true },
      }),
      this.prisma.word.findMany({
        where,
        orderBy: { text: 'asc' },
        include: {
          phonemes: { orderBy: { position: 'asc' }, include: { phoneme: true } },
          audio: true,
          image: true,
        },
      }),
      this.prisma.letter.findMany({
        where,
        orderBy: { order: 'asc' },
        include: { audio: true, exampleWord: true },
      }),
      this.prisma.sentence.findMany({
        where,
        include: { audio: true, words: { orderBy: { position: 'asc' }, include: { word: true } } },
      }),
    ]);
    return createContentIndex({
      phonemes: phonemes.map((p) => ({
        slug: p.slug,
        symbol: p.symbol,
        ipa: p.ipa,
        category: p.category,
        voiced: p.voiced,
        graphemes: [...p.graphemes]
          .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
          .map((g) => g.grapheme),
        audioUrl: this.media.url(p.audio?.storageKey),
        mouthPosition: p.mouthPosition as LocalizedText,
        mouthImageUrl: this.media.url(p.mouthImage?.storageKey),
        tip: (p.tip as LocalizedText | null) ?? null,
      })),
      words: words.map((w) => ({
        text: w.text,
        pattern: w.pattern,
        emoji: w.emoji,
        imageUrl: this.media.url(w.image?.storageKey),
        audioUrl: this.media.url(w.audio?.storageKey),
        isSightWord: w.isSightWord,
        difficulty: w.difficulty,
        translation: w.translation as LocalizedText,
        sounds: w.phonemes.map((wp) => ({ phoneme: wp.phoneme.slug, grapheme: wp.grapheme })),
      })),
      letters: letters.map((l) => ({
        char: l.char,
        name: l.name,
        isVowel: l.isVowel,
        audioUrl: this.media.url(l.audio?.storageKey),
        exampleWord: l.exampleWord?.text ?? null,
      })),
      sentences: sentences.map((s) => ({
        id: s.id,
        text: s.text,
        audioUrl: this.media.url(s.audio?.storageKey),
        translation: s.translation as LocalizedText,
        words: s.words.map((sw) => sw.word.text),
      })),
    });
  }
}
