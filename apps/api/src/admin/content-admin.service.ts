import { Injectable } from '@nestjs/common';
import type { Prisma, PublishStatus } from '@engame/database';
import { parseAchievementRule, parseMissionRule, planGame } from '@engame/game-engine';
import { createRng, toClientItem, type ContentIndex } from '@engame/phonics-engine';
import { randomUUID } from 'node:crypto';
import { ZodError, type z } from 'zod';
import { AnalyticsService } from '../analytics/analytics.service';
import { AuditService } from '../common/audit';
import { Errors } from '../common/errors';
import { ContentService } from '../content/content.service';
import { PrismaService } from '../infra/infra.module';
import type * as S from './schemas';

export interface Problem {
  where: string;
  code: string;
  message: string;
}

const json = (v: unknown) => v as Prisma.InputJsonValue;
const skip = <T>(v: T | undefined) => (v === undefined ? undefined : v);

/**
 * CMS writes. Every change that learners can see bumps the content version (all API instances reload),
 * publishing is validated against published content, and everything is written to the audit log.
 */
@Injectable()
export class ContentAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  private async changed(
    actorId: string,
    action: string,
    entity: string,
    entityId: string,
    meta: Record<string, unknown> = {},
  ) {
    await this.content.bump();
    await this.audit.log(actorId, action, entity, entityId, meta);
    if (meta.status === 'PUBLISHED')
      await this.analytics.track('content_published', { userId: actorId }, { entity });
  }

  private fail(problems: Problem[]) {
    if (problems.length)
      throw Errors.badRequest('CONTENT_INVALID', 'Fix these problems before publishing', problems);
  }

  // ───────────── Validation ─────────────

  /** Checks one exercise against an index: known type, valid config, references exist, and it builds. */
  checkExercise(
    e: { id: string; order: number; type: string; config: unknown },
    index: ContentIndex,
  ): Problem[] {
    const where = `exercise #${e.order + 1} (${e.type})`;
    const reg = this.content.registry;
    if (!reg.has(e.type))
      return [{ where, code: 'UNKNOWN_TYPE', message: `Unknown exercise type ${e.type}` }];
    try {
      reg.parseConfig(e.type, e.config);
    } catch (err) {
      const issues =
        err instanceof ZodError
          ? err.issues.map((i) => `${i.path.join('.') || 'config'}: ${i.message}`)
          : [String(err)];
      return issues.map((message) => ({ where, code: 'BAD_CONFIG', message }));
    }
    const missing = reg.missingReferences(e.type, e.config, index);
    if (missing.length)
      return missing.map((m) => ({ where, code: 'MISSING_CONTENT', message: `${m} is not published` }));
    try {
      const items = reg.build(e, index, 'cms-check');
      if (items.length === 0)
        return [{ where, code: 'EMPTY', message: 'Builds no items with the published content' }];
    } catch (err) {
      return [{ where, code: 'BUILD_FAILED', message: err instanceof Error ? err.message : String(err) }];
    }
    return [];
  }

  async validateLesson(lessonId: string): Promise<Problem[]> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        exercises: { orderBy: { order: 'asc' } },
        focusPhoneme: true,
        focusLetter: true,
        level: { include: { world: true } },
      },
    });
    if (!lesson) throw Errors.notFound('Lesson');
    const index = await this.content.index();
    const problems: Problem[] = [];
    if (lesson.exercises.length === 0)
      problems.push({ where: 'lesson', code: 'NO_EXERCISES', message: 'Add at least one exercise' });
    if (lesson.focusPhoneme && lesson.focusPhoneme.status !== 'PUBLISHED') {
      problems.push({
        where: 'lesson',
        code: 'MISSING_CONTENT',
        message: `Focus sound ${lesson.focusPhoneme.slug} is not published`,
      });
    }
    if (lesson.focusLetter && lesson.focusLetter.status !== 'PUBLISHED') {
      problems.push({
        where: 'lesson',
        code: 'MISSING_CONTENT',
        message: `Focus letter ${lesson.focusLetter.char} is not published`,
      });
    }
    for (const e of lesson.exercises) problems.push(...this.checkExercise(e, index));
    return problems;
  }

  /** Published lessons and games that use a content item; it cannot be unpublished while they exist. */
  async dependents(ref: {
    phoneme?: string;
    word?: string;
    letter?: string;
    sentence?: string;
  }): Promise<Problem[]> {
    const reg = this.content.registry;
    const exercises = await this.prisma.exercise.findMany({
      where: { lesson: { status: 'PUBLISHED' } },
      select: { type: true, config: true, lesson: { select: { slug: true } } },
    });
    const hits = new Set<string>();
    for (const e of exercises) {
      if (!reg.has(e.type)) continue;
      let refs: ReturnType<ReturnType<typeof reg.get>['references']>;
      try {
        refs = reg.get(e.type).references(reg.parseConfig(e.type, e.config));
      } catch {
        continue;
      }
      if (
        (ref.phoneme && refs.phonemes?.includes(ref.phoneme)) ||
        (ref.word && refs.words?.includes(ref.word)) ||
        (ref.letter && refs.letters?.some((l) => l.toUpperCase() === ref.letter)) ||
        (ref.sentence && refs.sentences?.includes(ref.sentence))
      ) {
        hits.add(e.lesson.slug);
      }
    }
    if (ref.word) {
      const words = await this.prisma.sentenceWord.findMany({
        where: { word: { text: ref.word }, sentence: { status: 'PUBLISHED' } },
        select: { sentence: { select: { text: true } } },
      });
      for (const w of words) hits.add(`sentence "${w.sentence.text}"`);
    }
    if (ref.phoneme) {
      const words = await this.prisma.wordPhoneme.findMany({
        where: { phoneme: { slug: ref.phoneme }, word: { status: 'PUBLISHED' } },
        select: { word: { select: { text: true } } },
        take: 20,
      });
      for (const w of words) hits.add(`word "${w.word.text}"`);
    }
    return [...hits].map((h) => ({
      where: h,
      code: 'IN_USE',
      message: `Used by published ${h.startsWith('word') || h.startsWith('sentence') ? '' : 'lesson '}${h}`,
    }));
  }

  private async guardStatus(
    from: PublishStatus,
    to: PublishStatus | undefined,
    ref: Parameters<ContentAdminService['dependents']>[0],
  ) {
    if (from === 'PUBLISHED' && to && to !== 'PUBLISHED') this.fail(await this.dependents(ref));
  }

  // ───────────── Phonemes & letters ─────────────

  listPhonemes() {
    return this.prisma.phoneme.findMany({
      orderBy: { order: 'asc' },
      include: { graphemes: true, audio: true, mouthImage: true, _count: { select: { wordPhonemes: true } } },
    });
  }

  async updatePhoneme(actorId: string, id: string, body: z.infer<typeof S.PhonemeUpdate>) {
    const p = await this.prisma.phoneme.findUnique({ where: { id } });
    if (!p) throw Errors.notFound('Phoneme');
    await this.guardStatus(p.status, body.status, { phoneme: p.slug });
    const updated = await this.prisma.$transaction(async (tx) => {
      if (body.graphemes) {
        await tx.phonemeGrapheme.deleteMany({ where: { phonemeId: id } });
        const primary = body.graphemes.findIndex((g) => g.isPrimary);
        await tx.phonemeGrapheme.createMany({
          data: body.graphemes.map((g, i) => ({
            phonemeId: id,
            grapheme: g.grapheme,
            isPrimary: i === (primary < 0 ? 0 : primary),
          })),
          skipDuplicates: true,
        });
      }
      return tx.phoneme.update({
        where: { id },
        data: {
          symbol: body.symbol,
          mouthPosition: body.mouthPosition ? json(body.mouthPosition) : undefined,
          tip: body.tip === undefined ? undefined : body.tip === null ? json(null) : json(body.tip),
          difficulty: body.difficulty,
          audioId: skip(body.audioId),
          mouthImageId: skip(body.mouthImageId),
          status: body.status,
        },
        include: { graphemes: true },
      });
    });
    await this.changed(actorId, 'phoneme.update', 'phoneme', id, { status: body.status });
    return updated;
  }

  listLetters() {
    return this.prisma.letter.findMany({
      orderBy: { order: 'asc' },
      include: { audio: true, image: true, exampleWord: { select: { id: true, text: true } } },
    });
  }

  async updateLetter(actorId: string, id: string, body: z.infer<typeof S.LetterUpdate>) {
    const l = await this.prisma.letter.findUnique({ where: { id } });
    if (!l) throw Errors.notFound('Letter');
    await this.guardStatus(l.status, body.status, { letter: l.char });
    const updated = await this.prisma.letter.update({ where: { id }, data: body });
    await this.changed(actorId, 'letter.update', 'letter', id, { status: body.status });
    return updated;
  }

  // ───────────── Words & sentences ─────────────

  async listWords(q: z.infer<typeof S.WordQuery>) {
    const where: Prisma.WordWhereInput = {
      status: q.status,
      pattern: q.pattern,
      ...(q.q ? { text: { contains: q.q.toLowerCase() } } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.word.count({ where }),
      this.prisma.word.findMany({
        where,
        orderBy: { text: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          phonemes: {
            orderBy: { position: 'asc' },
            include: { phoneme: { select: { slug: true, symbol: true } } },
          },
          audio: true,
          image: true,
        },
      }),
    ]);
    return { total, page: q.page, pageSize: q.pageSize, items };
  }

  private async resolveBreakdown(
    text: string,
    pattern: string,
    breakdown: { phoneme: string; grapheme: string }[],
    status: PublishStatus,
  ) {
    const problems: Problem[] = [];
    if (breakdown.length === 0 && pattern !== 'SIGHT')
      problems.push({ where: 'breakdown', code: 'REQUIRED', message: 'Add the sounds of the word' });
    if (breakdown.length && breakdown.map((b) => b.grapheme).join('') !== text) {
      problems.push({
        where: 'breakdown',
        code: 'SPELLING',
        message: `Letters spell "${breakdown.map((b) => b.grapheme).join('')}", not "${text}"`,
      });
    }
    const phonemes = await this.prisma.phoneme.findMany({
      where: { slug: { in: breakdown.map((b) => b.phoneme) } },
    });
    const bySlug = new Map(phonemes.map((p) => [p.slug, p]));
    for (const b of breakdown) {
      const p = bySlug.get(b.phoneme);
      if (!p)
        problems.push({ where: 'breakdown', code: 'UNKNOWN_SOUND', message: `Unknown sound ${b.phoneme}` });
      else if (status === 'PUBLISHED' && p.status !== 'PUBLISHED') {
        problems.push({
          where: 'breakdown',
          code: 'MISSING_CONTENT',
          message: `Sound ${b.phoneme} is not published`,
        });
      }
    }
    this.fail(problems);
    return breakdown.map((b, position) => ({
      position,
      grapheme: b.grapheme,
      phonemeId: bySlug.get(b.phoneme)!.id,
    }));
  }

  async createWord(actorId: string, body: z.infer<typeof S.WordCreate>) {
    if (await this.prisma.word.findUnique({ where: { text: body.text } }))
      throw Errors.conflict('WORD_EXISTS', 'This word already exists');
    const phonemes = await this.resolveBreakdown(body.text, body.pattern, body.breakdown, body.status);
    const w = await this.prisma.word.create({
      data: {
        text: body.text,
        pattern: body.pattern,
        emoji: body.emoji ?? null,
        translation: json({ en: body.text, ...body.translation }),
        difficulty: body.difficulty,
        isSightWord: body.isSightWord || body.pattern === 'SIGHT',
        audioId: body.audioId ?? null,
        imageId: body.imageId ?? null,
        status: body.status,
        phonemes: { create: phonemes },
      },
    });
    await this.changed(actorId, 'word.create', 'word', w.id, { status: body.status });
    return w;
  }

  async updateWord(actorId: string, id: string, body: z.infer<typeof S.WordUpdate>) {
    const w = await this.prisma.word.findUnique({
      where: { id },
      include: { phonemes: { include: { phoneme: true }, orderBy: { position: 'asc' } } },
    });
    if (!w) throw Errors.notFound('Word');
    await this.guardStatus(w.status, body.status, { word: w.text });
    const status = body.status ?? w.status;
    const breakdown =
      body.breakdown ?? w.phonemes.map((p) => ({ phoneme: p.phoneme.slug, grapheme: p.grapheme }));
    const phonemes = await this.resolveBreakdown(w.text, body.pattern ?? w.pattern, breakdown, status);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (body.breakdown) {
        await tx.wordPhoneme.deleteMany({ where: { wordId: id } });
        await tx.wordPhoneme.createMany({ data: phonemes.map((p) => ({ ...p, wordId: id })) });
      }
      return tx.word.update({
        where: { id },
        data: {
          pattern: body.pattern,
          emoji: skip(body.emoji),
          translation: body.translation ? json({ en: w.text, ...body.translation }) : undefined,
          difficulty: body.difficulty,
          isSightWord: body.isSightWord,
          audioId: skip(body.audioId),
          imageId: skip(body.imageId),
          status: body.status,
        },
      });
    });
    await this.changed(actorId, 'word.update', 'word', id, { status: body.status });
    return updated;
  }

  async deleteWord(actorId: string, id: string) {
    const w = await this.prisma.word.findUnique({ where: { id } });
    if (!w) throw Errors.notFound('Word');
    if (w.status === 'PUBLISHED')
      throw Errors.badRequest('ARCHIVE_FIRST', 'Unpublish the word before deleting it');
    const inSentences = await this.prisma.sentenceWord.count({ where: { wordId: id } });
    if (inSentences) throw Errors.badRequest('IN_USE', 'The word is used in sentences');
    await this.prisma.word.delete({ where: { id } });
    await this.changed(actorId, 'word.delete', 'word', id);
    return { ok: true };
  }

  listSentences() {
    return this.prisma.sentence.findMany({
      orderBy: [{ difficulty: 'asc' }, { createdAt: 'asc' }],
      include: { audio: true, image: true },
    });
  }

  private async sentenceWords(text: string, status: PublishStatus) {
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z' ]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const words = await this.prisma.word.findMany({ where: { text: { in: tokens } } });
    const byText = new Map(words.map((w) => [w.text, w]));
    const problems: Problem[] = [];
    for (const t of new Set(tokens)) {
      const w = byText.get(t);
      if (!w) problems.push({ where: 'text', code: 'UNKNOWN_WORD', message: `Add the word "${t}" first` });
      else if (status === 'PUBLISHED' && w.status !== 'PUBLISHED')
        problems.push({ where: 'text', code: 'MISSING_CONTENT', message: `"${t}" is not published` });
    }
    this.fail(problems);
    return tokens.map((t, position) => ({ position, wordId: byText.get(t)!.id }));
  }

  async createSentence(actorId: string, body: z.infer<typeof S.SentenceCreate>) {
    const words = await this.sentenceWords(body.text, body.status);
    const s = await this.prisma.sentence.create({
      data: {
        text: body.text,
        translation: json({ en: body.text, ...body.translation }),
        difficulty: body.difficulty,
        audioId: body.audioId ?? null,
        imageId: body.imageId ?? null,
        status: body.status,
        words: { create: words },
      },
    });
    await this.changed(actorId, 'sentence.create', 'sentence', s.id, { status: body.status });
    return s;
  }

  async updateSentence(actorId: string, id: string, body: z.infer<typeof S.SentenceUpdate>) {
    const s = await this.prisma.sentence.findUnique({ where: { id } });
    if (!s) throw Errors.notFound('Sentence');
    await this.guardStatus(s.status, body.status, { sentence: s.text });
    const text = body.text ?? s.text;
    if (body.text && body.text !== s.text && s.status === 'PUBLISHED') {
      // Lessons reference sentences by text.
      this.fail(await this.dependents({ sentence: s.text }));
    }
    const words = await this.sentenceWords(text, body.status ?? s.status);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.sentenceWord.deleteMany({ where: { sentenceId: id } });
      await tx.sentenceWord.createMany({ data: words.map((w) => ({ ...w, sentenceId: id })) });
      return tx.sentence.update({
        where: { id },
        data: {
          text: body.text,
          translation: body.translation ? json({ en: text, ...body.translation }) : undefined,
          difficulty: body.difficulty,
          audioId: skip(body.audioId),
          imageId: skip(body.imageId),
          status: body.status,
        },
      });
    });
    await this.changed(actorId, 'sentence.update', 'sentence', id, { status: body.status });
    return updated;
  }

  async deleteSentence(actorId: string, id: string) {
    const s = await this.prisma.sentence.findUnique({ where: { id } });
    if (!s) throw Errors.notFound('Sentence');
    if (s.status === 'PUBLISHED')
      throw Errors.badRequest('ARCHIVE_FIRST', 'Unpublish the sentence before deleting it');
    await this.prisma.sentence.delete({ where: { id } });
    await this.changed(actorId, 'sentence.delete', 'sentence', id);
    return { ok: true };
  }

  // ───────────── Curriculum ─────────────

  tree() {
    return this.prisma.world.findMany({
      orderBy: { order: 'asc' },
      include: {
        levels: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                slug: true,
                order: true,
                kind: true,
                title: true,
                status: true,
                _count: { select: { exercises: true } },
              },
            },
          },
        },
      },
    });
  }

  async createWorld(actorId: string, body: z.infer<typeof S.WorldCreate>) {
    if (await this.prisma.world.findUnique({ where: { slug: body.slug } }))
      throw Errors.conflict('SLUG_TAKEN');
    const w = await this.prisma.world.create({ data: { ...body, title: json(body.title) } });
    await this.changed(actorId, 'world.create', 'world', w.id, { status: body.status });
    return w;
  }

  async updateWorld(actorId: string, id: string, body: z.infer<typeof S.WorldUpdate>) {
    if (!(await this.prisma.world.findUnique({ where: { id } }))) throw Errors.notFound('World');
    const w = await this.prisma.world.update({
      where: { id },
      data: { ...body, title: body.title ? json(body.title) : undefined },
    });
    await this.changed(actorId, 'world.update', 'world', id, { status: body.status });
    return w;
  }

  async createLevel(actorId: string, body: z.infer<typeof S.LevelCreate>) {
    if (!(await this.prisma.world.findUnique({ where: { id: body.worldId } })))
      throw Errors.notFound('World');
    if (await this.prisma.level.findUnique({ where: { slug: body.slug } }))
      throw Errors.conflict('SLUG_TAKEN');
    const l = await this.prisma.level.create({ data: { ...body, title: json(body.title) } });
    await this.changed(actorId, 'level.create', 'level', l.id, { status: body.status });
    return l;
  }

  async updateLevel(actorId: string, id: string, body: z.infer<typeof S.LevelUpdate>) {
    if (!(await this.prisma.level.findUnique({ where: { id } }))) throw Errors.notFound('Level');
    const l = await this.prisma.level.update({
      where: { id },
      data: { ...body, title: body.title ? json(body.title) : undefined },
    });
    await this.changed(actorId, 'level.update', 'level', id, { status: body.status });
    return l;
  }

  async lesson(id: string) {
    const l = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        exercises: { orderBy: { order: 'asc' } },
        level: {
          select: {
            id: true,
            slug: true,
            title: true,
            world: { select: { id: true, slug: true, title: true } },
          },
        },
        focusPhoneme: { select: { id: true, slug: true, symbol: true } },
        focusLetter: { select: { id: true, char: true } },
      },
    });
    if (!l) throw Errors.notFound('Lesson');
    return { ...l, problems: await this.validateLesson(id) };
  }

  async createLesson(actorId: string, body: z.infer<typeof S.LessonCreate>) {
    if (!(await this.prisma.level.findUnique({ where: { id: body.levelId } })))
      throw Errors.notFound('Level');
    if (await this.prisma.lesson.findUnique({ where: { slug: body.slug } }))
      throw Errors.conflict('SLUG_TAKEN');
    const l = await this.prisma.lesson.create({
      data: { ...body, title: json(body.title), status: 'DRAFT' },
    });
    await this.audit.log(actorId, 'lesson.create', 'lesson', l.id);
    return l;
  }

  async updateLesson(actorId: string, id: string, body: z.infer<typeof S.LessonUpdate>) {
    const l = await this.prisma.lesson.findUnique({ where: { id } });
    if (!l) throw Errors.notFound('Lesson');
    if (body.status === 'PUBLISHED') this.fail(await this.validateLesson(id));
    const updated = await this.prisma.lesson.update({
      where: { id },
      data: {
        ...body,
        title: body.title ? json(body.title) : undefined,
        publishedAt: body.status === 'PUBLISHED' && l.status !== 'PUBLISHED' ? new Date() : undefined,
      },
    });
    await this.changed(actorId, 'lesson.update', 'lesson', id, { status: body.status });
    return updated;
  }

  /** Builds the lesson as a child would see it (drafts included), with answer keys, for the CMS preview. */
  async preview(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });
    if (!lesson) throw Errors.notFound('Lesson');
    const index = await this.content.indexWithDrafts();
    const seed = randomUUID();
    return {
      steps: lesson.exercises.map((e) => {
        try {
          const items = this.content.registry.build(e, index, seed);
          return {
            exerciseId: e.id,
            stage: e.stage,
            type: e.type,
            items: items.map((i) => ({ ...toClientItem(i), key: i.key })),
            error: null,
          };
        } catch (err) {
          return {
            exerciseId: e.id,
            stage: e.stage,
            type: e.type,
            items: [],
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    };
  }

  private async editableLesson(lessonId: string) {
    const l = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!l) throw Errors.notFound('Lesson');
    return l;
  }

  /** Exercise edits on a published lesson must keep it valid against published content. */
  private async checkPublished(lessonId: string, status: PublishStatus) {
    if (status !== 'PUBLISHED') return;
    this.fail(await this.validateLesson(lessonId));
  }

  async addExercise(actorId: string, lessonId: string, body: z.infer<typeof S.ExerciseCreate>) {
    const lesson = await this.editableLesson(lessonId);
    this.parseConfigOrFail(body.type, body.config);
    const e = await this.prisma.$transaction(async (tx) => {
      const last = await tx.exercise.findFirst({ where: { lessonId }, orderBy: { order: 'desc' } });
      const created = await tx.exercise.create({
        data: {
          lessonId,
          order: (last?.order ?? -1) + 1,
          stage: body.stage,
          type: body.type,
          config: json(body.config),
        },
      });
      return created;
    });
    if (lesson.status === 'PUBLISHED') {
      const problems = this.checkExercise(e, await this.content.index());
      if (problems.length) {
        await this.prisma.exercise.delete({ where: { id: e.id } });
        this.fail(problems);
      }
    }
    await this.changed(actorId, 'exercise.create', 'lesson', lessonId, { exerciseId: e.id });
    return e;
  }

  private parseConfigOrFail(type: string, config: unknown) {
    if (!this.content.registry.has(type))
      this.fail([{ where: 'type', code: 'UNKNOWN_TYPE', message: `Unknown exercise type ${type}` }]);
    try {
      this.content.registry.parseConfig(type, config);
    } catch (err) {
      if (err instanceof ZodError) {
        this.fail(
          err.issues.map((i) => ({
            where: i.path.join('.') || 'config',
            code: 'BAD_CONFIG',
            message: i.message,
          })),
        );
      }
      throw err;
    }
  }

  async updateExercise(actorId: string, id: string, body: z.infer<typeof S.ExerciseUpdate>) {
    const e = await this.prisma.exercise.findUnique({ where: { id }, include: { lesson: true } });
    if (!e) throw Errors.notFound('Exercise');
    const next = {
      ...e,
      stage: body.stage ?? e.stage,
      type: body.type ?? e.type,
      config: body.config ?? e.config,
    };
    this.parseConfigOrFail(next.type, next.config);
    if (e.lesson.status === 'PUBLISHED') this.fail(this.checkExercise(next, await this.content.index()));
    const updated = await this.prisma.exercise.update({
      where: { id },
      data: { stage: body.stage, type: body.type, config: body.config ? json(body.config) : undefined },
    });
    await this.changed(actorId, 'exercise.update', 'lesson', e.lessonId, { exerciseId: id });
    return updated;
  }

  async deleteExercise(actorId: string, id: string) {
    const e = await this.prisma.exercise.findUnique({
      where: { id },
      include: { lesson: { include: { _count: { select: { exercises: true } } } } },
    });
    if (!e) throw Errors.notFound('Exercise');
    if (e.lesson.status === 'PUBLISHED' && e.lesson._count.exercises <= 1) {
      throw Errors.badRequest('LAST_EXERCISE', 'A published lesson needs at least one exercise');
    }
    await this.prisma.exercise.delete({ where: { id } });
    await this.changed(actorId, 'exercise.delete', 'lesson', e.lessonId, { exerciseId: id });
    return { ok: true };
  }

  async reorderExercises(actorId: string, lessonId: string, ids: string[]) {
    await this.editableLesson(lessonId);
    const current = await this.prisma.exercise.findMany({ where: { lessonId }, select: { id: true } });
    if (current.length !== ids.length || !current.every((c) => ids.includes(c.id))) {
      throw Errors.badRequest('REORDER_MISMATCH', 'Send every exercise of the lesson exactly once');
    }
    await this.prisma.$transaction(async (tx) => {
      // Two passes keep the (lessonId, order) unique constraint satisfied.
      for (const [i, id] of ids.entries())
        await tx.exercise.update({ where: { id }, data: { order: 10_000 + i } });
      for (const [i, id] of ids.entries()) await tx.exercise.update({ where: { id }, data: { order: i } });
    });
    await this.changed(actorId, 'exercise.reorder', 'lesson', lessonId);
    return { ok: true };
  }

  async checkPublishedLesson(lessonId: string) {
    const l = await this.editableLesson(lessonId);
    await this.checkPublished(lessonId, l.status);
  }

  // ───────────── Games, achievements, missions ─────────────

  listGames() {
    return this.prisma.game.findMany({ orderBy: { createdAt: 'asc' } });
  }

  private async checkGame(g: { id: string; type: string; config: unknown }) {
    if (!this.content.registry.has(g.type))
      this.fail([{ where: 'type', code: 'UNKNOWN_TYPE', message: `Unknown game type ${g.type}` }]);
    const index = await this.content.index();
    try {
      const plan = planGame(g, index, createRng('cms-check'));
      const items = this.content.registry.build(plan, index, 'cms-check');
      if (items.length === 0)
        this.fail([
          { where: 'config', code: 'EMPTY', message: 'The game has no items with the published content' },
        ]);
    } catch (err) {
      if (err instanceof Error && 'getStatus' in err) throw err;
      this.fail([
        { where: 'config', code: 'BUILD_FAILED', message: err instanceof Error ? err.message : String(err) },
      ]);
    }
  }

  async createGame(actorId: string, body: z.infer<typeof S.GameCreate>) {
    if (await this.prisma.game.findUnique({ where: { slug: body.slug } }))
      throw Errors.conflict('SLUG_TAKEN');
    if (body.status === 'PUBLISHED') await this.checkGame({ id: body.slug, ...body });
    const g = await this.prisma.game.create({
      data: {
        ...body,
        title: json(body.title),
        config: json(body.config),
        timeLimitSec: body.timeLimitSec ?? null,
      },
    });
    await this.changed(actorId, 'game.create', 'game', g.id, { status: body.status });
    return g;
  }

  async updateGame(actorId: string, id: string, body: z.infer<typeof S.GameUpdate>) {
    const g = await this.prisma.game.findUnique({ where: { id } });
    if (!g) throw Errors.notFound('Game');
    const next = { id, type: body.type ?? g.type, config: body.config ?? g.config };
    if ((body.status ?? g.status) === 'PUBLISHED') await this.checkGame(next);
    const updated = await this.prisma.game.update({
      where: { id },
      data: {
        ...body,
        title: body.title ? json(body.title) : undefined,
        config: body.config ? json(body.config) : undefined,
      },
    });
    await this.changed(actorId, 'game.update', 'game', id, { status: body.status });
    return updated;
  }

  listAchievements() {
    return this.prisma.achievement.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { unlocked: true } } },
    });
  }

  private checkRule(kind: 'achievement' | 'mission', rule: unknown) {
    const ok = kind === 'achievement' ? parseAchievementRule(rule) : parseMissionRule(rule);
    if (!ok) this.fail([{ where: 'rule', code: 'BAD_RULE', message: 'Unknown metric' }]);
  }

  async createAchievement(actorId: string, body: z.infer<typeof S.AchievementCreate>) {
    this.checkRule('achievement', body.rule);
    if (await this.prisma.achievement.findUnique({ where: { slug: body.slug } }))
      throw Errors.conflict('SLUG_TAKEN');
    const a = await this.prisma.achievement.create({
      data: { ...body, title: json(body.title), description: json(body.description), rule: json(body.rule) },
    });
    await this.changed(actorId, 'achievement.create', 'achievement', a.id, { status: body.status });
    return a;
  }

  async updateAchievement(actorId: string, id: string, body: z.infer<typeof S.AchievementUpdate>) {
    if (!(await this.prisma.achievement.findUnique({ where: { id } }))) throw Errors.notFound('Achievement');
    if (body.rule) this.checkRule('achievement', body.rule);
    const a = await this.prisma.achievement.update({
      where: { id },
      data: {
        ...body,
        title: body.title ? json(body.title) : undefined,
        description: body.description ? json(body.description) : undefined,
        rule: body.rule ? json(body.rule) : undefined,
      },
    });
    await this.changed(actorId, 'achievement.update', 'achievement', id, { status: body.status });
    return a;
  }

  listMissions() {
    return this.prisma.dailyMission.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async createMission(actorId: string, body: z.infer<typeof S.MissionCreate>) {
    this.checkRule('mission', body.rule);
    if (await this.prisma.dailyMission.findUnique({ where: { slug: body.slug } }))
      throw Errors.conflict('SLUG_TAKEN');
    const m = await this.prisma.dailyMission.create({
      data: { ...body, title: json(body.title), rule: json(body.rule) },
    });
    await this.changed(actorId, 'mission.create', 'mission', m.id);
    return m;
  }

  async updateMission(actorId: string, id: string, body: z.infer<typeof S.MissionUpdate>) {
    if (!(await this.prisma.dailyMission.findUnique({ where: { id } }))) throw Errors.notFound('Mission');
    if (body.rule) this.checkRule('mission', body.rule);
    const m = await this.prisma.dailyMission.update({
      where: { id },
      data: {
        ...body,
        title: body.title ? json(body.title) : undefined,
        rule: body.rule ? json(body.rule) : undefined,
      },
    });
    await this.changed(actorId, 'mission.update', 'mission', id);
    return m;
  }
}
