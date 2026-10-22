import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ChildGuard } from '../auth/child.guard';
import { ActingChild } from '../auth/decorators';
import { ZodBody, type Infer } from '../common/zod';
import { ContentService } from '../content/content.service';
import { LearningService } from './learning.service';

export const AnswerValueSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ack') }),
  z.object({ kind: z.literal('choice'), optionId: z.string().max(200) }),
  z.object({ kind: z.literal('order'), sequence: z.array(z.string().max(20)).max(30) }),
  z.object({
    kind: z.literal('match'),
    pairs: z.array(z.tuple([z.string().max(20), z.string().max(20)])).max(20),
    moves: z.number().int().min(0).max(1000),
  }),
]);

export const AnswerSchema = z.object({
  runToken: z.string().max(20_000),
  itemId: z.string().max(200),
  clientId: z.string().min(8).max(64),
  answer: AnswerValueSchema,
  responseMs: z.number().int().min(0).max(3_600_000).optional(),
});
const CompleteSchema = z.object({
  runToken: z.string().max(20_000),
  durationSec: z.number().int().min(0).max(36_000).optional(),
});
const TokenSchema = z.object({ runToken: z.string().max(20_000) });

@ApiTags('learning')
@UseGuards(ChildGuard)
@Controller()
export class LearningController {
  constructor(
    private readonly learning: LearningService,
    private readonly content: ContentService,
  ) {}

  @Get('worlds')
  worlds(@ActingChild() childId: string) {
    return this.learning.worlds(childId);
  }

  @Get('worlds/:slug')
  world(@ActingChild() childId: string, @Param('slug') slug: string) {
    return this.learning.world(childId, slug);
  }

  /** Starts a run. `?offline=1` also returns answer keys so the lesson can be played without a connection. */
  @HttpCode(200)
  @Post('lessons/:id/start')
  start(
    @ActingChild() childId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('offline') offline?: string,
  ) {
    return this.learning.startLesson(childId, id, { offline: offline === '1' });
  }

  @HttpCode(200)
  @Post('runs/answer')
  answer(@ActingChild() childId: string, @ZodBody(AnswerSchema) body: Infer<typeof AnswerSchema>) {
    return this.learning.answer(childId, body.runToken, body);
  }

  @HttpCode(200)
  @Post('runs/complete')
  complete(@ActingChild() childId: string, @ZodBody(CompleteSchema) body: Infer<typeof CompleteSchema>) {
    return this.learning.complete(childId, body.runToken, { durationSec: body.durationSec });
  }

  @Get('review/queue')
  reviewQueue(@ActingChild() childId: string) {
    return this.learning.reviewQueue(childId);
  }

  @HttpCode(200)
  @Post('review/start')
  startReview(@ActingChild() childId: string) {
    return this.learning.startReview(childId);
  }

  @Get('placement')
  placement(@ActingChild() childId: string) {
    return this.learning.placement(childId);
  }

  @HttpCode(200)
  @Post('placement/submit')
  submitPlacement(@ActingChild() childId: string, @ZodBody(TokenSchema) body: Infer<typeof TokenSchema>) {
    return this.learning.submitPlacement(childId, body.runToken);
  }

  @HttpCode(200)
  @Post('placement/skip')
  skipPlacement(@ActingChild() childId: string) {
    return this.learning.skipPlacement(childId);
  }

  /** Alphabet and sounds reference (Learn → Alphabet / Sounds screens). */
  @Get('letters')
  async letters() {
    const index = await this.content.index();
    return [...index.letters.values()].map((l) => ({
      ...l,
      example: l.exampleWord ? (index.words.get(l.exampleWord) ?? null) : null,
    }));
  }

  @Get('phonemes')
  async phonemes() {
    const index = await this.content.index();
    return [...index.phonemes.values()].map((p) => ({
      ...p,
      examples: [...index.words.values()]
        .filter((w) => w.sounds.some((s) => s.phoneme === p.slug) && w.emoji)
        .slice(0, 4),
    }));
  }
}
