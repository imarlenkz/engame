import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { gameOutcome, planGame } from '@engame/game-engine';
import { createRng } from '@engame/phonics-engine';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AnalyticsService } from '../analytics/analytics.service';
import { ChildGuard } from '../auth/child.guard';
import { ActingChild } from '../auth/decorators';
import { ENV, type Env } from '../config/env';
import { Errors } from '../common/errors';
import { ZodBody, type Infer } from '../common/zod';
import { ContentService } from '../content/content.service';
import { GamificationService } from '../gamification/gamification.service';
import { PrismaService } from '../infra/infra.module';
import { AnswerValueSchema } from '../learning/learning.controller';
import { LearningModule } from '../learning/learning.module';
import { MasteryService } from '../learning/mastery.service';
import { RunService } from '../learning/run.service';
import { signRun } from '../learning/run-token';

const GameAnswerSchema = z.object({
  runToken: z.string().max(20_000),
  itemId: z.string().max(200),
  clientId: z.string().min(8).max(64),
  answer: AnswerValueSchema,
  responseMs: z.number().int().min(0).max(3_600_000).optional(),
});
const FinishSchema = z.object({ runToken: z.string().max(20_000) });

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
    private readonly runs: RunService,
    private readonly mastery: MasteryService,
    private readonly gamification: GamificationService,
    private readonly analytics: AnalyticsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async list(childId: string) {
    const [games, child, played] = await Promise.all([
      this.prisma.game.findMany({ where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'asc' } }),
      this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } }),
      this.prisma.gameSession.groupBy({
        by: ['gameId'],
        where: { childId, endedAt: { not: null } },
        _max: { score: true },
        _count: true,
      }),
    ]);
    const stats = new Map(played.map((p) => [p.gameId, p]));
    return {
      hearts: child.hearts,
      games: games.map((g) => ({
        id: g.id,
        slug: g.slug,
        type: g.type,
        title: g.title,
        timed: g.timed,
        timeLimitSec: g.timeLimitSec,
        bestScore: stats.get(g.id)?._max.score ?? null,
        plays: stats.get(g.id)?._count ?? 0,
        // Timed challenges cost hearts; lessons and practice games never do.
        available: !g.timed || child.hearts > 0,
      })),
    };
  }

  async start(childId: string, gameId: string) {
    const game = await this.prisma.game.findFirst({ where: { id: gameId, status: 'PUBLISHED' } });
    if (!game) throw Errors.notFound('Game');
    const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
    if (game.timed && child.hearts <= 0)
      throw Errors.badRequest('NO_HEARTS', 'Finish a lesson perfectly to earn a heart');

    const content = await this.content.index();
    const focus = (await this.mastery.reviewTargets(null, childId, 10)).map((t) => t.key);
    const rid = randomUUID();
    const seed = randomUUID();
    const plan = planGame(
      { id: game.id, type: game.type, config: game.config },
      content,
      createRng(seed),
      focus,
    );
    const payload = { rid, cid: childId, kind: 'game' as const, ref: game.id, seed, ex: [], gen: [plan] };
    const token = signRun(this.env.APP_SECRET, payload);
    await this.prisma.gameSession.create({
      data: { id: rid, childId, gameId: game.id, gameType: game.type },
    });
    const steps = await this.runs.steps({ ...payload, v: 1, iat: Date.now() }, content);
    await this.analytics.track('game_started', { childId }, { game: game.slug });
    return {
      run: { id: rid, token, kind: 'game' },
      game: {
        id: game.id,
        slug: game.slug,
        type: game.type,
        title: game.title,
        timed: game.timed,
        timeLimitSec: game.timeLimitSec,
      },
      hearts: child.hearts,
      ...this.runs.toClient(steps, false),
    };
  }

  async answer(childId: string, body: Infer<typeof GameAnswerSchema>) {
    const run = this.runs.verify(body.runToken, childId);
    if (run.kind !== 'game') throw Errors.badRequest('RUN_KIND', 'Not a game');
    const session = await this.prisma.gameSession.findUnique({
      where: { id: run.rid },
      include: { game: true },
    });
    if (!session || session.endedAt) throw Errors.badRequest('GAME_FINISHED', 'This game is over');
    const result = await this.runs.answer(childId, run, body);
    if (!result.duplicate && result.firstAttempt && result.correct !== null) {
      await this.prisma.gameSession.update({
        where: { id: run.rid },
        data: result.correct ? { correct: { increment: 1 } } : { wrong: { increment: 1 } },
      });
      if (!result.correct && session.game?.timed) {
        await this.prisma.$transaction((tx) =>
          this.gamification.award(tx, childId, [{ currency: 'HEARTS', amount: -1 }], 'timed_game_miss', {
            type: 'game_session',
            id: run.rid,
          }),
        );
      }
    }
    const child = await this.prisma.childProfile.findUniqueOrThrow({
      where: { id: childId },
      select: { hearts: true },
    });
    return { ...result, hearts: child.hearts };
  }

  async finish(childId: string, token: string) {
    const run = this.runs.verify(token, childId);
    if (run.kind !== 'game') throw Errors.badRequest('RUN_KIND', 'Not a game');
    // Claim the session exactly once.
    const claimed = await this.prisma.gameSession.updateMany({
      where: { id: run.rid, childId, endedAt: null },
      data: { endedAt: new Date() },
    });
    const res = await this.runs.results(childId, run);
    const { rewards } = await this.gamification.settings();
    const outcome = gameOutcome(res.correct, res.graded - res.correct, rewards);
    if (claimed.count === 1) {
      await this.prisma.$transaction(async (tx) => {
        await tx.gameSession.update({
          where: { id: run.rid },
          data: {
            score: outcome.score,
            correct: res.correct,
            wrong: res.graded - res.correct,
            xpEarned: outcome.xp,
            coinsEarned: outcome.coins,
          },
        });
        await this.gamification.award(
          tx,
          childId,
          [
            { currency: 'XP', amount: outcome.xp },
            { currency: 'COINS', amount: outcome.coins },
          ],
          'game_complete',
          { type: 'game_session', id: run.rid },
        );
        await this.gamification.touchStreak(tx, childId);
      });
      await this.analytics.track(
        'game_completed',
        { childId },
        { type: run.gen[0]?.type, score: outcome.score, accuracy: outcome.accuracy },
      );
    }
    const achievements = claimed.count === 1 ? await this.gamification.checkAchievements(childId) : [];
    const missions = await this.gamification.missions(childId);
    const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
    return {
      alreadyFinished: claimed.count === 0,
      outcome: { ...outcome, correct: res.correct, total: res.graded },
      achievements,
      missions: missions.filter((m) => m.justCompleted),
      child: { xp: child.xp, coins: child.coins, level: child.level, hearts: child.hearts },
    };
  }
}

@ApiTags('games')
@UseGuards(ChildGuard)
@Controller()
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get('games')
  list(@ActingChild() childId: string) {
    return this.games.list(childId);
  }

  @HttpCode(200)
  @Post('games/:id/sessions')
  start(@ActingChild() childId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.games.start(childId, id);
  }

  @HttpCode(200)
  @Post('game-sessions/answer')
  answer(@ActingChild() childId: string, @ZodBody(GameAnswerSchema) body: Infer<typeof GameAnswerSchema>) {
    return this.games.answer(childId, body);
  }

  @HttpCode(200)
  @Post('game-sessions/finish')
  finish(@ActingChild() childId: string, @ZodBody(FinishSchema) body: Infer<typeof FinishSchema>) {
    return this.games.finish(childId, body.runToken);
  }
}

@Module({ imports: [LearningModule], controllers: [GamesController], providers: [GamesService] })
export class GamesModule {}
